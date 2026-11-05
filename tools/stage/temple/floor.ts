/**
 * The floor (docs/art/decor-temple.md §2.3): the courtyard terrace the fighters stand on, 100 %
 * opaque from row 0 with two staggered courses of carved granite flagstones starting right at the
 * ground line (y = 460) so the fighters stand solidly on the lit stone slabs, followed by a raked
 * karesansui Zen gravel garden with mossy rocks, the carved stone kerb, and foreground moss.
 */

import { Canvas, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { BLOSSOM, LANTERN, MOSS, SNOW_MOSS, SNOW_STONE, STONE } from './palette.ts';

const SCALE = 2;
const SLAB = 64 * SCALE;
const CORNER = 24 * SCALE;
const ROWS = { course: 19, gravel: 38, kerb: 56, moss: 66 } as const;

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
    if (y < ROWS.gravel) {
      if (y === 0) return at(STONE, 7);
      const second = y >= ROWS.course;
      const along = (x + (second ? SLAB / 2 : 0)) % SLAB;
      const row = second ? y - ROWS.course : y;
      const courseH = second ? ROWS.gravel - ROWS.course : ROWS.course;
      if (along < 3 || row === 0) {
        const mossy = noise(seed + 1, x >> 2, y >> 1, 8) > 0.54;
        return at(mossy ? MOSS : STONE, row === 0 ? 1 : 0);
      }
      if ((row === 1 || along === 3) && !second) return at(STONE, 6);
      const lit = row === 1 ? 1.1 : along === 3 ? 0.6 : 0;
      const shade = row === courseH - 1 ? -0.9 : 0;
      const slabIndex = Math.floor((x + (second ? SLAB / 2 : 0)) / SLAB);
      const baseTone = (slabIndex + (second ? 1 : 0)) % 3 === 0 ? 3.5 : 4.2;
      const wear = (noise(seed + 2, x >> 2, y >> 1, 9) - 0.5) * 0.45;
      const ramp = snowAt(seed + 3, x, y) ? SNOW_STONE : STONE;
      const level = Math.min(5, baseTone + lit + shade + wear + corner);
      return hdTone(ramp, level, x, y);
    }
    if (y < ROWS.kerb) {
      if (y === ROWS.gravel) return at(STONE, 0);
      const groove = (y - ROWS.gravel) % 4;
      const level = (groove === 0 ? 4.4 : groove === 2 ? 2.2 : 3.3) + corner;
      return hdTone(STONE, Math.min(5, level), x, y);
    }
    if (y < ROWS.moss) {
      if (y === ROWS.kerb) return at(STONE, 7);
      if (y === ROWS.kerb + 1) return at(STONE, 6);
      const along = x % SLAB;
      const joint = along < 2 ? -1.8 : along === 2 ? 0.9 : 0;
      const level = Math.min(5, 4.4 + joint + corner - (y - ROWS.kerb) * 0.18);
      return hdTone(STONE, level, x, y);
    }
    if (y === ROWS.moss) return at(STONE, 0);
    const tuft = (noise(seed + 4, x >> 2, y >> 1, 6) - 0.5) * 1.3;
    const ramp = snowAt(seed + 5, x, y) ? SNOW_MOSS : MOSS;
    return hdTone(ramp, Math.min(2.8, 1.8 + tuft + corner * 0.5), x, y);
  });

  for (const rx of [420, 960, 1480]) {
    canvas.ellipse(rx - 18, ROWS.gravel + 4, 36, 10, at(STONE, 1));
    canvas.ellipse(rx - 14, ROWS.gravel + 3, 28, 8, at(STONE, 5));
    canvas.ellipse(rx - 10, ROWS.gravel + 2, 20, 5, at(MOSS, 2));
    canvas.hline(rx - 6, ROWS.gravel + 2, 12, at(MOSS, 3));
  }

  for (const lx of [340, 720, 1120, 1360]) {
    for (let y = 3; y < 15; y += 3) {
      const half = 12 - (y - 3);
      if (half > 2) canvas.hline(lx - half, y, half * 2, at(LANTERN, 0));
    }
  }

  for (let i = 0; i < 28; i++) {
    const px = 1180 + ((i * 29) % 580);
    const py = 4 + ((i * 11) % 30);
    canvas.fill(px, py, 3, 2, at(BLOSSOM, i % 3 === 0 ? 4 : 3));
  }

  return canvas;
}
