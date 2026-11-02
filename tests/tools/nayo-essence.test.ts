import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import { effectLightsOf, glowsOf } from '../../tools/sprites/effect-light';
import { NAYO, NAYO_LIGHTING } from '../../tools/sprites/nayo/index';
import { EFFECT_TINTS, MATERIAL, paletteOf } from '../../tools/sprites/nayo/palette';
import { GUARD } from '../../tools/sprites/nayo/poses/common';
import type { Rgba } from '../../tools/sprites/png';
import {
  PixelCanvas,
  type EffectLight,
  type Lighting,
  type Material,
} from '../../tools/sprites/raster';
import { drawStrip } from '../../tools/sprites/sheet';

/**
 * The light of Nayo's own effects, frozen in his sprites (docs/art/nayo-essence.md): what faces a
 * source takes its color, what turns away from it sinks into shadow, and nothing of it moves the
 * silhouette, spills into the next frame or reaches under his feet.
 */

/** Every slot an effect's light paints, by color. */
const TINT_SLOTS = Object.fromEntries(
  Object.entries(EFFECT_TINTS).map(([tone, tints]) => [
    tone,
    new Set(Object.values(tints).flatMap(({ kiss, lit }) => [kiss, lit])),
  ]),
);
const ALL_TINTS = new Set(Object.values(TINT_SLOTS).flatMap((slots) => [...slots]));

const luminance = ({ r, g, b }: Rgba): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** A test material: slots 1 to 7. */
const STONE: Material = { outline: 1, deep: 2, shadow: 3, base: 4, light: 5 };
/** Its tints under a test light: 10 grazed, 11 squarely lit. */
const TEST_LIGHTING: Lighting = {
  ground: 120,
  rim: {
    direction: { x: -1, y: -1 },
    facing: { rim: 2, light: 2 },
    fade: { full: 0, none: 0 },
    exact: {},
  },
  occlusion: { height: 0, depth: 0 },
  glow: {},
  fx: {
    tints: { test: { [STONE.outline]: { kiss: 10, lit: 11 } } },
    exact: {},
    levels: { kiss: 0.3, lit: 0.58 },
    drama: 0.22,
    shadow: 0.55,
    floor: 0,
  },
};

/** A ball of stone in the middle of a 120 px cell, lit or not by a light at `x`, `y`. */
function ball(light?: Partial<EffectLight>, fx: Partial<Lighting['fx']> = {}): PixelCanvas {
  const canvas = new PixelCanvas(240, 120);
  canvas.circle({ x: 60, y: 60 }, 24, STONE);
  if (light) {
    canvas.lightBy({
      x: 60,
      y: 60,
      reach: 70,
      power: 1.2,
      color: 'test',
      left: 0,
      right: 120,
      ...light,
    });
  }
  const base = TEST_LIGHTING.fx;
  canvas.finish(base ? { ...TEST_LIGHTING, fx: { ...base, ...fx } } : TEST_LIGHTING);
  return canvas;
}

/** Pixels of the ball darker in `b` than in `a`; fails on one lighter (but for the tints). */
function darkerIn(a: PixelCanvas, b: PixelCanvas, x0: number, x1: number): number {
  let darker = 0;
  for (let y = 40; y <= 80; y++) {
    for (let x = x0; x <= x1; x++) {
      const before = at(a, x, y);
      const after = at(b, x, y);
      if (before < STONE.deep || after < STONE.deep || after >= 10) continue;
      expect(after, `${x},${y}`).toBeLessThanOrEqual(before);
      if (after < before) darker++;
    }
  }
  return darker;
}

const at = (canvas: PixelCanvas, x: number, y: number): number =>
  canvas.pixels[y * canvas.width + x] ?? 0;

