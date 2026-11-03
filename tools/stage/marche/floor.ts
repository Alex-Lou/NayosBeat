/**
 * The floor (docs/art/decor-night-market.md §2.3): the market's stone under the fighters' feet, in
 * bands that read at a glance. Its joints every 64 world pixels measure the distances; a few darker
 * slabs and dull puddles; nothing bright, so the floor stays under the flashes' band. Flat tones
 * (docs/art/proprete.md). Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { PUDDLE, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const JOINT = 40;
const PUDDLES = [
  { x: 260, y: 52, width: 190, height: 16 },
  { x: 830, y: 60, width: 150, height: 12 },
  { x: 1330, y: 48, width: 210, height: 18 },
  { x: 1740, y: 62, width: 130, height: 12 },
] as const;

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y < 4) return at(STONE, 1);
    if (y === 4) return at(STONE, 3);
    if (y % JOINT === 0) return at(STONE, 2);
    return at(STONE, 3 - (y > 24 ? 1 : 0));
  });
  for (let x = 0; x < width; x += SLAB) canvas.vline(x, 4, height - 4, at(STONE, 1));
  // The slabs' worn corners, a step darker, at the joints only.
  for (let x = SLAB; x < width; x += SLAB) {
    canvas.fill(x + 1, 6, 6, 3, at(STONE, 2));
    canvas.fill(x - 7, height - 10, 6, 3, at(STONE, 2));
  }
  for (const puddle of PUDDLES) {
    canvas.ellipse(puddle.x, puddle.y, puddle.width, puddle.height, at(PUDDLE, 1));
    canvas.ellipse(
      puddle.x + 8,
      puddle.y + 3,
      puddle.width - 16,
      Math.max(4, puddle.height - 6),
      at(PUDDLE, 0),
    );
  }
  return canvas;
}
