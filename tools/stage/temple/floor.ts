/**
 * The floor (docs/art/decor-temple.md §2.3): the courtyard the fighters stand on, 100 % opaque
 * from row 0 and matching the middle layer's stone ground tone-for-tone at y = 460 so parallax
 * glides cleanly without shearing or a visible horizontal cut. Two courses of sculpted flagstones,
 * raked Zen gravel, beveled stone kerb, and lush foreground moss.
 */

import { Canvas, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { MOSS, SNOW_MOSS, SNOW_STONE, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { top: 8, course: 26, gravel: 46, kerb: 60, moss: 66 } as const;

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
  return end < CORNER ? -1.2 * (1 - end / CORNER) ** 1.4 : 0;
}

export function snowAt(seed: number, x: number, y: number): boolean {
  return noise(seed, x, y * 2, 90) > 0.12;
}

export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.top) {
      const ramp = snowAt(seed + 3, x, y) ? SNOW_STONE : STONE;
      return hdTone(ramp, 2.8 + corner, x, y);
    }
    if (y < ROWS.gravel) {
      const second = y >= ROWS.course;
      const along = (x + (second ? SLAB / 2 : 0)) % SLAB;
      const row = second ? y - ROWS.course : y - ROWS.top;
      const courseH = second ? ROWS.gravel - ROWS.course : ROWS.course - ROWS.top;
      const joint = along < 3 || row === 0;
      if (joint) {
        const mossy = noise(seed + 1, x >> 2, y >> 1, 8) > 0.58;
        return at(mossy ? MOSS : STONE, row === 0 ? 1 : 0);
      }
      const lit = row === 1 ? 1.1 : along === 3 ? 0.6 : 0;
      const shade = row === courseH - 1 ? -0.9 : 0;
      const slabIndex = Math.floor((x + (second ? SLAB / 2 : 0)) / SLAB);
      const baseTone = (slabIndex + (second ? 1 : 0)) % 3 === 0 ? 3.3 : 3.9;
      const wear = (noise(seed + 2, x >> 2, y >> 1, 9) - 0.5) * 0.45;
      const ramp = snowAt(seed + 3, x, y) ? SNOW_STONE : STONE;
      const level = Math.min(5, baseTone + lit + shade + wear + corner);
      return hdTone(ramp, level, x, y);
    }
    if (y < ROWS.kerb) {
      const groove = (y - ROWS.gravel) % 4;
      const level = (groove === 0 ? 3.4 : groove === 2 ? 2.1 : 2.7) + corner;
      return hdTone(STONE, level, x, y);
    }
    if (y < ROWS.moss) {
      if (y === ROWS.kerb) return at(STONE, 6);
      const along = x % SLAB;
      const joint = along < 2 ? -1.8 : along === 2 ? 0.8 : 0;
      return hdTone(STONE, 4.2 + joint + corner - (y - ROWS.kerb) * 0.2, x, y);
    }
    const tuft = (noise(seed + 4, x >> 2, y >> 1, 6) - 0.5) * 1.2;
    const ramp = snowAt(seed + 5, x, y) ? SNOW_MOSS : MOSS;
    return hdTone(ramp, 1.5 + tuft + corner * 0.6, x, y);
  });
  return canvas;
}
