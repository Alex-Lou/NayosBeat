import { describe, expect, it } from 'vitest';
import { WATT_CLIPS } from '../../src/art/watt/clips';
import { WATT_SHEETS, type WattSheet } from '../../src/art/watt/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { WATT as WATT_TEMPLATE } from '../../src/data/fighters/watt';
import { CELL_MARGIN, GROUND_ROW, GROUNDED_STRIPS, LOWEST_ROW } from '../../tools/sprites/cell';
import { strikesOf, type StripStrike } from '../../tools/sprites/clips';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { drawStrip, drawStripEffects } from '../../tools/sprites/sheet';
import { WATT } from '../../tools/sprites/watt/index';
import { GUARD } from '../../tools/sprites/watt/poses/common';
import { WATT_POSES } from '../../tools/sprites/watt/poses/index';
import { reachCheck } from './fighters';

const SHEETS = Object.keys(WATT_SHEETS) as WattSheet[];

/** docs/combat-v2.md §11.3: the 43 strips, and the 3 of combos v3, as Saphir has them. */
describe('Watt strips: the set', () => {
  it('has the 43 strips, and the 3 of combos v3', () => {
    expect(SHEETS).toHaveLength(46);
  });

  it.each(SHEETS)('%s: poses and ticks for every frame', (sheet) => {
    const { frames } = WATT_SHEETS[sheet];
    expect(WATT_POSES[sheet]).toHaveLength(frames);
    expect(WATT.timing(sheet).ticks).toHaveLength(frames);
  });

  it('his idle starts on his guard, and its clip loops it', () => {
    expect(WATT_POSES.idle[0]).toBe(GUARD);
    expect(WATT_CLIPS.idle.loopFrom).toBe(0);
  });
});

describe('Watt strips: drawing', () => {
  const drawn = new Map<WattSheet, PixelCanvas>();
  const sheetCanvas = (sheet: WattSheet): PixelCanvas => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawStrip(WATT, sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  /** Calls `visit` with every opaque pixel of one cell, in world pixels from the feet anchor. */
  function eachPixel(sheet: WattSheet, frame: number, visit: (x: number, y: number) => void) {
    const canvas = sheetCanvas(sheet);
    for (let row = 0; row < CELL_SIZE; row++) {
      for (let column = 0; column < CELL_SIZE; column++) {
        if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
        visit((column + 1 - ANCHOR.x) / ART_SCALE, (ANCHOR.y - row) / ART_SCALE);
      }
    }
  }

  /** Opaque extent of one cell, in cell pixels. */
  function extent(sheet: WattSheet, frame: number) {
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
    for (let frame = 0; frame < WATT_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        CELL_MARGIN,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(LOWEST_ROW);
    }
  });

  it.each(GROUNDED_STRIPS)('%s: feet stand on the ground line in every frame', (sheet) => {
    for (let frame = 0; frame < WATT_SHEETS[sheet].frames; frame++) {
      expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(GROUND_ROW);
    }
  });

  it.each(['idle', 'walkForward', 'walkBack', 'block'] as const)(
    '%s: nothing is drawn under the floor',
    (sheet) => {
      for (let frame = 0; frame < WATT_SHEETS[sheet].frames; frame++) {
        expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeLessThanOrEqual(ANCHOR.y);
      }
    },
  );

  /**
   * No clinch at point blank: in neutral poses nothing above the shins reaches past the pushbox
   * (plus 1 px), so two fighters pressed together touch without overlapping. The feet may reach
   * a little farther, toes touching toes.
   */
  const SHIN = 12;
  const NEUTRAL: readonly { sheet: WattSheet; frames: readonly number[]; crouching: boolean }[] = [
    { sheet: 'idle', frames: WATT_CLIPS.idle.frames, crouching: false },
    { sheet: 'walkForward', frames: WATT_CLIPS.walkForward.frames, crouching: false },
    { sheet: 'walkBack', frames: WATT_CLIPS.walkBack.frames, crouching: false },
    { sheet: 'crouch', frames: WATT_CLIPS.crouch.frames.slice(3), crouching: true },
    { sheet: 'block', frames: WATT_CLIPS.blockStand.frames, crouching: false },
    { sheet: 'block', frames: WATT_CLIPS.blockCrouch.frames, crouching: true },
  ];

  it.each(NEUTRAL)('$sheet: stays inside the pushbox (crouching: $crouching)', (neutral) => {
    const box = neutral.crouching ? WATT_TEMPLATE.crouchingPushbox : WATT_TEMPLATE.standingPushbox;
    const half = toPx(box.width) / 2;
    for (const frame of neutral.frames) {
      let body = -Infinity;
      let feet = -Infinity;
      eachPixel(neutral.sheet, frame, (x, y) => {
        if (y > SHIN) body = Math.max(body, x);
        else feet = Math.max(feet, x);
      });
      expect(body, `frame ${frame}: body reaches ${body}`).toBeLessThanOrEqual(half + 1);
      expect(feet, `frame ${frame}: feet reach ${feet}`).toBeLessThanOrEqual(half + 4);
    }
  });

  /**
   * His guard, the bulb included, stands 76 to 84 world px tall (docs/watt.md §10): a colosse
   * over Nayo's 79, and under 96, the Finisher's close up (docs/finisher.md §1.14).
   */
  it('his guard stands 76 to 84 world px tall', () => {
    const { top, bottom } = extent('idle', 0);
    const height = (bottom - top + 1) / ART_SCALE;
    expect(height).toBeGreaterThanOrEqual(76);
    expect(height).toBeLessThanOrEqual(84);
  });
});

