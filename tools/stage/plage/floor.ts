/**
 * The floor (docs/art/decor-plage.md §2.3): the dry sand at the fighters' feet, in bands that read
 * at a glance. Long ripples the wind drew, in flat tones; a darker ripple every 64 world pixels
 * (they measure the distances); a few old footprints; the sand a step darker nearest. Flat tones
 * (docs/art/proprete.md). Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { SAND } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { back: 3, front: 56 } as const;
/** The ripples' rows, from the back to the front. */
const RIPPLES = [12, 24, 36, 48] as const;
/** The footprints: where each pair is, how far apart. */
const PRINTS = [180, 610, 1060, 1500] as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1 : 0;
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.back) return at(SAND, 2);
    if (y >= ROWS.front) return at(SAND, (y === ROWS.front ? 2 : 1) + corner);
    for (const row of RIPPLES) {
      const wave = row + Math.round(Math.sin(x / 41 + row) * 2);
      if (y === wave) return at(SAND, x % SLAB < SLAB / 2 && row === 36 ? 1 : 2);
    }
    return at(SAND, 4 - (y > 30 ? 1 : 0) + corner);
  });
  for (const [index, x] of PRINTS.entries()) {
    for (let step = 0; step < 3; step++) {
      const px = x + step * 26;
      const py = 18 + ((step + index) % 2) * 10;
      canvas.fill(px, py, 6, 3, at(SAND, 2));
    }
  }
  return canvas;
}
