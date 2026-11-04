/**
 * The floor (docs/art/decor-firefly-forest.md §2.3): the earth and the moss under the fighters'
 * feet, in bands that read at a glance. Its marks every 64 world pixels measure the distances;
 * the roots, the stones, the mushrooms; the moon's pale light. Flat tones (docs/art/proprete.md):
 * no dither, no grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { BARK, EARTH, LIGHT_POOL, MOSS, SHROOM, SHADOW, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const JOINT = 38;
const POOLS = [300, 640, 980, 1180] as const;

/** The earth: two tones, its marks, the moss at the back. */
function drawEarth(canvas: Canvas, width: number, height: number): void {
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y < 4) return at(EARTH, 1);
    if (y === 4) return at(EARTH, 3);
    if (y % JOINT === 0) return at(EARTH, 1);
    const slab = Math.floor(x / SLAB) + Math.floor(y / JOINT);
    return at(EARTH, slab % 2 === 0 ? 3 : 2);
  });
  canvas.fill(0, 0, width, 3, at(MOSS, 0));
  for (let x = 0; x < width; x += SLAB) canvas.vline(x, 4, height - 4, at(EARTH, 1));
}

/** The moon's pale light, the roots, the stones, the small mushrooms. */
function drawDetails(canvas: Canvas, width: number, height: number): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 50, 46, 100, 18, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 28, 50, 56, 10, at(LIGHT_POOL, 2));
  }
  canvas.line(140, height - 6, 240, height - 14, at(BARK, 0), 4);
  canvas.line(1480, height - 8, 1560, height - 16, at(BARK, 0), 4);
  for (const [x, y, w, h] of [
    [420, 60, 16, 10],
    [1120, 54, 18, 10],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
  for (const x of [900, 1400] as const) {
    canvas.fill(x - 3, 46, 3, 6, at(BARK, 1));
    canvas.ellipse(x - 7, 40, 11, 6, at(SHROOM, 1));
  }
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawEarth(canvas, width, height);
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawDetails(canvas, width, height);
  return canvas;
}
