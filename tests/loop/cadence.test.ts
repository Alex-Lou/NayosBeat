import { describe, expect, it } from 'vitest';
import {
  clockGrainMs,
  DeltaSnap,
  FRAME_RATES_HZ,
  FrameCadence,
  FrameClock,
  phaseOffsetMs,
  snapRate,
} from '../../src/loop/cadence';
import { FixedTimestep } from '../../src/loop/fixed-timestep';
import { measure, safariHz, screen, STEP_MS, type Screen } from './cadence-sim';

const HZ_60 = 1000 / 60;

/** A seeded noise in [0, 1): the same deltas on every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 2 ** 32;
  };
}

describe('the cadences (docs/qualite-adaptative.md §2.2)', () => {
  it('snaps a measured period on the known cadence it is within 1.5 % of, 55 Hz included', () => {
    expect(snapRate(1000 / 59.94)).toBe(HZ_60);
    expect(snapRate(1000 / 55)).toBe(1000 / 55);
    expect(snapRate(1000 / 72)).toBe(1000 / 72);
    expect(snapRate(1000 / 35)).toBeNull();
    // A span of 16 frames holding a late one lasts 17/16 of 60 Hz's (56.5 Hz): not 55 Hz.
    expect(snapRate(HZ_60 * (17 / 16))).toBeNull();
  });

  it("knows Safari's cadences: N/k above 60 Hz, k the integer nearest N/60 (WebKit)", () => {
    expect([144, 165, 100, 90, 120].map(safariHz)).toEqual([72, 55, 50, 90, 60]);
    for (const screenHz of [60, 75, 90, 100, 120, 144, 165, 240]) {
      expect(FRAME_RATES_HZ).toContain(safariHz(screenHz));
    }
  });

  it('keeps the clock half a phase step away from the step boundaries', () => {
    const lattice = { 60: 1, 30: 1, 120: 2, 90: 3, 72: 6, 144: 12, 55: 11 };
    for (const [hz, points] of Object.entries(lattice)) {
      expect(phaseOffsetMs(1000 / Number(hz))).toBeCloseTo(STEP_MS / (2 * points), 12);
    }
  });

  it("reads the clock's grain: its smallest step, Safari's when it never moves", () => {
    const rounded = (grainMs: number) => {
      let now = 1234.5678;
      return () => {
        now += 0.0004;
        return Math.floor(now / grainMs) * grainMs;
      };
    };
    expect(clockGrainMs(rounded(1))).toBeCloseTo(1, 9);
    expect(clockGrainMs(rounded(0.1))).toBeCloseTo(0.1, 9);
    expect(clockGrainMs(() => 5)).toBe(1);
  });
});

describe('DeltaSnap', () => {
  it('gives whole periods and carries the rest: no time lost nor made up', () => {
    const snap = new DeltaSnap(1.2);
    snap.retune(HZ_60);
    const noise = seeded(7);
    let given = 0;
    let taken = 0;
    for (let frame = 0; frame < 10_000; frame++) {
      const deltaMs = HZ_60 * (noise() < 0.1 ? 2 : 1) + (noise() - 0.5) * 2;
      given += deltaMs;
      taken += snap.snap(deltaMs);
      expect(Math.abs(given - taken)).toBeLessThanOrEqual(1.2 + 1e-9);
    }
    expect(snap.snap(HZ_60 + 0.4)).toBe(HZ_60);
    expect(snap.snap(HZ_60 - 0.4)).toBe(HZ_60);
  });

  it('lets a delta off the cadence pass, with what was carried, and carries nothing on', () => {
    const snap = new DeltaSnap(1.2);
    snap.retune(HZ_60);
    expect(snap.snap(HZ_60 + 1)).toBe(HZ_60);
    expect(snap.snap(20)).toBe(21);
    expect(snap.snap(HZ_60)).toBe(HZ_60);
  });

  it('keeps what a frame of no time owes for the next one', () => {
    const snap = new DeltaSnap(1.2);
    snap.retune(HZ_60);
    expect(snap.snap(HZ_60 - 0.5)).toBe(HZ_60);
    expect(snap.snap(0)).toBe(0);
    expect(snap.snap(HZ_60 + 0.5)).toBe(HZ_60);
    expect(snap.snap(HZ_60)).toBe(HZ_60);
  });
});

describe('FrameCadence', () => {
  /** Feeds frames one after the other: the frames the cadence changed after, in each call. */
  function frames(cadence: FrameCadence) {
    let timeMs = 1000;
    return (periodMs: (frame: number) => number, count: number): number[] => {
      const changes: number[] = [];
      for (let frame = 0; frame < count; frame++) {
        timeMs += periodMs(frame);
        if (cadence.sample(timeMs)) changes.push(frame);
      }
      return changes;
    };
  }

  it('starts at 60 Hz, and reads another cadence on its second estimate (96 frames)', () => {
    const cadence = new FrameCadence();
    expect(cadence.periodMs).toBe(HZ_60);
    expect(frames(cadence)(() => 1000 / 30, 300)).toEqual([95]);
    expect(cadence.periodMs).toBe(1000 / 30);
  });

  it('keeps 60 Hz when a frame in 20 comes late, most spans of 16 then lasting 17/16', () => {
    const feed = frames(new FrameCadence());
    expect(feed((frame) => (frame % 20 === 19 ? 2 : 1) * HZ_60, 2000)).toEqual([]);
  });

  it('keeps its cadence through an unknown one, and from one fight to the next', () => {
    const cadence = new FrameCadence();
    const feed = frames(cadence);
    expect(feed(() => 1000 / 35, 300)).toEqual([]);
    // Faster mid-fight: two estimates once a span holds only the new cadence.
    expect(feed(() => 1000 / 120, 300)).toEqual([35]);
    cadence.restart();
    expect(cadence.periodMs).toBe(1000 / 120);
    // Measured anew: 80 frames, then two estimates.
    expect(feed(() => HZ_60, 300)).toEqual([95]);
  });
});

