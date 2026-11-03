/**
 * The floor (docs/art/decor-night-market.md §2.3): the market's stone under the fighters' feet, in
 * bands that read at a glance. Its joints every 64 world pixels measure the distances; flagstones
 * of two tones, cracks, a drain, a manhole, a few scraps; the warm pools the lanterns lay, their
 * puddles and their broken reflections; the shade of the stalls at the ends. Flat tones
 * (docs/art/proprete.md): no dither, no grain. Image pixels.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { GOLD_DULL, LIGHT_POOL, PAPER, PUDDLE, SHADOW, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const JOINT = 38;
const POOLS = [240, 760, 1180, 1720] as const;
const PUDDLES = [
  { x: 420, y: 56, width: 150, height: 12 },
  { x: 900, y: 64, width: 190, height: 14 },
  { x: 1460, y: 52, width: 160, height: 12 },
] as const;
const SCRAPS = [
  { x: 330, y: 30, width: 6, height: 3 },
  { x: 690, y: 68, width: 4, height: 2 },
  { x: 1120, y: 22, width: 5, height: 3 },
  { x: 1650, y: 58, width: 7, height: 2 },
] as const;

/** A crack: a thin, continuous polyline, never a lone pixel. */
function drawCrack(canvas: Canvas, points: readonly (readonly [number, number])[]): void {
  for (let index = 0; index + 1 < points.length; index++) {
    const [x0, y0] = points[index] ?? [0, 0];
    const [x1, y1] = points[index + 1] ?? [x0, y0];
    canvas.line(x0, y0, x1, y1, at(STONE, 0));
  }
}

/** The flagstones: two tones in bands, their joints, their cracks. */
function drawStones(canvas: Canvas, width: number, height: number): void {
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
  drawCrack(canvas, [
    [150, height - 6],
    [162, height - 14],
    [158, height - 24],
    [170, height - 30],
  ]);
  drawCrack(canvas, [
    [980, 8],
    [992, 16],
    [988, 24],
    [1002, 30],
  ]);
  drawCrack(canvas, [
    [1290, height - 4],
    [1300, height - 12],
    [1294, height - 22],
  ]);
}

/** The warm pools the lanterns lay, and the puddles that catch them. */
function drawLight(canvas: Canvas): void {
  for (const x of POOLS) {
    canvas.ellipse(x - 90, 44, 180, 24, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 62, 48, 124, 18, at(LIGHT_POOL, 2));
    canvas.ellipse(x - 34, 52, 68, 12, at(LIGHT_POOL, 3));
    canvas.hline(x - 16, 58, 32, at(LIGHT_POOL, 3));
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
    // The light broken on the water: short, continuous dashes.
    for (let dash = 0; dash < 5; dash++) {
      const x = puddle.x + 20 + dash * 22;
      canvas.hline(x, puddle.y + 4 + (dash % 2) * 3, 8 + (dash % 3) * 3, at(LIGHT_POOL, 2));
    }
  }
}

/** The drain grate and the manhole: flat, cut by continuous lines. */
function drawIron(canvas: Canvas): void {
  const grate = { x: 604, y: 48, width: 44, height: 18 };
  canvas.fill(grate.x, grate.y, grate.width, grate.height, at(STONE, 0));
  canvas.hline(grate.x, grate.y, grate.width, at(STONE, 2));
  for (let slot = 0; slot < 6; slot++) {
    canvas.vline(grate.x + 4 + slot * 7, grate.y + 3, grate.height - 6, at(STONE, 2));
  }
  const manhole = { x: 1558, y: 46, width: 34, height: 20 };
  canvas.ellipse(manhole.x, manhole.y, manhole.width, manhole.height, at(STONE, 1));
  canvas.ellipse(manhole.x + 3, manhole.y + 3, manhole.width - 6, manhole.height - 6, at(STONE, 2));
  for (let bar = 0; bar < 3; bar++) {
    canvas.hline(manhole.x + 8, manhole.y + 7 + bar * 4, manhole.width - 16, at(STONE, 0));
  }
}

/** The floor, `width` × `height` image pixels. */
export function drawFloor(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  drawStones(canvas, width, height);
  // The shade the stalls lay at the ends, and the near edge a step darker.
  canvas.fill(0, 0, 70, height, at(SHADOW, 0));
  canvas.fill(width - 70, 0, 70, height, at(SHADOW, 0));
  canvas.fill(0, height - 5, width, 5, at(SHADOW, 0));
  drawLight(canvas);
  drawIron(canvas);
  for (const scrap of SCRAPS) {
    canvas.fill(scrap.x, scrap.y, scrap.width, scrap.height, at(PAPER, 1));
    canvas.hline(scrap.x, scrap.y, scrap.width, at(PAPER, 2));
  }
  // A few old footprints, and a chalk mark by the drain.
  for (const [x, y] of [
    [480, 62],
    [492, 68],
    [1330, 58],
    [1342, 64],
  ] as const) {
    canvas.ellipse(x, y, 7, 3, at(SHADOW, 1));
  }
  canvas.hline(700, 30, 26, at(GOLD_DULL, 1));
  canvas.vline(700, 30, 8, at(GOLD_DULL, 1));
  return canvas;
}
