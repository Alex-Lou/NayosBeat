/**
 * The floor (docs/art/decor-rooftop.md §2.3): the roof the fighters stand on, 100 % opaque from
 * row 0 and matching the middle layer's slate membrane tone-for-tone at the ground line (y = 460)
 * so parallax glides cleanly without shearing or a visible seam.
 */

import { Canvas, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  CONCRETE,
  CONCRETE_VIOLET,
  MEMBRANE,
  MEMBRANE_VIOLET,
  MEMBRANE_YELLOW,
  RUST,
  STEEL,
  WET,
  WET_PAVER,
} from './palette.ts';

const SCALE = 2;
const SHEET = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { walkway: 12, back: 40, drain: 54, coping: 60, face: 68 } as const;

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1.4 * (1 - end / CORNER) ** 1.4 : 0;
}

export function wetAt(seed: number, x: number, y: number): boolean {
  return noise(seed + 9, Math.floor(x / 8), Math.floor(y / 4), 10) > 0.63;
}

function membraneAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerOf(width, x);
  if (y < 5) {
    const wetTop = wetAt(seed, x, y);
    return hdTone(wetTop ? WET : MEMBRANE, 2 + corner, x, y);
  }
  const along = x % SHEET;
  const lap = along === 0 ? -1.2 : along === 1 ? 1.1 : along === 2 ? 0.5 : 0;
  const patch = noise(seed + 4, x >> 2, y >> 1, 14) > 0.74 ? 0.45 : 0;
  const wear = (noise(seed, x >> 2, y >> 1, 10) - 0.5) * 0.45;
  const level = 2 + lap + patch + wear + corner;
  const wet = wetAt(seed, x, y) && along > 2;
  if (!wet && y >= ROWS.back) {
    if (x >= 420 && x < 940) return hdTone(MEMBRANE_VIOLET, level, x, y);
    if (x >= 1240 && x < 1500) return hdTone(MEMBRANE_YELLOW, level, x, y);
  }
  return hdTone(wet ? WET : MEMBRANE, level, x, y);
}

function paverAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerOf(width, x);
  const along = x % SHEET;
  const row = y - ROWS.walkway;
  const height = ROWS.back - ROWS.walkway;
  const joint = along < 3 || (along >= SHEET / 2 && along < SHEET / 2 + 2) || row === 13;
  if (joint) return at(MEMBRANE, 0);
  const lit = row === 0 || row === 14 ? 1.3 : along === 3 || along === SHEET / 2 + 2 ? 0.7 : 0;
  const shade = row === height - 1 || row === 12 ? -1 : 0;
  const slabTone = (Math.floor(x / (SHEET / 2)) + (row < 13 ? 0 : 1)) % 2 === 0 ? 3.2 : 2.6;
  const wear = (noise(seed + 7, x >> 2, y >> 1, 8) - 0.5) * 0.55;
  const level = slabTone + lit + shade + wear + corner;
  if (wetAt(seed + 2, x, y)) return hdTone(WET_PAVER, level, x, y);
  if (x >= 440 && x < 920) return hdTone(CONCRETE_VIOLET, level, x, y);
  return hdTone(CONCRETE, level, x, y);
}

export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.walkway || (y >= ROWS.back && y < ROWS.drain)) {
      return membraneAt(seed, width, x, y);
    }
    if (y < ROWS.back) return paverAt(seed, width, x, y);
    if (y < ROWS.coping) {
      if (y === ROWS.drain) return at(CONCRETE, 3);
      if (y === ROWS.drain + 1) return at(CONCRETE, 1);
      const grate = x % (SHEET * 2) > SHEET - 24 && x % (SHEET * 2) < SHEET + 24;
      if (grate) return at(STEEL, (x % 4 < 2 ? 1 : 3) + (y === ROWS.coping - 1 ? -1 : 0));
      return at(MEMBRANE, 0);
    }
    if (y === ROWS.coping) return at(CONCRETE, 7);
    const along = x % SHEET;
    if (y < ROWS.face) {
      const joint = along < 2 ? -2.2 : along === 2 ? 1 : 0;
      const level = 4.8 + joint + corner - (y - ROWS.coping) * 0.16;
      return hdTone(CONCRETE, level, x, y);
    }
    if (y === ROWS.face) return at(CONCRETE, 1);
    const joint = along < 2 ? -1.4 : 0;
    const rust = along > 18 && along < 24 && y > ROWS.face + 2;
    if (rust) return at(RUST, y > ROWS.face + 5 ? 0 : 1);
    const stain = (noise(seed + 11, x >> 2, y >> 1, 6) - 0.5) * 0.8;
    return hdTone(CONCRETE, 2.4 + joint + stain + corner, x, y);
  });
  return canvas;
}
