import { describe, expect, it } from 'vitest';
import { RIFF_CLIPS } from '../../src/art/riff/clips';
import { RIFF_SHEETS, type RiffSheet } from '../../src/art/riff/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE, type Clip, type ClipId } from '../../src/art/types';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';
import { strikeOf, strikesOf } from '../../tools/sprites/clips';
import { PixelCanvas } from '../../tools/sprites/raster';
import { RIFF } from '../../tools/sprites/riff/index';
import { DETAIL, EFFECTS, paletteOf } from '../../tools/sprites/riff/palette';
import { GUARD } from '../../tools/sprites/riff/poses/common';
import { isAnimated, RIFF_POSES } from '../../tools/sprites/riff/poses/index';
import { drawStrip, drawStripEffects } from '../../tools/sprites/sheet';
import { solve, type Effect, type Pose } from '../../tools/sprites/skeleton';
import { drawEffect, inkAt } from '../../tools/sprites/vfx';
import { AWAITING_ART, reachCheck } from './fighters';

const SHEETS = Object.keys(RIFF_SHEETS) as RiffSheet[];

/** The clip named after a strip: the one that times it. */
function ownClip(sheet: RiffSheet): Clip {
  const clip = RIFF_CLIPS[sheet as ClipId];
  if (!clip) throw new Error(`No clip ${sheet}`);
  return clip;
}

interface Band {
  readonly from: number;
  readonly to: number;
}

/** Which way a strike is measured: toward the opponent, upward, or behind her. */
type Way = 'forward' | 'up' | 'back';

/** docs/combat-v2.md §11.3: 43 strips, about 265 frames. */
describe('Riff strips: the set of §11.3', () => {
  it('has the 43 strips', () => {
    expect(SHEETS).toHaveLength(43);
  });

  it.each(SHEETS)('%s: poses and ticks for every frame', (sheet) => {
    const { frames } = RIFF_SHEETS[sheet];
    expect(RIFF_POSES[sheet]).toHaveLength(frames);
    expect(RIFF.timing(sheet).ticks).toHaveLength(frames);
  });

  /**
   * S + A + R of §10.2 (and the grab of §10.3): the clip named after an attack's strip lasts
   * exactly its move (src/art/riff/clips.ts, which the generator times her strips with).
   */
  const TOTALS: Readonly<Partial<Record<RiffSheet, number>>> = {
    standLight: 11,
    chainLight: 18,
    lightFinisher: 28,
    forwardLight: 20,
    standHeavy: 23,
    forwardHeavy: 34,
    backHeavy: 26,
    crouchLight: 12,
    crouchHeavy: 28,
    special: 34,
    specialForward: 34,
    specialAntiAir: 34,
    grab: 27,
    idle: 48,
    intro: 90,
  };

  it.each(Object.entries(TOTALS))('%s: its ticks add up to %i', (sheet, total) => {
    const { ticks } = ownClip(sheet as RiffSheet);
    expect(ticks.reduce((sum, tick) => sum + tick, 0)).toBe(total);
  });

  /**
   * The frames drawn as each strike's active pose (§11.3) are on screen exactly while it can
   * hit: from its startup (§10.2) to the end of its active ticks, and nothing else is.
   */
  const ACTIVE: Readonly<Partial<Record<RiffSheet, readonly number[]>>> = {
    standLight: [2],
    chainLight: [2],
    lightFinisher: [3],
    forwardLight: [3],
    standHeavy: [3],
    forwardHeavy: [4],
    backHeavy: [3],
    crouchLight: [2],
    crouchHeavy: [3],
    jumpLight: [2],
    jumpHeavy: [2],
    special: [3, 4],
    specialForward: [5],
    specialAntiAir: [2, 3],
    grab: [2],
  };

  it.each(Object.entries(ACTIVE))('%s: its active pose shows while it can hit', (sheet, drawn) => {
    const strike = strikeOf(RIFF_CLIPS, RIFF_TEMPLATE, sheet);
    if (!strike) throw new Error(`${sheet} has no strike`);
    expect(strike.frames).toEqual(drawn);
    const { ticks } = ownClip(sheet as RiffSheet);
    const first = drawn[0] ?? 0;
    const shown = drawn.reduce((sum, frame) => sum + (ticks[frame] ?? 0), 0);
    expect(ticks.slice(0, first).reduce((sum, tick) => sum + tick, 0)).toBe(strike.move.startup);
    expect(shown).toBe(strike.move.active);
  });

  /** Startup of every strike (§10.2): its active frames start on that tick. */
  const STARTUP: Readonly<Partial<Record<RiffSheet, number>>> = {
    standLight: 3,
    chainLight: 5,
    lightFinisher: 7,
    forwardLight: 8,
    standHeavy: 6,
    forwardHeavy: 17,
    backHeavy: 6,
    crouchLight: 3,
    crouchHeavy: 7,
    jumpLight: 3,
    jumpHeavy: 6,
    special: 10,
    specialForward: 16,
    specialAntiAir: 4,
    grab: 5,
  };

  it.each(Object.entries(STARTUP))('%s: the active frame comes on at tick %i', (sheet, startup) => {
    const first = ACTIVE[sheet as RiffSheet]?.[0] ?? -1;
    const ticks = ownClip(sheet as RiffSheet).ticks.slice(0, first);
    expect(ticks.reduce((sum, tick) => sum + tick, 0)).toBe(startup);
  });
});

