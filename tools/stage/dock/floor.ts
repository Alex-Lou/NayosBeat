/**
 * The floor (docs/art/decor-dock.md §2.3): the yard where the trucks back in, in bands that read
 * at a glance. The asphalt lot the fighters stand on, dark and gritty, its faded yellow bay lines
 * one every 64 world pixels (they measure the distances, as the street's slabs do), tar seams over
 * its cracks, a manhole cover, oil, tire marks; then, nearest, the concrete curb and a strip of
 * sidewalk. Both ends darken under the walls' shade. Flat tones, no band of dithering the whole
 * width (it would shimmer when the screen shakes). Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { ASPHALT, CONCRETE, HAZARD, STEEL, WET, WET_ASPHALT } from './palette.ts';

const SCALE = 2;
/** A bay's width: a yellow line between two, about the reach of a close fight. */
const BAY = 64 * SCALE;
/** How far from each end the ground darkens (24 world pixels). */
const CORNER = 24 * SCALE;
/** The lot's rows, then the gap under the curb's lip, the curb's top, the sidewalk. */
const ROWS = { lot: 62, curb: 64, sidewalk: 68 } as const;
/** The lane's edge line, a little in front of the far edge. */
const LINE = { y: 6, height: 3 } as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1.6 * (1 - end / CORNER) ** 1.5 : 0;
}

/**
 * Where the rain pools: long shallow puddles in the dips. Drawn in WET and WET_ASPHALT, which only
 * the rain's palette shows (palette.ts): dry, they are the ground itself.
 */
export function wetAt(seed: number, x: number, y: number): boolean {
  return noise(seed + 9, x, y * 3, 90) > 0.64;
}

/** The asphalt lot: its grain, its oil, its grit catching the lamps. */
function drawLot(canvas: Canvas, seed: number): void {
  const { width } = canvas;
  canvas.paint(0, 0, width, ROWS.lot, (x, y) => {
    if (noise(seed + 3, x, y, 2) > 0.86) return at(ASPHALT, 3);
    const grain = (noise(seed, x, y * 2, 30) - 0.5) * 0.6;
    const oil = noise(seed + 2, x, y * 3, 70) > 0.72 ? -0.7 : 0;
    const level = 1.7 + grain + oil + cornerOf(width, x) - (y / ROWS.lot) * 0.4;
    return tone(wetAt(seed, x, y) ? WET_ASPHALT : ASPHALT, level, x, y);
  });
}

/** Paint worn through where the wheels go: a mask of what is left. */
function paintLeft(seed: number, x: number, y: number): boolean {
  return noise(seed, x, y, 14) * 0.8 + noise(seed + 1, x, y, 3) * 0.2 > 0.4;
}

/** The yellow lines: the lane's edge along the yard, a bay line every BAY across it. */
function drawLines(canvas: Canvas, seed: number): void {
  canvas.paint(0, LINE.y, canvas.width, LINE.height, (x, y) =>
    paintLeft(seed, x, y) ? at(HAZARD, y === LINE.y ? 1 : 0) : undefined,
  );
  for (let x0 = BAY / 2; x0 < canvas.width; x0 += BAY) {
    canvas.paint(x0 - 1, LINE.y + LINE.height, 3, ROWS.lot - LINE.y - LINE.height - 2, (x, y) =>
      paintLeft(seed + 4, x, y) ? at(HAZARD, x === x0 - 1 ? 1 : 0) : undefined,
    );
  }
}

/** The tar poured over the cracks: thin black snakes. */
function drawSeams(canvas: Canvas, random: Random): void {
  for (let seam = 0; seam < 14; seam++) {
    let x = random.int(8, canvas.width - 8);
    let y = random.int(10, ROWS.lot - 6);
    for (let step = 0; step < random.int(6, 12); step++) {
      const nx = x + random.int(3, 8) * (random.chance(0.5) ? 1 : -1);
      const ny = Math.max(10, Math.min(y + random.int(-2, 3), ROWS.lot - 4));
      canvas.line(x, y, nx, ny, at(ASPHALT, 0), 2);
      x = nx;
      y = ny;
    }
  }
}

/** A manhole cover: its rim catching the lamps, its cast grid. */
function drawManhole(canvas: Canvas, cx: number, cy: number): void {
  canvas.paint(cx - 20, cy - 7, 40, 14, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / 20, (y + 0.5 - cy) / 7);
    if (d > 1) return undefined;
    if (d > 0.82) return at(STEEL, y < cy ? 3 : 1);
    return at(STEEL, (x + y * 3) % 6 < 2 ? 0 : 2);
  });
}

/**
 * The curb nearest the camera and the strip of sidewalk past it: the gap under the curb's lip in
 * shadow, its top lit, then slabs with their joints.
 */
function drawCurb(canvas: Canvas, seed: number): void {
  const { width, height } = canvas;
  canvas.paint(0, ROWS.lot, width, height - ROWS.lot, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.curb) return at(ASPHALT, 0);
    if (y === ROWS.curb) return at(CONCRETE, 5);
    if (y < ROWS.sidewalk) {
      const block = x % BAY === 0 ? -1.4 : 0;
      return tone(CONCRETE, 3.6 + block + corner, x, y);
    }
    if (y === ROWS.sidewalk) return at(CONCRETE, 1);
    const along = x % BAY;
    const joint = along === 0 || along === 1 ? -2 : along === 2 ? 0.8 : 0;
    const level = 2.2 + joint + corner + (noise(seed, x, y, 20) - 0.5) * 0.5;
    return tone(wetAt(seed, x, y) ? WET : CONCRETE, level, x, y);
  });
}

/** The drain grate by the curb: a steel frame, its slots dark. */
function drawGrate(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x, y, 40, 10, at(STEEL, 2));
  canvas.hline(x, y, 40, at(STEEL, 4));
  for (let px = x + 3; px < x + 38; px += 4) canvas.fill(px, y + 3, 2, 5, at(ASPHALT, 0));
}

/** Tire marks curving in from the gate, the rubber darker on the asphalt. */
function drawTireMarks(canvas: Canvas): void {
  for (const [from, to, y0] of [
    [120, 700, 22],
    [1300, 1820, 30],
  ] as const) {
    for (let x = from; x < to; x++) {
      const t = (x - from) / (to - from);
      const y = Math.round(y0 + Math.sin(t * Math.PI) * 8);
      if (noise(x, x, y, 6) > 0.35) canvas.set(x, y, at(ASPHALT, 0));
      if (noise(x + 3, x, y, 6) > 0.45) canvas.set(x, y + 14, at(ASPHALT, 0));
    }
  }
}

/** The floor, `width` × `height` image pixels, from the dock's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawLot(canvas, seed + 51);
  drawTireMarks(canvas);
  drawSeams(canvas, streamOf(seed, 'floor'));
  drawLines(canvas, seed + 53);
  drawManhole(canvas, width / 2 + 210, 34);
  drawCurb(canvas, seed + 57);
  drawGrate(canvas, width / 2 - 20, ROWS.lot - 11);
  return canvas;
}
