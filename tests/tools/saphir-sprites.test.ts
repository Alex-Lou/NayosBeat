import { describe, expect, it } from 'vitest';
import { SAPHIR_CLIPS } from '../../src/art/saphir/clips';
import { SAPHIR_SHEETS, type SaphirSheet } from '../../src/art/saphir/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { SAPHIR as SAPHIR_TEMPLATE } from '../../src/data/fighters/saphir';
import { CELL_MARGIN, GROUND_ROW, GROUNDED_STRIPS, LOWEST_ROW } from '../../tools/sprites/cell';
import { strikesOf, type StripStrike } from '../../tools/sprites/clips';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { SAPHIR } from '../../tools/sprites/saphir/index';
import { GUARD } from '../../tools/sprites/saphir/poses/common';
import { SAPHIR_POSES } from '../../tools/sprites/saphir/poses/index';
import { drawStrip, drawStripEffects } from '../../tools/sprites/sheet';
import { reachCheck } from './fighters';

const SHEETS = Object.keys(SAPHIR_SHEETS) as SaphirSheet[];

/** docs/combat-v2.md §11.3: the 43 strips, and the 3 of combos v3, as Riff has them. */
describe('Saphir strips: the set', () => {
  it('has the 43 strips, and the 3 of combos v3', () => {
    expect(SHEETS).toHaveLength(46);
  });

  it.each(SHEETS)('%s: poses and ticks for every frame', (sheet) => {
    const { frames } = SAPHIR_SHEETS[sheet];
    expect(SAPHIR_POSES[sheet]).toHaveLength(frames);
    expect(SAPHIR.timing(sheet).ticks).toHaveLength(frames);
  });

  it('her idle starts on her guard, and its clip loops it', () => {
    expect(SAPHIR_POSES.idle[0]).toBe(GUARD);
    expect(SAPHIR_CLIPS.idle.loopFrom).toBe(0);
  });
});

describe('Saphir strips: drawing', () => {
  const drawn = new Map<SaphirSheet, PixelCanvas>();
  const sheetCanvas = (sheet: SaphirSheet): PixelCanvas => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawStrip(SAPHIR, sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  /** Opaque extent of one cell, in cell pixels. */
  function extent(sheet: SaphirSheet, frame: number) {
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
    for (let frame = 0; frame < SAPHIR_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        CELL_MARGIN,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(LOWEST_ROW);
    }
  });

  it.each(GROUNDED_STRIPS)('%s: feet stand on the ground line in every frame', (sheet) => {
    for (let frame = 0; frame < SAPHIR_SHEETS[sheet].frames; frame++) {
      expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(GROUND_ROW);
    }
  });

  it.each(['idle', 'walkForward', 'walkBack', 'block'] as const)(
    '%s: nothing is drawn under the floor',
    (sheet) => {
      for (let frame = 0; frame < SAPHIR_SHEETS[sheet].frames; frame++) {
        expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeLessThanOrEqual(ANCHOR.y);
      }
    },
  );

  /**
   * Her guard, hat included, stands 70 to 76 world px tall: about Riff's 73 px, and no taller
   * than her pushbox (76 px, src/data/fighters/saphir.ts).
   */
  it('her guard stands 70 to 76 world px tall', () => {
    const { top, bottom } = extent('idle', 0);
    const height = (bottom - top + 1) / ART_SCALE;
    expect(height).toBeGreaterThanOrEqual(70);
    expect(height).toBeLessThanOrEqual(76);
  });
});

/**
 * What you see is what hits (docs/combat-v2.md §9.5), on her three signature moves (porte 2;
 * the others at porte 3): on every frame her clip shows while a move can hit, inside the band
 * of the move's hitbox (src/data/fighters/saphir*.ts), the striking leg (or its trail) reaches
 * the far edge of the hitbox, at most REACH.short px short of it and REACH.past px past it. The
 * kicks are measured forward; the Contre-ut forward and upward, its front effects counting
 * toward the reach (the body alone may not pass the edge).
 */
describe('Saphir strips: reach', () => {
  const REACH = { short: 3, past: 4 } as const;
  const DRAWN = ['standHeavy', 'special', 'specialAntiAir'] as const;
  const ANTI_AIRS: ReadonlySet<string> = new Set(['specialAntiAir']);
  /** Her strikes on the strips drawn so far: the moves and their Remixes playing them. */
  const STRIKES = strikesOf(SAPHIR_CLIPS, SAPHIR_TEMPLATE).filter(({ sheet }) =>
    (DRAWN as readonly string[]).includes(sheet),
  );

  it('the three signature moves, and the Remixes that play them', () => {
    expect(STRIKES.map(({ id }) => id).sort()).toEqual(
      ['special', 'specialAntiAir', 'specialAntiAirBoost', 'specialBoost', 'standHeavy'].sort(),
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
    const body = drawStrip(SAPHIR, strike.sheet);
    const fx = up ? drawStripEffects(SAPHIR, strike.sheet) : undefined;
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
