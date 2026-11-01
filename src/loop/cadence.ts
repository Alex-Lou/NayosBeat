import { TICK_RATE } from '../core/constants';
import { FixedTimestep } from './fixed-timestep';

/**
 * The frame delta snapped on the screen's cadence (docs/qualite-adaptative.md §2.2, PR A).
 * requestAnimationFrame's timestamps are rounded (0.1 ms in Chrome, 1 ms in Safari) and jitter:
 * fed raw to a fixed timestep, one frame gets 0 steps and the next 2, a stutter since nothing is
 * drawn between two ticks (D23). Here the cadence is measured in the fight, each delta snapped on
 * a whole number of its periods (the remainder carried: no time lost nor made up), and the clock
 * kept half a phase step away from every step boundary. Pure, and allocation-free per frame.
 */

const STEP_MS = 1000 / TICK_RATE;

/**
 * The cadences browsers give requestAnimationFrame, in Hz: screens and their halves, and Safari's
 * above 60 Hz, N/k with k the integer nearest N/60, a half rounded down (WebKit's
 * AnimationFrameRate.cpp): 144 → 72, 165 → 55, 100 → 50.
 */
export const FRAME_RATES_HZ: readonly number[] = [
  24, 30, 40, 45, 48, 50, 55, 60, 72, 75, 90, 100, 120, 144, 165, 240,
];

/** Before the fight has measured its own: the most common screen. */
const DEFAULT_PERIOD_MS = 1000 / 60;
/**
 * How far a measured period may be from a known cadence's, relatively, to be snapped on it. A span
 * holding one late frame lasts 17/16 of the cadence's: at 3 %, 60 Hz then read 55 (2.6 % away),
 * 75 read 72 and 50 read 48; at 1 %, 240 Hz rounded to 1 ms would no longer be read.
 */
const RATE_TOLERANCE = 0.015;
/** Timestamps kept, spans of intervals averaged, and spans compared (every SPAN frames). */
const RING = 80;
const SPAN = 16;
const SPANS = RING - SPAN;
/**
 * The timestamps' jitter on top of their rounding. A delta snaps when within twice that and the
 * grain: it is the difference of two timestamps (this one and the one its period count started
 * from), each off by both.
 */
const JITTER_MS = 0.5;
/** Clock readings to find its grain at most, and the grain assumed if it never moved (Safari's). */
const GRAIN_READS = 10_000;
const COARSE_GRAIN_MS = 1;

/** The period of the known cadence `periodMs` is within RATE_TOLERANCE of, or null. */
export function snapRate(periodMs: number): number | null {
  let best: number | null = null;
  let bestError = RATE_TOLERANCE;
  for (const hz of FRAME_RATES_HZ) {
    const error = Math.abs(periodMs * hz - 1000) / 1000;
    if (error < bestError) {
      best = 1000 / hz;
      bestError = error;
    }
  }
  return best;
}

/**
 * Where to keep the leftover time at a cadence: frames of a whole number of periods leave it on a
 * lattice of STEP/q (q = hz / gcd(60, hz)); half way between two of its points, it is as far as it
 * can be from a step boundary. 8.33 ms at 60 and 30 Hz, 4.17 at 120, 2.78 at 90, 0.69 at 144.
 */
export function phaseOffsetMs(periodMs: number): number {
  const hz = Math.round(1000 / periodMs);
  let a = TICK_RATE;
  let b = hz;
  while (b !== 0) [a, b] = [b, a % b];
  return STEP_MS / (2 * (hz / a));
}

/** The smallest step between two readings of `now`: 0.1 ms in Chrome, 1 ms in Safari (R3). */
export function clockGrainMs(now: () => number): number {
  let grain = Infinity;
  let last = now();
  for (let i = 0; i < GRAIN_READS; i++) {
    const time = now();
    if (time > last) grain = Math.min(grain, time - last);
    last = time;
  }
  return Number.isFinite(grain) ? grain : COARSE_GRAIN_MS;
}

/**
 * The cadence the browser really gives, measured frame after frame: every SPAN frames, the mean
 * interval of each of the last SPANS spans of SPAN frames (the mean flattens rounding and
 * jitter), snapped on a known cadence. Late frames only lengthen spans: a faster cadence is read
 * off their first quartile or the shortest span, a slower one only when both agree (a loaded
 * screen, most spans holding a late frame, would otherwise read 50 Hz at 60). It changes on two
 * estimates in a row; an unknown cadence keeps the one before.
 */
export class FrameCadence {
  private readonly stamps = new Float64Array(RING);
  private readonly spans = new Float64Array(SPANS);
  private count = 0;
  private sinceEstimate = 0;
  private pendingMs = 0;
  private period = DEFAULT_PERIOD_MS;

  /** The cadence's period, in ms. */
  get periodMs(): number {
    return this.period;
  }