describe('Riff strips: drawing', () => {
  const drawn = new Map<RiffSheet, PixelCanvas>();
  const sheetCanvas = (sheet: RiffSheet): PixelCanvas => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawStrip(RIFF, sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  /** Calls `visit` with every opaque pixel of one cell, in world pixels from the feet anchor. */
  function eachPixel(sheet: RiffSheet, frame: number, visit: (x: number, y: number) => void) {
    const canvas = sheetCanvas(sheet);
    for (let row = 0; row < CELL_SIZE; row++) {
      for (let column = 0; column < CELL_SIZE; column++) {
        if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
        visit((column + 1 - ANCHOR.x) / ART_SCALE, (ANCHOR.y - row) / ART_SCALE);
      }
    }
  }

  /** Opaque extent of one cell, in cell pixels. */
  function extent(sheet: RiffSheet, frame: number) {
    const canvas = sheetCanvas(sheet);
    let top = CELL_SIZE;
    let bottom = -1;
    let left = CELL_SIZE;
    let right = -1;
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = 0; x < CELL_SIZE; x++) {
        if (canvas.pixels[y * canvas.width + frame * CELL_SIZE + x] === 0) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    return { top, bottom, left, right };
  }

  it.each(SHEETS)('%s: every frame stays inside its cell, away from the edges', (sheet) => {
    for (let frame = 0; frame < RIFF_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      // A 2 world px margin: 4 sprite pixels.
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        4,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(ANCHOR.y + 2);
    }
  });

  it.each(['idle', 'walkForward', 'walkBack', 'crouch', 'block'] as const)(
    '%s: feet stand on the ground line in every frame',
    (sheet) => {
      for (let frame = 0; frame < RIFF_SHEETS[sheet].frames; frame++) {
        expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(ANCHOR.y - 2);
      }
    },
  );

  it('the guard is about 74 px tall (her standing hurtbox is 76), smaller than Nayo', () => {
    const { top, bottom } = extent('idle', 0);
    const height = (bottom - top + 1) / ART_SCALE;
    expect(height).toBeGreaterThanOrEqual(68);
    expect(height).toBeLessThanOrEqual(76);
  });

  /**
   * No clinch at point blank: in neutral poses nothing above the shins reaches past the front
   * of her hurtbox (12 px) plus 2, so two fighters pressed together touch without
   * overlapping. The feet may reach a little farther, toes touching toes.
   */
  const SHIN = 12;
  const NEUTRAL: readonly { sheet: RiffSheet; frames: readonly number[]; crouching: boolean }[] = [
    { sheet: 'idle', frames: [0, 1, 2, 3, 4, 5, 6, 7], crouching: false },
    { sheet: 'walkForward', frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], crouching: false },
    { sheet: 'walkBack', frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], crouching: false },
    { sheet: 'crouch', frames: [3, 4, 5], crouching: true },
    { sheet: 'block', frames: [0, 1, 2], crouching: false },
    { sheet: 'block', frames: [3, 4, 5], crouching: true },
  ];

  it.each(NEUTRAL)('$sheet: no clinch (crouching: $crouching)', (neutral) => {
    const bodyLimit = neutral.crouching ? 16 : 14;
    const feetLimit = neutral.crouching ? 19 : 17;
    for (const frame of neutral.frames) {
      let body = -Infinity;
      let feet = -Infinity;
      eachPixel(neutral.sheet, frame, (x, y) => {
        if (y > SHIN) body = Math.max(body, x);
        else feet = Math.max(feet, x);
      });
      expect(body, `frame ${frame}: body reaches ${body}`).toBeLessThanOrEqual(bodyLimit);
      expect(feet, `frame ${frame}: feet reach ${feet}`).toBeLessThanOrEqual(feetLimit);
    }
  });

  /**
   * What you see is what hits (docs/combat-v2.md §9.5): on every frame her clip shows while a
   * move can hit, inside the band of the move's hitbox (src/data/fighters/riff.ts), the striking
   * limb (or its trail) reaches the far edge of the hitbox, at most REACH.short px short of it
   * and REACH.past px past it; a low blow at the tip of the boot, closer still. Horizontal
   * strikes are measured forward; the anti-airs forward and upward both, where the front
   * effects of their rising arc count toward the reach (an impact flash may burst past). A
   * horizontal strike whose hitbox starts behind her (the Ciseau aérien, her cross-up) is
   * measured backward too: a boot drawn past its back edge would sweep through an opponent it
   * cannot hit. The Retourné's back edge is not: the trail of its rising leg, drawn on the body
   * layer, is where the leg has been, not where it reaches.
   */
  const REACH = { short: 3, past: 4 } as const;
  const LOW_REACH = { short: 2, past: 3 } as const;
  const ANTI_AIRS: ReadonlySet<RiffSheet> = new Set<RiffSheet>(['backHeavy', 'specialAntiAir']);
  /**
   * The Genou montant is drawn leaping, its knee 34 px off the floor (tools/sprites/riff/poses/
   * specialAntiAir.ts), against a hitbox that stays on the ground (her hurtboxes follow the
   * drawing, §9.2): whether the game lifts her or the hitbox comes down is the next art round's
   * decision. Until then it is held to the art round's own rule: upward only, 6 px short or 8
   * past at most.
   */
  const LEAP = { short: 6, past: 8 } as const;
  /** Every move that strikes, with the strip it plays: some strips are played by two. */
  const STRIKES = strikesOf(RIFF_CLIPS, RIFF_TEMPLATE);
  const AWAITING = AWAITING_ART['Riff'] ?? new Set();

  it('every strike has its strip, animated', () => {
    expect(STRIKES).toHaveLength(18);
    for (const { sheet } of STRIKES) expect(isAnimated(sheet as RiffSheet), sheet).toBe(true);
    // The Hache plays the Talon's strip; the Coup de boule and the Retourné sauté the Coude's
    // and the Retourné's until their own land.
    const shared = STRIKES.filter(({ id, sheet }) => id !== sheet).map(({ id, sheet }) => [
      id,
      sheet,
    ]);
    expect(shared).toEqual([
      ['chainHeavy', 'standHeavy'],
      ['chainHigh', 'forwardHeavy'],
      ['chainLaunch', 'backHeavy'],
    ]);
  });

  /**
   * Farthest opaque pixel of `layers` along `way` within a band, on one frame: forward and up
   * as positions, back as a distance behind her (−x, so that farther is greater every way).
   */
  function reachOf(layers: readonly PixelCanvas[], frame: number, band: Band, way: Way) {
    let reached = -Infinity;
    for (const canvas of layers) {
      for (let row = 0; row < CELL_SIZE; row++) {
        for (let column = 0; column < CELL_SIZE; column++) {
          if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
          // A pixel's edges: its right edge forward, its left edge behind, its top edge up.
          const right = (column + 1 - ANCHOR.x) / ART_SCALE;
          const py = (ANCHOR.y - row) / ART_SCALE;
          const across = way === 'up' ? right : py;
          if (across < band.from || across > band.to) continue;
          const along = way === 'up' ? py : way === 'back' ? 1 / ART_SCALE - right : right;
          reached = Math.max(reached, along);
        }
      }
    }
    return reached;
  }

  for (const strike of STRIKES) {
    const sheet = strike.sheet as RiffSheet;
    it.skipIf(AWAITING.has(strike.id))(reachCheck('Riff', strike.id), () => {
      const { x, y, width, height } = strike.box;
      const leap = sheet === 'specialAntiAir';
      const { short, past } = leap ? LEAP : strike.move.guard === 'low' ? LOW_REACH : REACH;
      const up = ANTI_AIRS.has(sheet);
      const across = { from: y, to: y + height };
      const ways: { way: Way; band: Band; edge: number }[] = leap
        ? []
        : [{ way: 'forward', band: across, edge: x + width }];
      if (up) ways.push({ way: 'up', band: { from: x, to: x + width }, edge: y + height });
      else if (x < 0) ways.push({ way: 'back', band: across, edge: -x });
      const body = sheetCanvas(sheet);
      const fx = up ? drawStripEffects(RIFF, sheet) : undefined;
      for (const frame of strike.frames) {
        for (const way of ways) {
          const drawn = reachOf(fx ? [body, fx] : [body], frame, way.band, way.way);
          const limb = reachOf([body], frame, way.band, way.way);
          const where = `frame ${frame} ${way.way}, edge ${way.edge}`;
          expect(drawn, `${where}: reaches ${drawn}`).toBeGreaterThanOrEqual(way.edge - short);
          expect(limb, `${where}: limb at ${limb}`).toBeLessThanOrEqual(way.edge + past);
        }
      }
    });
  }
});