describe('FrameClock', () => {
  it('moves one step a 60 Hz frame however its timestamp jitters, where the raw delta gives 0 then 2', () => {
    const deltas = [HZ_60 - 0.3, HZ_60 + 0.3, HZ_60 - 0.3, HZ_60 + 0.3];
    const raw = new FixedTimestep(STEP_MS, 5);
    expect(deltas.map((deltaMs) => raw.advance(deltaMs))).toEqual([0, 2, 0, 2]);
    const clock = new FrameClock(0.1, 5);
    let timeMs = 0;
    expect(deltas.map((deltaMs) => clock.advance((timeMs += deltaMs), deltaMs))).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it('starts the next fight on the cadence of the one before', () => {
    const clock = new FrameClock(1, 5);
    for (let frame = 1; frame <= 200; frame++) clock.advance(frame * (1000 / 30), 1000 / 30);
    expect(clock.hz).toBe(30);
    clock.restart();
    expect(clock.hz).toBe(30);
  });
});

/**
 * The bench's screens ([cadence-main]) and Safari on a Mac: 100 fights of 60 s each, 2 KOs and
 * their slow motion, the first frame 250 ms long, the 1.5 s intro not counted.
 */
const SCREENS: readonly (Screen & { readonly limit?: number; readonly misreads?: true })[] = [
  screen('60 Hz, grain 0,1 ms', 60, 0.1, 0),
  screen('Safari 60 Hz, grain 1 ms', 60, 1, 0),
  screen('60 Hz, gigue 1,5 ms', 60, 0.1, 1.5),
  screen('60 Hz, gigue 3 ms', 60, 0.1, 3),
  screen('Safari 59,94 Hz (un écran qui dérive), grain 1 ms', 59.94, 1, 0),
  screen('iOS 30 Hz (Économie d’énergie), grain 1 ms', 30, 1, 0),
  // Half a phase step is only 2.78 ms at 90 Hz: 1.5 ms of jitter on each side reaches it.
  { ...screen('90 Hz, gigue 1,5 ms', 90, 0.1, 1.5), limit: 0.6 },
  screen('120 Hz, gigue 1,5 ms', 120, 0.1, 1.5),
  screen('144 Hz, gigue 0,5 ms', 144, 0.1, 0.5),
  screen('60 Hz, gigue 1,5 ms, 3 % d’images en retard', 60, 0.1, 1.5, 0.03),
  // Its spans read 40 to 50 Hz: off them, the deltas pass raw, away from the step boundaries.
  { ...screen('60 Hz surchargé : 50 % d’images sur 2 vsyncs', 60, 0.1, 0.5, 0.5), misreads: true },
  {
    name: 'Écran à fréquence variable : 120 Hz en combat, 60 Hz attendus, gigue 0,5 ms',
    segments: [{ hz: 120, fromS: 0 }],
    grainMs: 0.1,
    jitterMs: 0.5,
    late: 0,
  },
  {
    name: '120 Hz puis 60 Hz à 25 s (économiseur)',
    segments: [
      { hz: 120, fromS: 0 },
      { hz: 60, fromS: 25 },
    ],
    grainMs: 0.1,
    jitterMs: 0.5,
    late: 0,
  },
  {
    name: 'Safari 60 Hz puis 30 Hz à 25 s (Économie d’énergie activée)',
    segments: [
      { hz: 60, fromS: 0 },
      { hz: 30, fromS: 25 },
    ],
    grainMs: 1,
    jitterMs: 0,
    late: 0,
  },
  screen('Safari Mac 144 Hz → 72 Hz, grain 1 ms, gigue 0,5 ms', safariHz(144), 1, 0.5),
  screen('Safari Mac 165 Hz → 55 Hz, grain 1 ms, gigue 0,5 ms', safariHz(165), 1, 0.5),
  {
    ...screen('60 Hz, gigue 1,5 ms, une pause de 3 s', 60, 0.1, 1.5),
    pause: { fromS: 30, toS: 33 },
  },
  // Loaded: most spans hold a late frame, and read a slower cadence than the screen's.
  screen('60 Hz chargé : 20 % d’images en retard, gigue 1,5 ms', 60, 0.1, 1.5, 0.2),
  {
    ...screen(
      'Safari Mac 144 Hz → 72 Hz chargé : 30 % d’images en retard',
      safariHz(144),
      1,
      0.5,
      0.3,
    ),
    limit: 1,
  },
];

describe('the fight on simulated screens (docs/qualite-adaptative.md §5, A)', () => {
  for (const { limit = 0.1, misreads, ...display } of SCREENS) {
    it(`${display.name}: at most ${limit} % of frames off cadence`, () => {
      const before = measure(display, 'main');
      const after = measure(display, 'A');
      // The measure sees main's stutter: two clocks fed the raw delta.
      expect(before.ticks).toBeGreaterThan(1);
      expect(after.ticks).toBeLessThanOrEqual(limit);
      expect(after.visual).toBeLessThanOrEqual(limit);
      // The KO's slow motion: 7 ticks for 20 frames, to the tick after every frame.
      expect(after.slowMotionOff).toBe(0);
      // No time lost nor made up: the steps keep up with real time, within a step or so (less
      // than one more for each change of cadence, which puts the phase back).
      expect(after.maxDriftSteps).toBeLessThan(2.5);
      // It reads the screen's cadence, the last one when it changes.
      const last = display.segments[display.segments.length - 1]?.hz ?? 60;
      if (!misreads) expect(after.cadences).toContain(Math.round(last));
    });
  }
});
