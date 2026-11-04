/**
 * The floor (docs/art/decor-forest-dance.md §2.3): the forest floor under the fighters' feet —
 * earth, moss, the dirt path and the grass of the clearing, not a stone pavement. The marks every
 * 64 world pixels measure the distances; the dead leaves, the stones and the roots; the warm light
 * of the hut. Flat tones where the fighters stand (docs/art/proprete.md). Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  BARK,
  DEAD_LEAF,
  EARTH,
  GLOW,
  GRASS,
  LEAF,
  LIGHT_POOL,
  MOSS,
  SHADOW,
  STONE,
} from './palette.ts';

const SEED = 733;
const POOLS = [260, 620, 900, 1220, 1540, 1800] as const;

/** The earth: moss banks, the dirt path, the grass tufts and the humus. */
function drawEarth(canvas: Canvas, width: number, height: number): void {
  canvas.fill(0, 0, width, height, at(EARTH, 2));
  // The moss and the leaf litter, in irregular banks along the back.
  for (let x = -30; x < width + 30; x += 68) {
    const y = 5 + noise(SEED, x, 0, 20);
    canvas.ellipse(x, y, 86, 17, at(MOSS, 1));
    canvas.ellipse(x + 12, y + 5, 48, 10, at(LEAF, 1));
  }
  // The dirt path, a soft strip through the clearing.
  canvas.paint(0, 14, width, height - 14, (x, y) => {
    const center = width / 2 + Math.sin(x / 250) * 74;
    const half = 150 + (y - 14) * 3;
    if (Math.abs(x - center) > half) return undefined;
    return at(EARTH, Math.floor(x / 16) % 3 === 0 ? 3 : 1);
  });
  // The grass tufts along the front and the edges.
  for (let x = 18; x < width; x += 46) {
    const y = 6 + noise(SEED + 1, x, 0, 22);
    for (const [dx, len] of [
      [-5, 12],
      [0, 16],
      [5, 10],
    ] as const) {
      canvas.line(x + dx, y + 8, x + dx * 2, y + 8 - len, at(GRASS, dx === 0 ? 1 : 0), 2);
    }
  }
  // The darker humus and the moss at the very front.
  canvas.fill(0, height - 8, width, 8, at(MOSS, 0));
}

/** The warm light of the hut, the dead leaves and the small stones. */
function drawLightAndLeaves(canvas: Canvas): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 62, 42, 124, 18, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 30, 46, 58, 8, at(GLOW, 0));
  }
  for (const [x, y] of [
    [140, 24],
    [240, 58],
    [390, 32],
    [540, 64],
    [720, 26],
    [880, 62],
    [1040, 28],
    [1220, 60],
    [1380, 34],
    [1540, 62],
    [1700, 26],
    [1840, 54],
  ] as const) {
    canvas.fill(x, y, 6, 4, at(DEAD_LEAF, (x + y) % 2 === 0 ? 2 : 1));
    canvas.set(x, y, at(DEAD_LEAF, 0));
    canvas.set(x + 3, y + 1, at(DEAD_LEAF, 1));
  }
}

/** The stones, the roots, the darker edges. */
function drawDetails(canvas: Canvas, width: number, height: number): void {
  for (const [x, y, w, h] of [
    [90, 48, 18, 10],
    [width - 110, 42, 22, 12],
    [480, 64, 14, 8],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
  canvas.line(140, height - 6, 240, height - 12, at(BARK, 1), 3);
  canvas.line(1480, height - 8, 1560, height - 14, at(BARK, 1), 3);
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawEarth(canvas, width, height);
  canvas.fill(0, 0, 54, height, at(SHADOW, 0));
  canvas.fill(width - 54, 0, 54, height, at(SHADOW, 0));
  drawLightAndLeaves(canvas);
  drawDetails(canvas, width, height);
  return canvas;
}