describe("an effect's light on the body", () => {
  const dark = ball();
  const lit = ball({ x: 100, y: 60 });

  it('colors the side turned to the source, not the other one', () => {
    // The right edge of the ball, facing the light: squarely lit.
    expect(at(lit, 82, 60)).toBe(11);
    // The left edge, turned away: none of its color.
    expect([10, 11]).not.toContain(at(lit, 38, 60));
    // Without the light, the right edge keeps its own tone.
    expect([10, 11]).not.toContain(at(dark, 82, 60));
  });

  it('darkens what turns away from it: the far side sinks a band', () => {
    const noDrama = ball({ x: 100, y: 60 }, { drama: 0 });
    expect(darkerIn(dark, noDrama, 36, 50)).toBeGreaterThan(20);
  });

  it('a strong source darkens the rest of its frame: the contrast rises', () => {
    // A source in the cell that reaches nothing of the ball, no shadow of its own.
    const away = ball({ x: 116, y: 4, reach: 10, power: 1 }, { shadow: 0 });
    expect(darkerIn(dark, away, 36, 84)).toBeGreaterThan(20);
    const calm = ball({ x: 116, y: 4, reach: 10, power: 1 }, { shadow: 0, drama: 0 });
    expect(darkerIn(dark, calm, 36, 84)).toBe(0);
  });

  it('follows its source: lit from below, the bottom of the ball takes it', () => {
    const below = ball({ x: 60, y: 100 });
    expect([10, 11]).toContain(at(below, 60, 82));
    expect([10, 11]).not.toContain(at(below, 60, 38));
  });

  it('fades with distance: a source out of reach lights nothing', () => {
    const far = ball({ x: 200, y: 60, left: 0, right: 240 });
    expect([...far.pixels].some((slot) => slot === 10 || slot === 11)).toBe(false);
  });

  it('never spills into the next frame, nor moves the silhouette', () => {
    const canvas = new PixelCanvas(240, 120);
    canvas.circle({ x: 60, y: 60 }, 24, STONE);
    canvas.circle({ x: 180, y: 60 }, 24, STONE);
    // A light at the right edge of the first cell, its reach well into the second.
    canvas.lightBy({ x: 118, y: 60, reach: 90, power: 1.5, color: 'test', left: 0, right: 120 });
    canvas.finish(TEST_LIGHTING);
    const plain = new PixelCanvas(240, 120);
    plain.circle({ x: 60, y: 60 }, 24, STONE);
    plain.circle({ x: 180, y: 60 }, 24, STONE);
    plain.finish(TEST_LIGHTING);
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 240; x++) {
        expect(at(canvas, x, y) === 0, `${x},${y}`).toBe(at(plain, x, y) === 0);
        if (x >= 120) expect(at(canvas, x, y), `${x},${y}`).toBe(at(plain, x, y));
      }
    }
    expect(at(canvas, 82, 60)).toBe(11);
  });
});

describe("Nayo's effects light him", () => {
  it('reads a light from every effect but the dust and the guard, in its color', () => {
    expect(glowsOf({ ...GUARD, effects: [] })).toEqual([]);
    const glows = glowsOf({
      ...GUARD,
      effects: [
        { kind: 'dust', x: 0, size: 3, progress: 0.2 },
        { kind: 'flash', center: { x: 20, y: 50 }, radius: 4, tone: 'strike' },
        {
          kind: 'disc',
          center: { x: 0, y: 40 },
          radius: 5,
          phase: 0,
          afterimages: 0,
          tone: 'platine',
        },
      ],
    });
    expect(glows.map(({ tone }) => tone)).toEqual(['strike', 'platine']);
    // In the cell's pixels: the anchor, twice finer.
    const [light] = effectLightsOf(
      {
        ...GUARD,
        glows: [{ center: { x: 10, y: 20 }, reach: 30, power: 1, tone: 'sound' }],
      },
      CELL_SIZE,
      CELL_SIZE,
    );
    expect(light).toMatchObject({
      x: CELL_SIZE + ANCHOR.x + 20,
      y: ANCHOR.y - 40,
      reach: 60,
      left: CELL_SIZE,
      right: 2 * CELL_SIZE,
    });
  });

  it('has a tone of every material under every light, brighter squarely lit, in both colorways', () => {
    for (const way of ['main', 'alt'] as const) {
      const palette = paletteOf(way);
      for (const [tone, tints] of Object.entries(EFFECT_TINTS)) {
        for (const material of Object.values(MATERIAL)) {
          const tint = tints[material.outline];
          if (!tint) throw new Error(`${tone}: no tint for slot ${material.outline}`);
          const kiss = palette[tint.kiss];
          const full = palette[tint.lit];
          if (!kiss || !full) throw new Error(`${tone}: no color`);
          expect(luminance(full), `${way} ${tone} ${material.outline}`).toBeGreaterThan(
            luminance(kiss),
          );
        }
      }
    }
  });

  it('the sound light is cyan on the first colorway, magenta on the second; the Boost white', () => {
    const color = (way: 'main' | 'alt', tone: 'sound' | 'platine', material: Material): Rgba => {
      const slot = EFFECT_TINTS[tone][material.outline]?.lit ?? 0;
      const found = paletteOf(way)[slot];
      if (!found || slot === 0) throw new Error(`${tone}: no tint of slot ${material.outline}`);
      return found;
    };
    const main = color('main', 'sound', MATERIAL.jacket);
    const alt = color('alt', 'sound', MATERIAL.jacket);
    expect(main.b).toBeGreaterThan(main.r);
    expect(main.g).toBeGreaterThan(main.r);
    expect(alt.r).toBeGreaterThan(alt.g);
    const white = color('main', 'platine', MATERIAL.skin);
    expect(Math.min(white.r, white.g, white.b)).toBeGreaterThan(200);
  });

  /** Frames of the strips the light changes most. */
  const LIT = ['special', 'specialAntiAir', 'specialForward', 'super', 'standHeavy'] as const;

  it.each(LIT)('%s: its effects light frames of it, never under his feet', (sheet) => {
    const strip = drawStrip(NAYO, sheet);
    const frames = strip.width / CELL_SIZE;
    let lit = 0;
    for (let frame = 0; frame < frames; frame++) {
      let tinted = 0;
      for (let y = 0; y < CELL_SIZE; y++) {
        for (let x = frame * CELL_SIZE; x < (frame + 1) * CELL_SIZE; x++) {
          if (!ALL_TINTS.has(strip.pixels[y * strip.width + x] ?? 0)) continue;
          tinted++;
          // Nothing on the soles: the last 3 px above the ground.
          expect(y, `${sheet} frame ${frame}: lit at ${x % CELL_SIZE},${y}`).toBeLessThan(
            ANCHOR.y - 3,
          );
        }
      }
      if (tinted > 0) lit++;
    }
    expect(lit, sheet).toBeGreaterThan(0);
  });

  it('lights nothing in the guard, the walks, the hits: no effect, no light', () => {
    for (const sheet of ['idle', 'walkForward', 'hitHigh', 'block'] as const) {
      const strip = drawStrip(NAYO, sheet);
      expect(
        [...strip.pixels].filter((slot) => ALL_TINTS.has(slot)),
        sheet,
      ).toEqual([]);
    }
  });

  it.each(LIT)('%s: the light never moves the silhouette', (sheet) => {
    const { ground, rim, occlusion, glow } = NAYO_LIGHTING;
    const street: Lighting = { ground, rim, occlusion, glow };
    const lit = drawStrip(NAYO, sheet).pixels;
    const plain = drawStrip({ ...NAYO, lighting: street }, sheet).pixels;
    const moved = lit.filter((slot, index) => (slot === 0) !== (plain[index] === 0));
    expect(moved.length).toBe(0);
    expect(lit.some((slot, index) => slot !== plain[index])).toBe(true);
  });
});

