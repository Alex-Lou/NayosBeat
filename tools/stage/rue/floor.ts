/**
 * The floor (docs/art/decor-rue.md §3.3): the sidewalk the fighters stand on, its slabs measuring
 * the distances (a clear joint every 64 world pixels, a faint score every 32), the granite curb,
 * the gutter. Both ends darken under the corners. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from './canvas.ts';
import { ASPHALT, CONCRETE, STONE } from './palette.ts';
import { noise, streamOf, type Random } from './random.ts';

/** Image pixels per world pixel: the floor's measures are counted in world pixels. */
const SCALE = 2;
/** A slab's width: a clear joint between two, about the reach of a close fight. */
export const SLAB = 64 * SCALE;
/** The score halfway across each slab. */
const SCORE = 32 * SCALE;
/** Rows of the slabs, then the curb's top and face, then the gutter. */
const ROWS = { slabs: 56, curbTop: 62, curbFace: 70 } as const;
/** How far from each end the ground darkens, under the corner's shade (24 world pixels). */
const CORNER = 24 * SCALE;

/**
 * The slabs' step at x, y: the sidewalk's tone where the middle layer leaves it, stains, and the
 * corners' shade. Flat across, so no band of dithering runs the whole width (it would shimmer when
 * the screen shakes).
 */
function slabLevel(width: number, x: number, y: number, seed: number): number {
  const stains = (noise(seed, x, y * 2, 40) - 0.5) * 0.5 + (noise(seed + 1, x, y, 9) - 0.5) * 0.25;
  const end = Math.min(x, width - 1 - x);
  const corner = end < CORNER ? -2 * (1 - end / CORNER) ** 1.5 : 0;
  return 2.9 + stains + corner;
}

function drawSlabs(canvas: Canvas, seed: number): void {
  const { width } = canvas;
  canvas.paint(0, 0, width, ROWS.slabs, (x, y) => {
    let level = slabLevel(width, x, y, seed);
    const along = x % SLAB;
    // The joint: a dark groove, its far lip catching the light.
    if (along === 0 || along === 1) level -= 2.2;
    else if (along === 2) level += 0.9;
    else if (x % SCORE === 0 && y > 3 && y < ROWS.slabs - 3) level -= 0.8;
    return tone(CONCRETE, level, x, y);
  });
}

/** A few hairline cracks and dark spots of old gum: the sidewalk is used, its joints still lead. */
function drawWear(canvas: Canvas, random: Random): void {
  for (let crack = 0; crack < 9; crack++) {
    let x = random.int(8, canvas.width - 8);
    let y = random.int(6, ROWS.slabs - 10);
    for (let step = 0; step < random.int(5, 10); step++) {
      const nx = x + random.int(2, 5) * (random.chance(0.5) ? 1 : -1);
      const ny = Math.min(y + random.int(0, 3), ROWS.slabs - 3);
      canvas.line(x, y, nx, ny, at(CONCRETE, 1));
      x = nx;
      y = ny;
    }
  }
  for (let spot = 0; spot < 60; spot++) {
    const x = random.int(2, canvas.width - 4);
    const y = random.int(4, ROWS.slabs - 4);
    canvas.fill(x, y, 2, 1, at(CONCRETE, 2));
  }
}

/** The granite curb: its lit top edge, its face in shade, then the gutter and the dark asphalt. */
function drawCurb(canvas: Canvas, seed: number): void {
  const { width } = canvas;
  canvas.paint(0, ROWS.slabs, width, canvas.height - ROWS.slabs, (x, y) => {
    const end = Math.min(x, width - 1 - x);
    const corner = end < CORNER ? -1.5 * (1 - end / CORNER) : 0;
    if (y === ROWS.slabs) return at(CONCRETE, 1);
    if (y < ROWS.curbTop) {
      const block = x % (48 * SCALE) === 0 ? -1.4 : 0;
      return tone(STONE, (y === ROWS.slabs + 1 ? 3 : 2.1) + block + corner, x, y);
    }
    if (y < ROWS.curbFace) return tone(STONE, 1.4 - (y - ROWS.curbTop) * 0.12 + corner, x, y);
    const grit = noise(seed, x, y, 5) > 0.72 ? 0.8 : 0;
    return tone(ASPHALT, 1.2 - (y - ROWS.curbFace) * 0.08 + grit + corner, x, y);
  });
}

/** The floor, `width` × `height` image pixels, from the street's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSlabs(canvas, seed + 51);
  drawWear(canvas, streamOf(seed, 'floor'));
  drawCurb(canvas, seed + 61);
  return canvas;
}