describe('Riff strips: in and out of the guard', () => {
  /** Farthest any joint of `pose` is from the same joint of the guard, in world pixels. */
  function distanceToGuard(pose: Pose): number {
    const a = solve(pose, RIFF.body);
    const b = solve(GUARD, RIFF.body);
    const points = (s: typeof a) => [
      s.hip,
      s.neck,
      s.head,
      s.near.wrist,
      s.far.wrist,
      s.near.ankle,
      s.far.ankle,
      s.near.knee,
      s.far.knee,
    ];
    const pb = points(b);
    return Math.max(
      ...points(a).map((p, i) => Math.hypot(p.x - (pb[i]?.x ?? 0), p.y - (pb[i]?.y ?? 0))),
    );
  }

  /**
   * The guard flows into them: their first frame is close to it. Not the block: a block lands
   * on the proximity guard, the shell its strip ends on, and its impact is that shell driven
   * back, 8.6 px from it by design (tools/sprites/riff/poses/block.ts).
   */
  const FROM_GUARD: readonly RiffSheet[] = [
    'idle',
    'walkForward',
    'walkBack',
    'dashForward',
    'dashBack',
    'jump',
    'jumpForward',
    'standLight',
    'forwardLight',
    'standHeavy',
    'forwardHeavy',
    'backHeavy',
    'special',
    'specialForward',
    'specialAntiAir',
    'grab',
  ];
  /** They flow back into the guard: their last frame is close to it (loops: their first). */
  const TO_GUARD: readonly RiffSheet[] = [
    'idle',
    'walkForward',
    'walkBack',
    'dashForward',
    'dashBack',
    'standLight',
    'chainLight',
    'lightFinisher',
    'forwardLight',
    'standHeavy',
    'forwardHeavy',
    'backHeavy',
    'specialForward',
    'specialAntiAir',
    'grab',
    'getup',
    'tech',
  ];
  const NEAR = 3.5;

  it.each(FROM_GUARD)('%s: the first frame starts from the guard', (sheet) => {
    const first = RIFF_POSES[sheet][0];
    if (!first) throw new Error(`${sheet} is empty`);
    expect(distanceToGuard(first)).toBeLessThanOrEqual(NEAR);
  });

  it.each(TO_GUARD)('%s: the last frame settles back into the guard', (sheet) => {
    const poses = RIFF_POSES[sheet];
    const last = poses[poses.length - 1];
    if (!last) throw new Error(`${sheet} is empty`);
    expect(distanceToGuard(last)).toBeLessThanOrEqual(NEAR);
  });

  it('the idle loop starts exactly on the guard', () => {
    expect(RIFF_POSES.idle[0]).toEqual(GUARD);
  });
});