/**
 * What you see is what hits (docs/combat-v2.md §9.5), on his three signature moves (porte 2;
 * the others at porte 3): on every frame his clip shows while a move can hit, inside the band of
 * the move's hitbox (src/data/fighters/watt*.ts), the striking limb (a clamp, the shoulder plate,
 * or its trail) reaches the far edge of the hitbox, at most REACH.short px short of it and
 * REACH.past px past it. The Plafonnier is measured forward and upward, its front effects
 * counting toward the reach.
 */
describe('Watt strips: reach', () => {
  const REACH = { short: 3, past: 4 } as const;
  const DRAWN = [
    'grab',
    'specialForward',
    'specialAntiAir',
    'standLight',
    'chainLight',
    'lightFinisher',
    'forwardLight',
    'standHeavy',
    'chainHeavy',
    'forwardHeavy',
    'backHeavy',
    'chainLaunch',
    'crouchLight',
    'crouchHeavy',
    'jumpLight',
    'jumpHeavy',
  ] as const;
  const ANTI_AIRS: ReadonlySet<string> = new Set(['specialAntiAir', 'backHeavy', 'chainLaunch']);
  /** His strikes on the strips drawn so far: the moves and their Remixes playing them. */
  const STRIKES = strikesOf(WATT_CLIPS, WATT_TEMPLATE).filter(({ sheet }) =>
    (DRAWN as readonly string[]).includes(sheet),
  );

  it('his drawn moves, and the Remixes and the Coup de masse that play them', () => {
    expect(STRIKES.map(({ id }) => id).sort()).toEqual(
      [
        'backHeavy',
        'chainHeavy',
        'chainHigh',
        'chainLaunch',
        'chainLight',
        'crouchHeavy',
        'crouchLight',
        'forwardHeavy',
        'forwardLight',
        'grab',
        'jumpHeavy',
        'jumpLight',
        'lightFinisher',
        'specialAntiAir',
        'specialAntiAirBoost',
        'specialForward',
        'specialForwardBoost',
        'standHeavy',
        'standLight',
      ].sort(),
    );
  });

  /** Farthest opaque pixel of `layers` along `way` within a band, on one frame. */
  function reachOf(
    layers: readonly PixelCanvas[],
    frame: number,
    band: { from: number; to: number },
    way: 'forward' | 'up',
  ): number {
    let reached = -Infinity;
    for (const canvas of layers) {
      for (let row = 0; row < CELL_SIZE; row++) {
        for (let column = 0; column < CELL_SIZE; column++) {
          if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
          const right = (column + 1 - ANCHOR.x) / ART_SCALE;
          const top = (ANCHOR.y - row) / ART_SCALE;
          const across = way === 'up' ? right : top;
          if (across < band.from || across > band.to) continue;
          reached = Math.max(reached, way === 'up' ? top : right);
        }
      }
    }
    return reached;
  }

  function checkReach(strike: StripStrike): void {
    const { x, y, width, height } = strike.box;
    const up = ANTI_AIRS.has(strike.sheet);
    const ways = [
      { way: 'forward' as const, band: { from: y, to: y + height }, edge: x + width },
      ...(up ? [{ way: 'up' as const, band: { from: x, to: x + width }, edge: y + height }] : []),
    ];
    const body = drawStrip(WATT, strike.sheet);
    const fx = up ? drawStripEffects(WATT, strike.sheet) : undefined;
    for (const frame of strike.frames) {
      for (const { way, band, edge } of ways) {
        const drawn = reachOf(fx ? [body, fx] : [body], frame, band, way);
        const limb = reachOf([body], frame, band, way);
        const where = `frame ${frame} ${way}, edge ${edge}`;
        expect(drawn, `${where}: reaches ${drawn}`).toBeGreaterThanOrEqual(edge - REACH.short);
        expect(limb, `${where}: limb at ${limb}`).toBeLessThanOrEqual(edge + REACH.past);
      }
    }
  }

  for (const strike of STRIKES) {
    it(reachCheck(strike.id), () => {
      checkReach(strike);
    });
  }
});
