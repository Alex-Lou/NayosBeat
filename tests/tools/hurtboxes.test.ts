import { describe, expect, it } from 'vitest';
import { NAYO_CELLS } from '../../src/art/nayo/cells';
import { ART_SCALE, CELL_SIZE, FULL_CELL, type Cell } from '../../src/art/types';
import { toWorld } from '../../src/core/boxes';
import type { Box } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { NAYO } from '../../src/data/fighters/nayo';
import { anchorOrigin } from '../../src/render/anchor-origin';
import {
  calibrate,
  envelope,
  fits,
  measureFrames,
  POSTURE_CLIPS,
  postureFrames,
  type Drawing,
  type Posture,
  type StripMask,
} from '../../tools/sprites/measure';
import type { PosedSheet } from '../../tools/sprites/nayo/poses/index';
import { drawSheet } from '../../tools/sprites/sheet';

/**
 * Nayo's hurtboxes follow his drawing (docs/combat-v2.md §9.2), on the strips drawn in memory
 * (the same pixels as the generated PNGs, which `npm run measure-boxes` reads): each box's front
 * edge meets the farthest the body reaches over its heights, the back edge the rear foot, the
 * top the hair, to 1.5 px.
 */

const HURTBOXES: Readonly<Record<Posture, readonly Box[]>> = {
  standing: NAYO.standingHurtboxes,
  crouching: NAYO.crouchingHurtboxes,
  air: NAYO.airHurtboxes,
};

const masks = new Map<string, StripMask>();

function maskOf(sheet: string): StripMask {
  const known = masks.get(sheet);
  if (known) return known;
  const canvas = drawSheet(sheet as PosedSheet);
  const mask: StripMask = {
    cell: FULL_CELL,
    opaque: (frame, column, row) =>
      canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] !== 0,
  };
  masks.set(sheet, mask);
  return mask;
}

function bodyOf(posture: Posture): Drawing {
  return envelope(
    POSTURE_CLIPS[posture].body.map((clip) => {
      const { sheet, frames } = postureFrames(clip);
      return measureFrames(maskOf(sheet), frames);
    }),
  );
}

const postures = Object.keys(HURTBOXES) as Posture[];

describe("Nayo's hurtboxes", () => {
  it.each(postures)('%s: follow the drawing to 1.5 px', (posture) => {
    const { fronts, back, top } = calibrate(HURTBOXES[posture], bodyOf(posture));
    fronts.forEach((front, index) => {
      expect(fits(front), `front of box ${index + 1}: ${JSON.stringify(front)}`).toBe(true);
    });
    expect(fits(back), `back: ${JSON.stringify(back)}`).toBe(true);
    expect(fits(top), `top: ${JSON.stringify(top)}`).toBe(true);
  });

  it('keep the shins where a low blow lands: the front edge never past the toes', () => {
    // §9.1: hurtboxes reaching past the drawn toes let a low kick hit thin air.
    const toes = bodyOf('standing').bands[0]?.front ?? 0;
    for (const box of [...NAYO.standingHurtboxes, ...NAYO.crouchingHurtboxes]) {
      expect(toPx(box.x + box.width)).toBeLessThanOrEqual(toes);
    }
  });

  /**
   * Facing left, the game mirrors both: the core its boxes (toWorld), Phaser the strip, around
   * the feet anchor (render/anchor-origin.ts). The front edge of the box still meets the
   * drawing's, now on the left.
   */
  it('follow the drawing of a fighter facing left too', () => {
    const { sheet, frames } = postureFrames('idle');
    const cell: Cell = NAYO_CELLS[sheet] ?? FULL_CELL;
    const origin = anchorOrigin(cell, true);
    const drawn = measureFrames(maskOf(sheet), frames);
    const front = Math.max(...drawn.bands.map((band) => band.front));
    // Phaser draws a flipped cell from its origin (TransformerImage's arithmetic): column c,
    // shifted by the width less twice the display origin, scaled by -1 / ART_SCALE.
    const shift = origin.x * cell.width - cell.width;
    const farColumn = cell.anchor.x + front * ART_SCALE;
    const leftmost = -(shift + farColumn) / ART_SCALE;
    const [box] = NAYO.standingHurtboxes;
    if (!box) throw new Error('No standing hurtbox');
    const world = toWorld(box, 0, 0, -1);
    expect(Math.abs(toPx(world.left) - leftmost)).toBeLessThanOrEqual(1.5);
  });
});
