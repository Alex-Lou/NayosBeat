/**
 * The floor (docs/art/decor-club.md §2.3): the dance floor at the fighters' feet, in bands that read
 * at a glance. Dark polished concrete in slabs, their joints every 64 world pixels (they measure the
 * distances); the stage's violet in long flat shines on it; the taped line at the front of the
 * floor, then the darker concrete nearest. Flat tones (docs/art/proprete.md). Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { FLOOR, TAPE, VIOLET } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { joint: 26, shine: 10, tape: 50, front: 56 } as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1 : 0;
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.tape) {
      if (x % SLAB < 2 || y === ROWS.joint) return at(FLOOR, 0);
      // The stage's light shining on the polish: a long flat band under each lamp.
      const lamp = Math.abs(((x + SLAB * 2) % (SLAB * 5)) - SLAB * 2.5) < SLAB * 0.6;
      if (lamp && y >= ROWS.shine && y < ROWS.shine + 6) return at(VIOLET, 0);
      return at(FLOOR, (y < 3 ? 2 : 3) + corner);
    }
    if (y < ROWS.front) return at(TAPE, y === ROWS.tape ? 1 : 0);
    return at(FLOOR, (y === ROWS.front ? 4 : 2) + corner);
  });
  return canvas;
}