describe("the Boost's own images (docs/art/nayo-essence.md §5)", () => {
  const REMIXES = [
    ['specialBoost', 'special', 'specialRemix'],
    ['specialForwardBoost', 'specialForward', 'specialForwardRemix'],
    ['specialAntiAirBoost', 'specialAntiAir', 'specialAntiAirRemix'],
  ] as const;

  it.each(REMIXES)('%s plays its own strip at its special’s timing', (remix, special, strip) => {
    const own = NAYO_CLIPS[remix];
    const plain = NAYO_CLIPS[special];
    if (!own) throw new Error(`no clip for ${remix}`);
    expect(own.sheet).toBe(strip);
    expect(own.frames).toEqual(plain.frames);
    expect(own.ticks).toEqual(plain.ticks);
    expect(NAYO_SHEETS[strip].frames).toBe(NAYO_SHEETS[special].frames);
  });

  it.each(REMIXES)(
    '%s: its own pixels, lit gold and white, its special’s cyan',
    (_, special, strip) => {
      const plain = drawStrip(NAYO, special).pixels;
      const own = drawStrip(NAYO, strip).pixels;
      const count = (pixels: Uint8Array, slots: ReadonlySet<number>): number =>
        pixels.filter((slot) => slots.has(slot)).length;
      const platine = TINT_SLOTS.platine ?? new Set<number>();
      const sound = TINT_SLOTS.sound ?? new Set<number>();
      expect(count(own, platine)).toBeGreaterThan(150);
      expect(count(own, sound)).toBe(0);
      expect(count(plain, sound)).toBeGreaterThan(150);
      expect(count(plain, platine)).toBe(0);
      // The same poses: the same silhouette, what the game measures does not move.
      expect(own.filter((slot, index) => (slot === 0) !== (plain[index] === 0)).length).toBe(0);
    },
  );
});

describe('the Mégabasse lights him from the floor', () => {
  const strip = drawStrip(NAYO, 'super');
  const platine = TINT_SLOTS.platine ?? new Set<number>();
  /** The pixels of a frame lit by the Boost's light. */
  const litIn = (frame: number): number => {
    let lit = 0;
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = frame * CELL_SIZE; x < (frame + 1) * CELL_SIZE; x++) {
        if (platine.has(strip.pixels[y * strip.width + x] ?? 0)) lit++;
      }
    }
    return lit;
  };

  it('every blow, the rebound in between dimmer, the third blow brightest', () => {
    const [first, rebound, third] = [2, 3, 4].map(litIn);
    expect(first).toBeGreaterThan(40);
    expect(first).toBeGreaterThan(rebound ?? Infinity);
    expect(third).toBeGreaterThan(first ?? Infinity);
  });
});
