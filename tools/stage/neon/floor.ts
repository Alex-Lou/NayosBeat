/**
 * The floor (docs/art/decor-neon-dusk.md §2.3): the wet asphalt under the fighters' feet, in
 * bands that read at a glance. Its joints every 64 world pixels measure the distances; the neons'
 * reflections in short dashes, orange near the noodle stand, green near the machines; puddles, a
 * drain plate, a few papers; the shade of the walls at the ends. Flat tones (docs/art/proprete.md):
 * no dither, no grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { GREEN_POOL, LIGHT_POOL, PAPER, PUDDLE, SHADOW, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const JOINT = 38;
/** Where the neon light falls, and in what tone. */
const POOLS = [
  { x: 300, ramp: LIGHT_POOL },
  { x: 640, ramp: LIGHT_POOL },
  { x: 1180, ramp: GREEN_POOL },
] as const;
const PUDDLES = [
  { x: 420, y: 56, width: 150, height: 12 },
  { x: 900, y: 64, width: 190, height: 14 },
  { x: 1460, y: 52, width: 160, height: 12 },
] as const;

/** The asphalt slabs: two tones, their joints, a few cracks. */
function drawSlabs(canvas: Canvas, width: number, height: number): void {
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y < 4) return at(STONE, 1);
    if (y === 4) return at(STONE, 3);
    if (y % JOINT === 0) return at(STONE, 1);
    const slab = Math.floor(x / SLAB) + Math.floor(y / JOINT);
    return at(STONE, slab % 2 === 0 ? 3 : 2);
  });
  for (let x = 0; x < width; x += SLAB) canvas.vline(x, 4, height - 4, at(STONE, 1));
  for (let x = SLAB; x < width; x += SLAB) {
    canvas.fill(x + 1, 6, 7, 3, at(STONE, 2));
    canvas.fill(x - 8, height - 10, 7, 3, at(STONE, 2));
  }
}

/** The neons' light on the wet asphalt, and the puddles that catch it. */
function drawLight(canvas: Canvas): void {
  for (const { x, ramp } of POOLS) {
    canvas.ellipse(x - 80, 44, 160, 22, at(ramp, 1));
    canvas.ellipse(x - 52, 48, 104, 16, at(ramp, 2));
    canvas.hline(x - 20, 56, 40, at(ramp, 2));
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
    for (let dash = 0; dash < 5; dash++) {
      const x = puddle.x + 20 + dash * 22;
      canvas.hline(x, puddle.y + 4 + (dash % 2) * 3, 8 + (dash % 3) * 3, at(LIGHT_POOL, 2));
    }
  }
}

/** The drain plate and the papers. */
function drawDetails(canvas: Canvas): void {
  const grate = { x: 604, y: 48, width: 44, height: 18 };
  canvas.fill(grate.x, grate.y, grate.width, grate.height, at(STONE, 0));
  for (let slot = 0; slot < 6; slot++) {
    canvas.vline(grate.x + 4 + slot * 7, grate.y + 3, grate.height - 6, at(STONE, 2));
  }
  for (const [x, y, w, h] of [
    [330, 30, 6, 3],
    [1120, 22, 5, 3],
    [1650, 58, 7, 2],
  ] as const) {
    canvas.fill(x, y, w, h, at(PAPER, 1));
    canvas.hline(x, y, w, at(PAPER, 2));
  }
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSlabs(canvas, width, height);
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawLight(canvas);
  drawDetails(canvas);
  return canvas;
}
