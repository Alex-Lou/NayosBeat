/**
 * The floor (docs/art/decor-forest-dance.md §2.3): the earth of the path under the fighters' feet,
 * in bands that read at a glance. Its marks every 64 world pixels measure the distances; the dead
 * leaves scattered, the stones and the roots; the light the dawn lays between the trees. Flat tones
 * (docs/art/proprete.md): no dither, no grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { DEAD_LEAF, EARTH, LIGHT_POOL, MOSS, SHADOW, STONE } from './palette.ts';

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

/** The light the dawn lays between the trees, and the dead leaves. */
function drawLightAndLeaves(canvas: Canvas): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 64, 44, 128, 20, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 36, 48, 72, 12, at(LIGHT_POOL, 2));
  }
  for (const [x, y] of [
    [160, 26],
    [260, 58],
    [420, 34],
    [560, 64],
    [740, 28],
    [900, 62],
    [1060, 30],
    [1240, 60],
    [1400, 36],
    [1560, 64],
    [1700, 28],
    [1840, 56],
  ] as const) {
    canvas.fill(x, y, 6, 4, at(DEAD_LEAF, (x + y) % 2 === 0 ? 2 : 1));
    canvas.set(x, y, at(DEAD_LEAF, 0));
    canvas.set(x + 3, y + 1, at(DEAD_LEAF, 1));
  }
}

/** The stones and the roots at the edges. */
function drawDetails(canvas: Canvas, width: number, height: number): void {
  for (const [x, y, w, h] of [
    [90, 50, 20, 12],
    [width - 110, 44, 24, 14],
    [480, 66, 16, 10],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
  canvas.line(140, height - 6, 240, height - 14, at(EARTH, 1), 4);
  canvas.line(1480, height - 8, 1560, height - 16, at(EARTH, 1), 4);
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawEarth(canvas, width, height);
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawLightAndLeaves(canvas);
  drawDetails(canvas, width, height);
  return canvas;
}