describe('Riff effects', () => {
  /**
   * Her energy is her fringe's magenta, gold in the second colorway (its gold fringe); her
   * strikes silver-white, crimson in the second: the old b-girl violet and yellow are gone.
   */
  it('glow magenta and strike silver, gold and crimson in the second colorway', () => {
    const tone = (colorway: 'main' | 'alt', slot: keyof typeof DETAIL) => {
      const color = paletteOf(colorway)[DETAIL[slot]];
      if (!color) throw new Error(`No color ${slot}`);
      return color;
    };
    for (const slot of ['sound', 'soundLight', 'trail'] as const) {
      const magenta = tone('main', slot);
      expect(magenta.r, slot).toBeGreaterThan(200);
      expect(magenta.b, slot).toBeGreaterThan(magenta.g + 60);
      const gold = tone('alt', slot);
      expect(gold.r, slot).toBeGreaterThan(200);
      expect(gold.g, slot).toBeGreaterThan(gold.b + 80);
    }
    const silver = tone('main', 'strike');
    expect(Math.min(silver.r, silver.g, silver.b)).toBeGreaterThan(200);
    const crimson = tone('alt', 'strike');
    expect(crimson.r).toBeGreaterThan(200);
    expect(Math.max(crimson.g, crimson.b)).toBeLessThan(80);
  });

  const effects: readonly Effect[] = [
    {
      kind: 'smear',
      width: 4,
      points: [
        { x: -10, y: 40 },
        { x: 10, y: 44 },
        { x: 30, y: 46 },
      ],
    },
    { kind: 'flash', center: { x: 30, y: 46 }, radius: 7, tone: 'strike' },
    { kind: 'flash', center: { x: 30, y: 46 }, radius: 3, tone: 'strike' },
    { kind: 'flash', center: { x: 20, y: 40 }, radius: 5, tone: 'sound' },
    { kind: 'energy', center: { x: 10, y: 40 }, radius: 4 },
    { kind: 'dust', x: 4, size: 6, progress: 0.3 },
    {
      kind: 'ring',
      center: { x: 0, y: 2 },
      radius: 20,
      progress: 0.3,
      tone: 'sound',
      squash: 0.3,
    },
  ];

  it('are drawn in her own effect colors only (magenta energy, silver strikes)', () => {
    const slots = new Set(Object.values(EFFECTS.slots));
    for (const effect of effects) {
      const canvas = new PixelCanvas(CELL_SIZE, CELL_SIZE);
      drawEffect(inkAt(canvas, 0, EFFECTS), effect);
      canvas.finish();
      const used = new Set(canvas.pixels);
      used.delete(0);
      expect(used.size, effect.kind).toBeGreaterThan(0);
      for (const slot of used) expect(slots.has(slot), `${effect.kind}: slot ${slot}`).toBe(true);
    }
  });
});
