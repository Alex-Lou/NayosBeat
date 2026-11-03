/**
 * The floor (docs/art/decor-temple.md §2.3): the courtyard the fighters stand on, in bands that read
 * at a glance. Great flagstones in two courses, their joints every 64 world pixels (they measure the
 * distances), moss in them; a band of raked gravel; the kerb's lit edge; the moss at the front.
 * Flat tones (docs/art/proprete.md). The snow settles on the flagstones and the moss in hidden ramps,
 * which only the snow shows (palette.ts). Image pixels (STAGE_SCALE).
 */

import { Canvas, at } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { MOSS, SNOW_MOSS, SNOW_STONE, STONE } from './palette.ts';

const SCALE = 2;
/** A flagstone's length: 64 world pixels. */
const SLAB = 64 * SCALE;
/** How far from each end the courtyard darkens (24 world pixels). */
const CORNER = 24 * SCALE;
/** The bands, top to bottom: the two courses of flagstones, the gravel, the kerb, the moss. */
const ROWS = { course: 22, gravel: 44, kerb: 60, moss: 66 } as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1 : 0;
}

/** Where the snow settles: everywhere but a ragged edge here and there (flat, never speckled). */
export function snowAt(seed: number, x: number, y: number): boolean {
  return noise(seed, x, y * 2, 90) > 0.12;
}

/** The floor, `width` × `height` image pixels, from the temple's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.gravel) {
      // Two courses, the second offset by half a slab; their joints dark, moss in some.
      const second = y >= ROWS.course;
      const along = (x + (second ? SLAB / 2 : 0)) % SLAB;
      const row = second ? y - ROWS.course : y;
      const joint = along < 3 || row < 2;
      if (joint) return at(noise(seed + 1, x, y, 12) > 0.6 ? MOSS : STONE, row < 2 ? 1 : 0);
      // A slab: its lit top edge, a worn one now and then, flat.
      const worn =
        noise(seed + 2, Math.floor((x + (second ? SLAB / 2 : 0)) / SLAB), second ? 1 : 0, 1) > 0.6;
      const level = (row === 2 ? 5 : worn ? 3 : 4) + corner;
      return at(snowAt(seed + 3, x, y) ? SNOW_STONE : STONE, level);
    }
    if (y < ROWS.kerb) {
      // The raked gravel: long flat lines, a ripple around nothing.
      const line = Math.floor((y - ROWS.gravel) / 3) % 2 === 0;
      return at(STONE, (line ? 3 : 2) + corner);
    }
    if (y < ROWS.moss) {
      if (y === ROWS.kerb) return at(STONE, 6);
      const joint = x % SLAB === 0;
      return at(STONE, (joint ? 2 : 4) + corner);
    }
    const tuft = noise(seed + 4, x, y, 10) > 0.62;
    return at(snowAt(seed + 5, x, y) ? SNOW_MOSS : MOSS, (tuft ? 2 : 1) + (corner < 0 ? -1 : 0));
  });
  return canvas;
}
