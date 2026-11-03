/**
 * The floor (docs/art/decor-bal.md §2.3): the parquet at the fighters' feet, in bands that read at a
 * glance. Rows of honey boards, their joints staggered, a long joint every 64 world pixels (they
 * measure the distances); the chandeliers' light in long flat shines; the gold inlay at the front of
 * the dance floor, then the darker boards nearest. Flat tones (docs/art/proprete.md). Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { GOLD, PARQUET } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const CORNER = 24 * SCALE;
const BOARD = 8;
const ROWS = { shine: 16, inlay: 48, front: 54 } as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1 : 0;
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.inlay) {
      const row = Math.floor(y / BOARD);
      if (y % BOARD === 0 || x % SLAB === 0 || (x + row * 48) % (SLAB / 2) === 0) {
        return at(PARQUET, 1);
      }
      // The chandeliers' light shining on the varnish: a long flat band now and then.
      const lamp = Math.abs(((x + SLAB * 2) % (SLAB * 5)) - SLAB * 2.5) < SLAB * 0.7;
      if (lamp && y >= ROWS.shine && y < ROWS.shine + BOARD) return at(PARQUET, 4);
      return at(PARQUET, (row % 2 === 0 ? 3 : 2) + corner);
    }
    if (y < ROWS.front)
      return y === ROWS.inlay + 2 || y === ROWS.inlay + 3 ? at(GOLD, 1) : at(PARQUET, 0);
    return at(PARQUET, (y === ROWS.front ? 3 : 1) + corner);
  });
  return canvas;
}
