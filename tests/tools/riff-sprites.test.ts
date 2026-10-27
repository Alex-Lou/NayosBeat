import { describe, expect, it } from 'vitest';
import { RIFF_SHEETS, type RiffSheet } from '../../src/art/riff/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { PixelCanvas } from '../../tools/sprites/raster';
import { RIFF } from '../../tools/sprites/riff/index';
import { EFFECTS } from '../../tools/sprites/riff/palette';
import { GUARD } from '../../tools/sprites/riff/poses/common';
import { isAnimated, RIFF_POSES } from '../../tools/sprites/riff/poses/index';
import { RIFF_STRIKES, RIFF_TIMING } from '../../tools/sprites/riff/strips';
import { drawStrip } from '../../tools/sprites/sheet';
import { solve, type Effect, type Pose } from '../../tools/sprites/skeleton';
import { drawEffect, inkAt } from '../../tools/sprites/vfx';

const SHEETS = Object.keys(RIFF_SHEETS) as RiffSheet[];

/** docs/combat-v2.md §11.3: 43 strips, about 265 frames. */
describe('Riff strips: the set of §11.3', () => {
  it('has the 43 strips', () => {
    expect(SHEETS).toHaveLength(43);
  });

  it.each(SHEETS)('%s: poses and ticks for every frame', (sheet) => {
    const { frames } = RIFF_SHEETS[sheet];
    expect(RIFF_POSES[sheet]).toHaveLength(frames);
    expect(RIFF_TIMING[sheet].ticks).toHaveLength(frames);
  });

  /** S + A + R of §10.2 (and the grab of §10.3): an attack's clip lasts exactly its move. */
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
    const ticks = RIFF_TIMING[sheet as RiffSheet].ticks;
    expect(ticks.reduce((sum, tick) => sum + tick, 0)).toBe(total);
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
    const strike = RIFF_STRIKES[sheet as RiffSheet];
    const first = strike?.frames[0] ?? -1;
    const ticks = RIFF_TIMING[sheet as RiffSheet].ticks.slice(0, first);
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
   * What you see is what hits: on every active frame of an animated strike, the drawing reaches
   * the far edge of the hitbox (within 6 px short, 8 px past), inside the hitbox's band.
   * Horizontal strikes are measured forward, the anti-airs upward.
   */
  const REACH_SLACK = 6;
  const REACH_OVERSHOOT = 8;
  const STRIKES = (Object.keys(RIFF_STRIKES) as RiffSheet[]).filter(isAnimated);

  it('every strike strip has its hitbox', () => {
    for (const sheet of STRIKES) expect(RIFF_STRIKES[sheet]).toBeDefined();
  });

  it.each(STRIKES.length > 0 ? STRIKES : (['none'] as const))(
    '%s: the active frames reach the hitbox, no farther',
    (sheet) => {
      if (sheet === 'none') return;
      const strike = RIFF_STRIKES[sheet];
      if (!strike) throw new Error(`${sheet} has no hitbox`);
      const { x, y, width, height } = strike.box;
      const band = strike.up ? { from: x, to: x + width } : { from: y, to: y + height };
      const edge = strike.up ? y + height : x + width;
      for (const frame of strike.frames) {
        let reached = -Infinity;
        eachPixel(sheet, frame, (px, py) => {
          const across = strike.up ? px : py;
          if (across < band.from || across > band.to) return;
          reached = Math.max(reached, strike.up ? py : px);
        });
        const message = `frame ${frame} reaches ${reached}, edge ${edge}`;
        expect(reached, message).toBeGreaterThanOrEqual(edge - REACH_SLACK);
        expect(reached, message).toBeLessThanOrEqual(edge + REACH_OVERSHOOT);
      }
    },
  );
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

  /** The guard flows into them: their first frame is close to it. */
  const FROM_GUARD: readonly RiffSheet[] = [
    'idle',
    'walkForward',
    'walkBack',
    'dashForward',
    'dashBack',
    'jump',
    'jumpForward',
    'block',
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

  it('are drawn in her own effect colors only (violet energy, yellow strikes)', () => {
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
