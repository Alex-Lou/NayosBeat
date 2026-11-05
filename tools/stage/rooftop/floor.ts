/**
 * The floor (docs/art/decor-rooftop.md §2.3): the roof walkway the fighters stand on, 100 % opaque
 * from row 0 with two staggered courses of concrete pavers starting right at the ground line
 * (y = 460) so the fighters stand solidly on the lit concrete slabs, followed by the waterproof
 * membrane, the steel drainage channel, and the front parapet coping.
 */

import { Canvas, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  CONCRETE,
  CONCRETE_VIOLET,
  MEMBRANE,
  MEMBRANE_VIOLET,
  MEMBRANE_YELLOW,
  NEON_YELLOW,
  RUST,
  STEEL,
  WET,
  WET_PAVER,
} from './palette.ts';

const SCALE = 2;
const SHEET = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { course: 17, back: 34, drain: 50, coping: 58, face: 68 } as const;

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

function paverAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerOf(width, x);
  const second = y >= ROWS.course;
  const along = (x + (second ? SHEET / 4 : 0)) % (SHEET / 2);
  const row = second ? y - ROWS.course : y;
  const courseH = second ? ROWS.back - ROWS.course : ROWS.course;
  if (y === 0) return at(CONCRETE, 7);
  if (along < 2 || row === 0) return at(MEMBRANE, 0);
  const lit = row === 1 ? 1.5 : along === 2 ? 0.9 : 0;
  const shade = row === courseH - 1 ? -1 : 0;
  const slabIndex = Math.floor((x + (second ? SHEET / 4 : 0)) / (SHEET / 2));
  const slabTone = (slabIndex + (second ? 1 : 0)) % 2 === 0 ? 4.1 : 3.4;
  const wear = (noise(seed + 7, x >> 2, y >> 1, 8) - 0.5) * 0.5;
  const level = Math.min(6, slabTone + lit + shade + wear + corner);
  if (wetAt(seed + 2, x, y)) return hdTone(WET_PAVER, level, x, y);
  if (x >= 440 && x < 920) return hdTone(CONCRETE_VIOLET, level, x, y);
  return hdTone(CONCRETE, level, x, y);
}

function membraneAt(seed: number, width: number, x: number, y: number): number {
  const corner = cornerOf(width, x);
  if (y === ROWS.back) return at(MEMBRANE, 0);
  const along = x % SHEET;
  const lap = along === 0 ? -1.2 : along === 1 ? 1.2 : along === 2 ? 0.6 : 0;
  const patch = noise(seed + 4, x >> 2, y >> 1, 14) > 0.72 ? 0.6 : 0;
  const wear = (noise(seed, x >> 2, y >> 1, 10) - 0.5) * 0.45;
  const level = 2.6 + lap + patch + wear + corner;
  const wet = wetAt(seed, x, y) && along > 2;
  if (!wet) {
    if (x >= 420 && x < 940) return hdTone(MEMBRANE_VIOLET, level, x, y);
    if (x >= 1240 && x < 1500) return hdTone(MEMBRANE_YELLOW, level, x, y);
  }
  return hdTone(wet ? WET : MEMBRANE, level, x, y);
}

export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.back) return paverAt(seed, width, x, y);
    if (y < ROWS.drain) return membraneAt(seed, width, x, y);
    if (y < ROWS.coping) {
      if (y === ROWS.drain) return at(STEEL, 4);
      if (y === ROWS.drain + 1) return at(CONCRETE, 1);
      if (y === ROWS.drain + 2 && (x + y * 2) % 24 < 12) return at(NEON_YELLOW, 1);
      const grate = x % (SHEET * 2) > SHEET - 28 && x % (SHEET * 2) < SHEET + 28;
      if (grate) return at(STEEL, (x % 4 < 2 ? 1 : 4) + (y === ROWS.coping - 1 ? -1 : 0));
      return at(MEMBRANE, 0);
    }
    if (y === ROWS.coping) return at(CONCRETE, 7);
    const along = x % SHEET;
    if (y < ROWS.face) {
      const joint = along < 2 ? -2.2 : along === 2 ? 1.1 : 0;
      const level = 5.2 + joint + corner - (y - ROWS.coping) * 0.16;
      return hdTone(CONCRETE, level, x, y);
    }
    if (y === ROWS.face) return at(CONCRETE, 1);
    const joint = along < 2 ? -1.4 : 0;
    const rust = along > 18 && along < 24 && y > ROWS.face + 2;
    if (rust) return at(RUST, y > ROWS.face + 5 ? 0 : 1);
    const stain = (noise(seed + 11, x >> 2, y >> 1, 6) - 0.5) * 0.7;
    return hdTone(CONCRETE, 3.1 + joint + stain + corner, x, y);
  });
  return canvas;
}