  /** Notes a frame's timestamp; true when the cadence just changed. */
  sample(timeMs: number): boolean {
    this.stamps[this.count % RING] = timeMs;
    this.count++;
    if (++this.sinceEstimate < SPAN || this.count < RING) return false;
    this.sinceEstimate = 0;
    for (let i = 0; i < SPANS; i++) {
      const end = this.stamps[(this.count - 1 - i) % RING] ?? 0;
      const start = this.stamps[(this.count - 1 - i - SPAN) % RING] ?? 0;
      this.spans[i] = (end - start) / SPAN;
    }
    this.spans.sort();
    const quartile = snapRate(this.spans[SPANS / 4] ?? 0);
    const shortest = snapRate(this.spans[0] ?? 0);
    let snapped: number | null = null;
    if (quartile !== null && (quartile < this.period || quartile === shortest)) snapped = quartile;
    else if (shortest !== null && shortest < this.period) snapped = shortest;
    if (snapped === null || snapped === this.period) {
      this.pendingMs = 0;
      return false;
    }
    if (snapped !== this.pendingMs) {
      this.pendingMs = snapped;
      return false;
    }
    this.pendingMs = 0;
    this.period = snapped;
    return true;
  }

  /** Measures anew from the next frame on, from the cadence it had. */
  restart(): void {
    this.count = 0;
    this.sinceEstimate = 0;
    this.pendingMs = 0;
  }
}

/**
 * Snaps each frame's delta, plus what the frames before left over, on a whole number of periods
 * when it is that close; otherwise that passes as it is, and nothing is left over (an unknown
 * cadence: as if nothing were snapped). The deltas' sum stays exact, give or take what is left
 * over, which a frame of no time keeps too.
 */
export class DeltaSnap {
  private carryMs = 0;
  private periodMs = DEFAULT_PERIOD_MS;

  constructor(private readonly toleranceMs: number) {}

  snap(deltaMs: number): number {
    const owedMs = deltaMs + this.carryMs;
    if (owedMs <= 0) {
      this.carryMs = owedMs;
      return 0;
    }
    const snappedMs = Math.round(owedMs / this.periodMs) * this.periodMs;
    if (snappedMs > 0 && Math.abs(owedMs - snappedMs) <= this.toleranceMs) {
      this.carryMs = owedMs - snappedMs;
      return snappedMs;
    }
    this.carryMs = 0;
    return owedMs;
  }

  /** Snaps on `periodMs` from now on, nothing left over. */
  retune(periodMs: number): void {
    this.periodMs = periodMs;
    this.carryMs = 0;
  }
}

/**
 * The fight's visual clock (steps of 1/60 s) fed with snapped deltas, its phase put back at each
 * fight's start and on every change of cadence. The fight counts its ticks on these steps.
 */
export class FrameClock {
  private readonly cadence = new FrameCadence();
  private readonly snapper: DeltaSnap;
  private readonly steps: FixedTimestep;

  /** `grainMs`: the clock's (`clockGrainMs`); `maxSteps`: a frame's at most (the backlog dropped). */
  constructor(grainMs: number, maxSteps: number) {
    this.snapper = new DeltaSnap(2 * (grainMs + JITTER_MS));
    this.steps = new FixedTimestep(STEP_MS, maxSteps);
    this.restart();
  }

  /** The cadence the deltas are snapped on, in Hz. */
  get hz(): number {
    return Math.round(1000 / this.cadence.periodMs);
  }

  /** A fight starts: its cadence measured anew, from the last fight's, and the phase put back. */
  restart(): void {
    this.cadence.restart();
    this.retune();
  }

  /** The steps a display frame moves on: `timeMs` its timestamp, `deltaMs` since the last one. */
  advance(timeMs: number, deltaMs: number): number {
    if (this.cadence.sample(timeMs)) this.retune();
    return this.steps.advance(this.snapper.snap(deltaMs));
  }

  private retune(): void {
    this.snapper.retune(this.cadence.periodMs);
    this.steps.rephase(phaseOffsetMs(this.cadence.periodMs));
  }
}

/**
 * Counts the display frames that break the cadence: a step moved to another frame than real time
 * puts it on. Frame after frame, the steps played minus the real time gone by (in steps) stays in
 * a band narrower than one step while the cadence is regular, whatever its phase; the frame that
 * widens it to a whole step breaks it, and the band starts over from there. The bench's measure.
 */
export class CadenceBreaks {
  private driftSteps = 0;
  private low = 0;
  private high = 0;
  private started = false;

  /** A frame that played `steps` in `realMs`; true if it broke the cadence (the first never). */
  frame(steps: number, realMs: number): boolean {
    this.driftSteps += steps - realMs / STEP_MS;
    const drift = this.driftSteps;
    if (!this.started) {
      this.started = true;
      this.low = drift;
      this.high = drift;
      return false;
    }
    this.low = Math.min(this.low, drift);
    this.high = Math.max(this.high, drift);
    // A whole step, give or take the float rounding of the sums.
    if (this.high - this.low < 1 - 1e-6) return false;
    this.low = drift;
    this.high = drift;
    return true;
  }
}
