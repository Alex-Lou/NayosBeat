/**
 * The floor (docs/art/decor-gym.md §2.3): the gym's old boards, oiled dark, the fighters standing
 * on them. The boards run along the fight, their ends staggered; a seam every 64 world pixels
 * measures the distances, as the street's slabs do. Worn pale where feet go, tape marks, resin.
 * Both ends darken under the piers. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { TAPE, WOOD } from './palette.ts';

const SCALE = 2;
/** A seam across every board: the reach of a close fight, as the street's slab. */
const SEAM = 64 * SCALE;
/** How far from each end the floor darkens, under the piers' shade. */
const CORNER = 24 * SCALE;

/** The boards' rows, top (far) to bottom (near), each taller than the last. */
function rowsOf(height: number): { top: number; height: number }[] {
  const rows: { top: number; height: number }[] = [];
  let top = 0;
  let size = 7;
  while (top < height) {
    rows.push({ top, height: size });
    top += size;
    size += 1;
  }
  return rows;
}

function drawBoards(canvas: Canvas, seed: number): void {
  const { width, height } = canvas;
  const rows = rowsOf(height);
  rows.forEach(({ top, height: tall }, index) => {
    const offset = (index * 37) % 61;
    canvas.paint(0, top, width, tall, (x, y) => {
      const along = (x + offset * SCALE) % SEAM;
      const end = Math.min(x, width - 1 - x);
      const corner = end < CORNER ? -2.2 * (1 - end / CORNER) ** 1.5 : 0;
      // The middle of the floor, worn by feet: paler, less oiled.
      const worn = Math.max(0, 1 - Math.abs(x - width / 2) / (width * 0.35)) * 0.6;
      const grain = (noise(seed + index, x, y * 4, 26) - 0.5) * 0.9;
      let level = 2.6 + worn + grain + corner - (index % 3) * 0.25;
      if (y === top) level -= 1.6;
      else if (y === top + 1) level += 0.5;
      if (along === 0) level -= 1.6;
      return tone(WOOD, level, x, y);
    });
  });
}

/** Tape crosses where the coach puts the feet, resin and scuffs. */
function drawMarks(canvas: Canvas, random: Random): void {
  const { width } = canvas;
  for (const x of [width / 2 - 260, width / 2 + 260]) {
    canvas.fill(x - 10, 34, 20, 3, at(TAPE, 0));
    canvas.fill(x - 1, 26, 3, 19, at(TAPE, 0));
  }
  for (let spot = 0; spot < 90; spot++) {
    const x = random.int(40, width - 40);
    const y = random.int(4, canvas.height - 4);
    canvas.fill(x, y, random.int(2, 6), 1, at(WOOD, random.chance(0.6) ? 1 : 5));
  }
}

/** The floor, `width` × `height` image pixels, from the gym's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawBoards(canvas, seed + 51);
  drawMarks(canvas, streamOf(seed, 'floor'));
  return canvas;
}
