/**
 * The floor (docs/art/decor-dune-dusk.md §2.3): the sand under the fighters' feet, in bands that
 * read at a glance. Its ripples every 64 world pixels measure the distances; the wind's traces,
 * the tufts, the stones; the light the dusk lays. Flat tones (docs/art/proprete.md): no dither, no
 * grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { GRASS, LIGHT_POOL, SAND, SHADOW, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const RIPPLES = [14, 28, 42] as const;
const POOLS = [300, 640, 980, 1180] as const;

/** The sand: flat bands, the wind's ripples, its traces. */
function drawSand(canvas: Canvas, width: number, height: number): void {
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y < 4) return at(SAND, 1);
    if (y === 4) return at(SAND, 3);
    for (const row of RIPPLES) {
      const wave = row + Math.round(Math.sin(x / 41 + row) * 2);
      if (y === wave) return at(SAND, 1);
    }
    return at(SAND, 3 - (y > 30 ? 1 : 0));
  });
  for (let x = 0; x < width; x += SLAB) canvas.vline(x, 4, height - 4, at(SAND, 1));
}

/** The light the dusk lays, the tufts, the stones. */
function drawDetails(canvas: Canvas): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 56, 46, 112, 20, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 32, 50, 64, 12, at(LIGHT_POOL, 2));
  }
  for (const [x, y] of [
    [220, 30],
    [760, 62],
    [1320, 26],
    [1680, 58],
  ] as const) {
    canvas.vline(x, y - 9, 9, at(GRASS, 0));
    canvas.vline(x - 4, y - 7, 7, at(GRASS, 1));
    canvas.vline(x + 4, y - 6, 6, at(GRASS, 0));
  }
  for (const [x, y, w, h] of [
    [480, 60, 14, 9],
    [1120, 54, 18, 10],
    [1560, 62, 12, 8],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSand(canvas, width, height);
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawDetails(canvas);
  return canvas;
}
