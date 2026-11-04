/**
 * The floor (docs/art/decor-dojo.md §2.3): the polished wood under the fighters' feet, in boards
 * that read at a glance. Its joints every 64 world pixels measure the distances; the knots and the
 * grain, the lanterns' reflections; the worn mark of the steps. Flat tones (docs/art/proprete.md):
 * no dither, no grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { LIGHT_POOL, SHADOW, WOOD_DARK, WOOD_LIGHT } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const POOLS = [400, 720, 1040] as const;

/** The boards: their joints, their grain, their knots. */
function drawBoards(canvas: Canvas, width: number, height: number): void {
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y < 4) return at(WOOD_LIGHT, 1);
    if (y === 4) return at(WOOD_LIGHT, 2);
    const board = Math.floor(x / SLAB);
    if (y % 6 === 0 && board % 2 === 0) return at(WOOD_LIGHT, 0);
    return at(WOOD_LIGHT, board % 2 === 0 ? 2 : 1);
  });
  for (let x = 0; x < width; x += SLAB) canvas.vline(x, 4, height - 4, at(WOOD_DARK, 1));
  for (const [x, y] of [
    [260, 26],
    [900, 60],
    [1500, 30],
    [1740, 56],
  ] as const) {
    canvas.ellipse(x, y, 4, 3, at(WOOD_DARK, 0));
  }
}

/** The lanterns' reflections, and the worn mark of the steps. */
function drawLight(canvas: Canvas): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 44, 46, 88, 16, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 24, 50, 48, 10, at(LIGHT_POOL, 2));
  }
  canvas.ellipse(720, 60, 70, 7, at(LIGHT_POOL, 1));
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawBoards(canvas, width, height);
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawLight(canvas);
  return canvas;
}
