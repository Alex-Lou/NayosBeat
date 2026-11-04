/**
 * The floor (docs/art/decor-rooftop.md §2.3): the roof the fighters stand on, interlocking
 * seamlessly with the middle layer's concrete deck and puddles across y = 460 (docs/art/proprete.md).
 * Stepped concrete pavers in 3D perspective, membrane border, storm drain channel with steel grates,
 * and the front parapet coping.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  CONCRETE,
  CONCRETE_VIOLET,
  MEMBRANE,
  MEMBRANE_VIOLET,
  MEMBRANE_YELLOW,
  NEON_VIOLET,
  NEON_YELLOW,
  RUST,
  STEEL,
  WET,
  WET_PAVER,
} from './palette.ts';

const SCALE = 2;
const SHEET = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { walkway: 4, back: 44, drain: 56, coping: 62, face: 70 } as const;

function cornerStep(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER / 2 ? -1 : 0;
}

export function wetAt(seed: number, x: number, y: number): boolean {
  return noise(seed + 9, Math.floor(x / 8), Math.floor(y / 4), 10) > 0.63;
}

function perspAlong(width: number, x: number, y: number): { perspX: number; along: number } {
  const center = width / 2;
  const perspX = x - Math.round(((x - center) * (y + 56)) / 360);
  const along = ((perspX % SHEET) + SHEET) % SHEET;
  return { perspX, along };
}

function topEdgeAt(width: number, x: number): number {
  const { perspX, along } = perspAlong(width, x, 0);
  if (along < 3 || (along >= SHEET / 2 && along < SHEET / 2 + 2)) return 6;
  const pad = Math.floor(perspX / (SHEET / 2));
  return pad % 3 === 0 ? 2 : pad % 3 === 1 ? 4 : 3;
}

function membraneAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerStep(width, x);
  const { perspX, along } = perspAlong(width, x, y);
  const lap = along === 0 || along === 1 ? -1 : along === 2 ? 1 : 0;
  const tile = Math.floor(perspX / SHEET) % 2 === 0 ? 2 : 3;
  const step = Math.max(0, Math.min(MEMBRANE.length - 1, tile + lap + corner));
  const wet = wetAt(seed, x, y) && along > 2;
  if (!wet) {
    if (x >= 420 && x < 940) return at(MEMBRANE_VIOLET, step);
    if (x >= 1240 && x < 1500) return at(MEMBRANE_YELLOW, step);
  }
  return at(wet ? WET : MEMBRANE, step);
}

function paverAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerStep(width, x);
  const { perspX, along } = perspAlong(width, x, y);
  const row = y - ROWS.walkway;
  const height = ROWS.back - ROWS.walkway;
  const joint =
    along < 3 || (along >= SHEET / 2 && along < SHEET / 2 + 2) || row === 13 || row === 27;
  if (joint) return at(MEMBRANE, 0);
  const topRow = topEdgeAt(width, x);
  const lit = y === topRow || row === 14 || row === 28 ? 1 : 0;
  const shade = row === height - 1 || row === 12 || row === 26 ? -1 : 0;
  const course = row < 13 ? 0 : row < 27 ? 1 : 2;
  const slabTone = (Math.floor(perspX / (SHEET / 2)) + course) % 2 === 0 ? 3 : 2;
  const step = Math.max(1, Math.min(CONCRETE.length - 1, slabTone + lit + shade + corner));
  if (wetAt(seed + 2, x, y)) return at(WET_PAVER, step);
  if (x >= 440 && x < 920 && row < 27) return at(CONCRETE_VIOLET, step);
  return at(CONCRETE, step);
}

function drawFloorBridges(canvas: Canvas): void {
  for (const cx of [600, 1000, 1340]) {
    canvas.polygon(
      [
        [cx - 12, 0],
        [cx + 12, 0],
        [cx + 15, 16],
        [cx - 15, 16],
      ],
      at(STEEL, 1),
    );
    for (let py = 1; py < 15; py++) {
      for (let px = cx - 10; px < cx + 10; px++) {
        if (Math.floor((px + py) / 5) % 2 === 0) {
          canvas.set(px, py, at(NEON_YELLOW, 1));
        }
      }
    }
    canvas.vline(cx - 12, 0, 15, at(STEEL, 3));
    canvas.vline(cx + 12, 0, 15, at(STEEL, 0));
  }
  for (const [px, w, ramp, glow] of [
    [620, 110, MEMBRANE_VIOLET, NEON_VIOLET],
    [1360, 88, MEMBRANE_YELLOW, NEON_YELLOW],
  ] as const) {
    canvas.ellipse(px, 2, w, 12, at(ramp, 2));
    canvas.ellipse(px + 8, 4, w - 16, 8, at(ramp, 1));
    for (let dx = 14; dx < w - 18; dx += 18) {
      canvas.hline(px + dx, 6 + ((dx >> 1) % 2) * 2, 10, at(glow, 1));
    }
  }
}

export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const edge = topEdgeAt(width, x);
    if (y < edge) return 0;
    const corner = cornerStep(width, x);
    if (y >= ROWS.back && y < ROWS.drain) {
      return membraneAt(seed, width, x, y);
    }
    if (y < ROWS.back) return paverAt(seed, width, x, y);
    if (y < ROWS.coping) {
      if (y === ROWS.drain) return at(CONCRETE, 2);
      const { along } = perspAlong(width, x, y);
      const grate = along > SHEET / 2 - 22 && along < SHEET / 2 + 22;
      if (grate) return at(STEEL, (x % 4 < 2 ? 1 : 3) + (y === ROWS.coping - 1 ? -1 : 0));
      return at(MEMBRANE, 0);
    }
    if (y === ROWS.coping) return at(CONCRETE, Math.max(3, 6 + corner));
    const { along } = perspAlong(width, x, y);
    if (y < ROWS.face) {
      const joint = along < 2 ? -2 : along === 2 ? 1 : 0;
      const step = Math.max(1, Math.min(CONCRETE.length - 1, 4 + joint + corner));
      return at(CONCRETE, step);
    }
    if (y === ROWS.face) return at(CONCRETE, 1);
    const joint = along < 2 ? -1 : 0;
    const rust = along > 18 && along < 22 && y > ROWS.face + 3;
    if (rust) return at(RUST, 0);
    const step = Math.max(0, Math.min(CONCRETE.length - 1, 2 + joint + corner));
    return at(CONCRETE, step);
  });
  drawFloorBridges(canvas);
  return canvas;
}
