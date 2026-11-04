/**
 * The floor (docs/art/decor-dock.md §2.3): the yard where the trucks back in, blending seamlessly
 * into the middle layer's apron and asphalt (docs/art/proprete.md). Flat tones, organic top transition,
 * perspective bay markings and curb.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import {
  ASPHALT,
  CONCRETE,
  CONCRETE_VIOLET,
  HAZARD,
  PAPER,
  POSTER_RED,
  SODIUM,
  STEEL,
  WET,
  WET_ASPHALT,
} from './palette.ts';

const SCALE = 2;
const BAY = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { lot: 62, curb: 64, sidewalk: 68 } as const;
const BAY_TOP = 12;

function cornerStep(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER / 2 ? -1 : 0;
}

export function wetAt(seed: number, x: number, y: number): boolean {
  return noise(seed + 9, Math.floor(x / 8), Math.floor(y / 4), 12) > 0.63;
}

function topEdgeAt(seed: number, x: number): number {
  const wave = Math.sin(x / 28) * 2.2 + Math.cos(x / 11 + seed) * 1.4;
  return Math.max(0, Math.min(6, Math.round(3 + wave)));
}

function drawLot(canvas: Canvas, seed: number): void {
  const { width } = canvas;
  canvas.paint(0, 0, width, ROWS.lot, (x, y) => {
    if (y < topEdgeAt(seed, x)) return 0;
    const corner = cornerStep(width, x);
    const oil = y > 10 && noise(seed + 2, Math.floor(x / 12), Math.floor(y / 6), 8) > 0.76 ? -1 : 0;
    const patch =
      y > 6 && y < 38 && noise(seed + 5, Math.floor(x / 18), Math.floor(y / 8), 6) > 0.78 ? 1 : 0;
    const step = Math.max(0, Math.min(ASPHALT.length - 1, 1 + oil + patch + corner));
    const ramp = wetAt(seed, x, y) ? WET_ASPHALT : ASPHALT;
    return at(ramp, step);
  });
}

function paintLeft(seed: number, x: number, y: number): boolean {
  return noise(seed, Math.floor(x / 6), Math.floor(y / 4), 4) > 0.34;
}

function drawLines(canvas: Canvas, seed: number): void {
  const center = canvas.width / 2;
  for (let x0 = BAY / 2; x0 < canvas.width; x0 += BAY) {
    for (let dx = -9; dx <= 9; dx++) {
      if (paintLeft(seed, x0 + dx, BAY_TOP)) {
        canvas.set(x0 + dx, BAY_TOP, at(HAZARD, 1));
        canvas.set(x0 + dx, BAY_TOP + 1, at(HAZARD, 0));
      }
    }
    const startY = BAY_TOP + 2;
    const endY = ROWS.lot - 3;
    for (let y = startY; y < endY; y++) {
      if (!paintLeft(seed + 4, x0, y)) continue;
      const dy = y - startY;
      const slant = Math.round(((x0 - center) * dy) / 1400);
      const lx = x0 + slant;
      canvas.set(lx - 1, y, at(HAZARD, 1));
      canvas.set(lx, y, at(HAZARD, 0));
      canvas.set(lx + 1, y, at(HAZARD, 0));
    }
  }
}

function drawSeams(canvas: Canvas, random: Random): void {
  for (let seam = 0; seam < 10; seam++) {
    let x = random.int(16, canvas.width - 16);
    let y = random.int(8, ROWS.lot - 8);
    for (let step = 0; step < random.int(4, 8); step++) {
      const nx = x + random.int(6, 14) * (random.chance(0.5) ? 1 : -1);
      const ny = Math.max(8, Math.min(y + random.int(-2, 4), ROWS.lot - 4));
      canvas.line(x, y, nx, ny, at(ASPHALT, 0), 2);
      x = nx;
      y = ny;
    }
  }
}

function drawManhole(canvas: Canvas, cx: number, cy: number): void {
  canvas.ellipse(cx - 21, cy - 7, 42, 15, at(ASPHALT, 0));
  canvas.ellipse(cx - 20, cy - 7, 40, 14, at(STEEL, 2));
  canvas.ellipse(cx - 17, cy - 5, 34, 10, at(STEEL, 1));
  canvas.hline(cx - 14, cy - 6, 28, at(STEEL, 4));
  for (let row = -2; row <= 2; row += 2) {
    canvas.hline(cx - 12, cy + row, 24, at(STEEL, 2));
  }
}

function drawCurb(canvas: Canvas, seed: number): void {
  const { width, height } = canvas;
  const center = width / 2;
  canvas.paint(0, ROWS.lot, width, height - ROWS.lot, (x, y) => {
    const corner = cornerStep(width, x);
    if (y < ROWS.curb) return at(ASPHALT, 0);
    if (y === ROWS.curb) return at(CONCRETE, Math.max(2, 5 + corner));
    const dy = y - ROWS.curb;
    const perspX = x - Math.round(((x - center) * dy) / 900);
    const along = ((perspX % BAY) + BAY) % BAY;
    if (y < ROWS.sidewalk) {
      const joint = along < 2 ? -2 : along === 2 ? 1 : 0;
      const step = Math.max(1, Math.min(CONCRETE.length - 1, 3 + joint + corner));
      return at(CONCRETE, step);
    }
    if (y === ROWS.sidewalk) return at(CONCRETE, 1);
    const joint = along < 2 ? -1 : along === 2 ? 1 : 0;
    const slab = Math.floor(perspX / BAY) % 2 === 0 ? 2 : 3;
    const step = Math.max(1, Math.min(CONCRETE.length - 1, slab + joint + corner));
    return at(wetAt(seed, x, y) ? WET : CONCRETE, step);
  });
}

function drawReflections(canvas: Canvas): void {
  for (const x0 of [460, 1095, 1420]) {
    for (let y = 5; y < 34; y += 3) {
      const half = Math.round(14 - (y - 5) * 0.38);
      if (half < 2) continue;
      canvas.hline(x0 - half, y, half * 2, at(CONCRETE_VIOLET, y < 16 ? 2 : 1));
    }
  }
  for (const x0 of [635, 865]) {
    for (let y = 6; y < 26; y += 4) {
      const half = Math.round(8 - (y - 6) * 0.3);
      if (half < 2) continue;
      canvas.hline(x0 - half, y, half * 2, at(SODIUM, 0));
    }
  }
}

function drawGrate(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x - 1, y - 1, 42, 11, at(ASPHALT, 0));
  canvas.fill(x, y, 40, 10, at(STEEL, 2));
  canvas.hline(x, y, 40, at(STEEL, 4));
  for (let px = x + 3; px < x + 38; px += 5) {
    canvas.fill(px, y + 3, 3, 5, at(ASPHALT, 0));
  }
}

function drawTireMarks(canvas: Canvas): void {
  for (const [from, to, y0] of [
    [140, 680, 18],
    [760, 1180, 24],
    [1300, 1800, 28],
  ] as const) {
    for (let x = from; x < to; x++) {
      const t = (x - from) / (to - from);
      const y = Math.round(y0 + Math.sin(t * Math.PI) * 8);
      if (Math.floor(x / 10) % 5 !== 0) {
        canvas.fill(x, y, 1, 2, at(ASPHALT, 0));
        canvas.fill(x, y + 14, 1, 2, at(ASPHALT, 0));
      }
    }
  }
}

function drawFloorLitter(canvas: Canvas): void {
  for (const [x, y] of [
    [320, 44],
    [820, 50],
    [1440, 42],
  ] as const) {
    canvas.fill(x, y, 8, 4, at(PAPER, 1));
    canvas.hline(x, y, 8, at(PAPER, 2));
  }
  for (const [x, y] of [
    [540, 48],
    [1220, 46],
  ] as const) {
    canvas.fill(x, y, 5, 3, at(POSTER_RED, 1));
    canvas.set(x + 4, y, at(STEEL, 4));
  }
}

export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawLot(canvas, seed + 51);
  drawTireMarks(canvas);
  drawSeams(canvas, streamOf(seed, 'floor'));
  drawReflections(canvas);
  drawLines(canvas, seed + 53);
  drawManhole(canvas, width / 2 + 210, 34);
  drawFloorLitter(canvas);
  drawCurb(canvas, seed + 57);
  drawGrate(canvas, width / 2 - 20, ROWS.lot - 11);
  return canvas;
}
