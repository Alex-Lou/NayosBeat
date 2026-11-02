/**
 * The floor (docs/art/decor-dock.md §2.3): the yard's concrete apron, where the trucks back in. Its
 * slabs measure the distances (a joint every 64 world pixels, as the street's); oil stains where
 * the trucks stand, a faded yellow line, a drain grate, tire marks, cracks. Both ends darken under
 * the walls' shade. Flat across: no band of dithering runs the whole width (it would shimmer when
 * the screen shakes). Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { ASPHALT, CONCRETE, HAZARD, STEEL } from './palette.ts';

const SCALE = 2;
/** A slab's width: a clear joint between two, about the reach of a close fight. */
const SLAB = 64 * SCALE;
/** How far from each end the ground darkens (24 world pixels). */
const CORNER = 24 * SCALE;
/** The yellow line along the yard, a little in front of the far edge. */
const LINE = { y: 10, height: 3 } as const;

function slabLevel(width: number, x: number, y: number, seed: number): number {
  const stains = (noise(seed, x, y * 2, 44) - 0.5) * 0.6 + (noise(seed + 1, x, y, 9) - 0.5) * 0.3;
  const oil = noise(seed + 2, x, y * 3, 70) > 0.72 ? -0.6 : 0;
  const end = Math.min(x, width - 1 - x);
  const corner = end < CORNER ? -2 * (1 - end / CORNER) ** 1.5 : 0;
  // Nearer rows a touch darker: the yard falls into the shade under the fighters.
  return 2.7 + stains + oil + corner - (y / 80) * 0.5;
}

function drawSlabs(canvas: Canvas, seed: number): void {
  const { width, height } = canvas;
  canvas.paint(0, 0, width, height, (x, y) => {
    let level = slabLevel(width, x, y, seed);
    const along = x % SLAB;
    // The joint: a dark groove, its far lip catching the light; a joint along the yard too.
    if (along === 0 || along === 1) level -= 2;
    else if (along === 2) level += 0.8;
    if (y === 44 || y === 45) level -= 1.4;
    else if (y === 46) level += 0.6;
    return tone(CONCRETE, level, x, y);
  });
}

/** The yellow line: painted long ago, worn through where the wheels cross it. */
function drawLine(canvas: Canvas, seed: number): void {
  canvas.paint(0, LINE.y, canvas.width, LINE.height, (x, y) => {
    const worn = noise(seed, x, y, 18) * 0.8 + noise(seed + 1, x, y, 3) * 0.2;
    if (worn < 0.42) return undefined;
    return at(HAZARD, worn > 0.62 && y === LINE.y ? 1 : 0);
  });
}

/** The drain grate in the middle of the yard: a steel frame, its slots dark. */
function drawGrate(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x, y, 40, 12, at(STEEL, 2));
  canvas.hline(x, y, 40, at(STEEL, 4));
  for (let px = x + 3; px < x + 38; px += 4) canvas.fill(px, y + 3, 2, 7, at(ASPHALT, 0));
}

/** Tire marks curving in from the gate, hairline cracks, grit. */
function drawWear(canvas: Canvas, random: Random): void {
  for (const [from, to, y0] of [
    [120, 700, 22],
    [1300, 1820, 30],
  ] as const) {
    for (let x = from; x < to; x++) {
      const t = (x - from) / (to - from);
      const y = Math.round(y0 + Math.sin(t * Math.PI) * 8);
      if (noise(x, x, y, 6) > 0.35) canvas.set(x, y, at(CONCRETE, 1));
      if (noise(x + 3, x, y, 6) > 0.45) canvas.set(x, y + 14, at(CONCRETE, 1));
    }
  }
  for (let crack = 0; crack < 10; crack++) {
    let x = random.int(8, canvas.width - 8);
    let y = random.int(16, canvas.height - 10);
    for (let step = 0; step < random.int(5, 10); step++) {
      const nx = x + random.int(2, 6) * (random.chance(0.5) ? 1 : -1);
      const ny = Math.min(y + random.int(0, 3), canvas.height - 3);
      canvas.line(x, y, nx, ny, at(CONCRETE, 1));
      x = nx;
      y = ny;
    }
  }
  for (let spot = 0; spot < 70; spot++) {
    canvas.fill(
      random.int(2, canvas.width - 4),
      random.int(4, canvas.height - 4),
      random.int(1, 3),
      1,
      at(CONCRETE, random.chance(0.5) ? 1 : 5),
    );
  }
}

/** The floor, `width` × `height` image pixels, from the dock's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSlabs(canvas, seed + 51);
  drawLine(canvas, seed + 53);
  drawGrate(canvas, width / 2 - 20, 56);
  drawWear(canvas, streamOf(seed, 'floor'));
  return canvas;
}
