/**
 * The far layer (docs/art/decor-dock.md §2.1): what shows over L'Entrepôt's roof and down the alley
 * on the left, in high-detail pixel art (docs/art/proprete.md). Night sky with city glow dome and
 * crescent moon, volumetric clouds, 3D towers with curtain walls and bracing, brick smokestack,
 * wooden water tanks, and the back-street viaduct where the elevated train glides (index.ts).
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { BRICK, CLOUD, DISTANT, DISTANT_LIT, SKY, SODIUM, STEAM, STEEL } from './palette.ts';

const GLOW = 310;
const STREET = 430;
const DECK_TOP = 316;
const DECK_BOTTOM = 332;

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.4;
}

function drawSky(canvas: Canvas): void {
  const { width, height } = canvas;
  const cx = 640;
  const cy = 220;
  canvas.paint(0, 0, width, height, (x, y) => {
    const d = Math.hypot((x - cx) / 460, (y - cy) / 210);
    const dome = d < 1 ? (1 - d * d) * 1.15 : 0;
    return hdTone(SKY, skyLevel(y) + dome, x, y);
  });
  const mx = 1040;
  const my = 56;
  for (let y = my - 26; y <= my + 26; y++) {
    for (let x = mx - 26; x <= mx + 26; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d > 24) continue;
      if (d > 14) {
        if (dithered((24 - d) / 10, x >> 1, y)) canvas.set(x, y, at(CLOUD, 2));
        continue;
      }
      if (Math.hypot(x - (mx - 5), y - (my - 3)) >= 12.5) {
        canvas.set(x, y, at(DISTANT_LIT, d < 10 ? 2 : 1));
      }
    }
  }
}

function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 220);
    if (presence < 0.36) continue;
    const swell = (presence - 0.36) / 0.64;
    const bumps = noise(seed + 1, x, 0, 30) * 0.7 + noise(seed + 2, x, 0, 8) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 3 + noise(seed + 3, x, 0, 20) * 4 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      canvas.set(x, y, hdTone(CLOUD, depth * 3.3, x, y));
    }
  }
}

function drawTowers(canvas: Canvas, random: Random): void {
  const center = canvas.width / 2;
  let x = -10;
  while (x < canvas.width) {
    const width = random.int(44, 92);
    const top = random.int(34, 178);
    const inset = random.chance(0.6) ? random.int(6, 14) : 0;
    const tier = inset > 0 ? random.int(12, 28) : 0;
    const spire = random.chance(0.35) ? random.int(14, 32) : 0;
    const mask = new Mask(canvas.width, canvas.height);
    mask.rect(x, top, width, STREET - top);
    if (tier > 0) mask.rect(x + inset, top - tier, width - inset * 2, tier);
    if (spire > 0) mask.rect(x + Math.floor(width / 2) - 1, top - tier - spire, 2, spire);
    const sideW = Math.max(5, Math.round(width * 0.18));
    const litRight = x + width / 2 < center;
    for (let y = Math.max(0, top - tier - spire); y < STREET; y++) {
      const hgrad = ((y - top) / Math.max(1, STREET - top)) * 1.2;
      const spandrel = y > top + 4 && (y - top) % 8 === 0;
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const topEdge = !mask.has(px, y - 1);
        const rightEdge = !mask.has(px + 1, y);
        const leftEdge = !mask.has(px - 1, y);
        const inSide = litRight ? px >= x + width - sideW : px < x + sideW;
        if (topEdge || (litRight ? rightEdge : leftEdge)) {
          canvas.set(px, y, at(DISTANT, 3));
        } else if (litRight ? leftEdge : rightEdge) {
          canvas.set(px, y, at(DISTANT, 0));
        } else if (inSide) {
          canvas.set(px, y, hdTone(DISTANT, 2.1 + hgrad * 0.6, px, y));
        } else {
          canvas.set(px, y, hdTone(DISTANT, (spandrel ? 0.4 : 1) + hgrad * 0.6, px, y));
        }
      }
    }
    const fl = litRight ? x + 4 : x + sideW + 3;
    const fr = litRight ? x + width - sideW - 3 : x + width - 4;
    for (let y = top + 8; y < STREET - 12; y += 8) {
      if (!random.chance(0.45)) continue;
      const toneStep = random.int(0, 2);
      for (let wx = fl; wx < fr - 4; wx += 6) {
        if (random.chance(0.6)) canvas.fill(wx, y, 3, 4, at(DISTANT_LIT, toneStep));
      }
    }
    x += width + random.int(-6, 6);
  }
}

function drawStack(canvas: Canvas, x: number, top: number): void {
  const width = 28;
  canvas.paint(x, top, width, STREET - top, (px, py) => {
    const course = Math.floor(py / 4);
    const joint = py % 4 === 3 || (px + (course % 2) * 4) % 8 === 0;
    const u = (px - x) / width;
    const round = 2.4 - u * 1.8 - (joint ? 0.8 : 0);
    return hdTone(BRICK, round, px, py);
  });
  for (let hy = top + 16; hy < STREET - 16; hy += 22) {
    canvas.hline(x, hy, width, at(STEEL, 3));
    canvas.hline(x, hy + 1, width, at(STEEL, 0));
  }
  canvas.fill(x - 3, top, width + 6, 5, at(BRICK, 3));
  canvas.hline(x - 3, top, width + 6, at(BRICK, 5));
  canvas.hline(x - 3, top + 4, width + 6, at(BRICK, 1));
  const plume = new Mask(canvas.width, canvas.height);
  for (let i = 0; i < 9; i++) {
    const rise = 4 + i * 6;
    const cx = Math.round(x + width / 2 - rise * 0.82 - Math.sin(i * 0.9) * 2);
    const cy = top - 2 - rise;
    const rx = 5 + Math.floor(i * 1.3);
    const ry = 4 + Math.floor(i * 0.9);
    plume.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  canvas.paint(x - 70, top - 70, 90, 70, (px, py) => {
    if (!plume.has(px, py)) return undefined;
    const rise = top - py;
    const lit = !plume.has(px, py - 1) || !plume.has(px - 1, py);
    const level = (lit ? 2.4 : 1.3) - (rise / 65) * 1.4;
    return hdTone(STEAM, level, px, py);
  });
}

function drawTank(canvas: Canvas, cx: number, base: number): void {
  const width = 48;
  const left = cx - width / 2;
  const legs = 30;
  for (const lx of [left + 4, left + width - 7, left + width / 2 - 1]) {
    canvas.fill(lx, base - legs, 3, legs, at(STEEL, 1));
    canvas.vline(lx + 2, base - legs, legs, at(STEEL, 3));
  }
  canvas.line(left + 4, base - legs, left + width - 5, base - 4, at(STEEL, 1));
  canvas.line(left + width - 5, base - legs, left + 4, base - 4, at(STEEL, 1));
  const top = base - legs - 52;
  canvas.paint(left, top, width, 52, (px, py) => {
    const hoop = (py - top) % 13 === 12;
    if (hoop) return at(STEEL, 2);
    const u = (px - left) / width;
    const stave = (px - left) % 6 === 0 ? -0.4 : 0;
    return hdTone(DISTANT, 1.1 + u * 2 + stave, px, py);
  });
  for (let row = 0; row < 16; row++) {
    const half = Math.round((width / 2 + 2) * (row / 15));
    for (let px = cx - half; px < cx + half; px++) {
      const u = (px - cx) / Math.max(1, half);
      canvas.set(px, top - 16 + row, hdTone(DISTANT, 1.8 + u * 1.2, px, top - 16 + row));
    }
  }
  canvas.hline(left - 2, top - 1, width + 4, at(DISTANT, 3));
}

export const FAR_TRAIN = {
  car: 86,
  height: 20,
  cars: 3,
  gap: 4,
  rail: DECK_TOP - 2,
  right: 460,
} as const;

export function drawFarTrain(canvas: Canvas, x: number): void {
  const { car, height, cars, gap, rail, right } = FAR_TRAIN;
  const top = rail - height;
  for (let index = 0; index < cars; index++) {
    const left = x + index * (car + gap);
    if (left >= right || left + car <= 0) continue;
    const cl = Math.max(0, left);
    const cr = Math.min(right, left + car);
    if (cr <= cl) continue;
    canvas.fill(cl, top, cr - cl, height, at(STEEL, 2));
    canvas.hline(cl, top, cr - cl, at(STEEL, 4));
    canvas.fill(cl, rail - 3, cr - cl, 3, at(STEEL, 0));
    for (let wx = left + 6; wx < left + car - 10; wx += 12) {
      if (wx < 0 || wx + 7 > right) continue;
      const lit = (wx * 11 + index * 5) % 5 !== 0;
      canvas.fill(wx, top + 5, 7, 7, at(SODIUM, lit ? 2 : 0));
      if (lit) canvas.hline(wx, top + 5, 7, at(SODIUM, 3));
    }
  }
  if (x >= 2 && x < right) {
    canvas.fill(x - 2, top + height - 8, 2, 3, at(SODIUM, 4));
  }
}

function drawBackStreet(canvas: Canvas, random: Random): void {
  const right = 460;
  let x = -6;
  while (x < right) {
    const width = random.int(74, 118);
    const roof = random.int(248, 286);
    canvas.paint(x, roof - 14, width, STREET - roof + 14, (px, py) => {
      const tooth = (px - x) % 28;
      if (py < roof && py < roof - 14 + tooth / 2) return undefined;
      if (py < roof && (tooth === 0 || tooth === 1)) return at(DISTANT, 3);
      if (py === roof) return at(DISTANT, 2);
      return hdTone(DISTANT, 1.1 + (py - roof) / 140, px, py);
    });
    for (let wx = x + 12; wx < x + width - 16; wx += 24) {
      if (random.chance(0.32)) {
        canvas.fill(wx, roof + 26, 8, 10, at(DISTANT_LIT, 0));
        canvas.hline(wx, roof + 26, 8, at(DISTANT_LIT, 1));
      }
    }
    x += width + random.int(2, 8);
  }
  canvas.fill(0, DECK_TOP - 8, right, 2, at(STEEL, 2));
  for (let px = 8; px < right; px += 20) {
    canvas.vline(px, DECK_TOP - 6, 4, at(STEEL, 1));
  }
  canvas.fill(0, DECK_TOP - 2, right, 2, at(STEEL, 4));
  canvas.fill(0, DECK_TOP, right, DECK_BOTTOM - DECK_TOP, at(STEEL, 1));
  canvas.hline(0, DECK_TOP + 1, right, at(STEEL, 3));
  canvas.fill(0, DECK_BOTTOM - 3, right, 3, at(STEEL, 0));
  for (let px = 12; px < right; px += 24) {
    canvas.fill(px, DECK_TOP + 3, 2, DECK_BOTTOM - DECK_TOP - 6, at(STEEL, 2));
  }
  for (const px of [96, 300]) {
    canvas.fill(px - 6, DECK_BOTTOM, 14, STREET - DECK_BOTTOM, at(STEEL, 1));
    canvas.fill(px - 6, DECK_BOTTOM, 2, STREET - DECK_BOTTOM, at(STEEL, 3));
    canvas.fill(px + 6, DECK_BOTTOM, 2, STREET - DECK_BOTTOM, at(STEEL, 0));
    canvas.line(px - 6, DECK_BOTTOM + 22, px - 26, DECK_BOTTOM, at(STEEL, 1), 2);
    canvas.line(px + 8, DECK_BOTTOM + 22, px + 28, DECK_BOTTOM, at(STEEL, 1), 2);
  }
  canvas.paint(0, STREET, right, canvas.height - STREET, (px, py) =>
    hdTone(DISTANT, 1.8 - (py - STREET) / 48, px, py),
  );
  const lamp = 84;
  canvas.fill(lamp, 302, 3, STREET - 302, at(STEEL, 1));
  canvas.vline(lamp + 2, 302, STREET - 302, at(STEEL, 3));
  canvas.fill(lamp - 6, 300, 10, 3, at(STEEL, 2));
  canvas.fill(lamp - 5, 303, 6, 2, at(SODIUM, 3));
  canvas.ellipse(lamp - 24, STREET + 2, 48, 8, at(SODIUM, 0));
  canvas.ellipse(lamp - 12, STREET + 4, 24, 4, at(SODIUM, 1));
}

export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSky(canvas);
  drawCloud(canvas, seed + 1, 70, 22);
  drawCloud(canvas, seed + 5, 150, 30);
  drawTowers(canvas, streamOf(seed, 'towers'));
  drawStack(canvas, 820, 96);
  drawTank(canvas, 1010, 214);
  drawBackStreet(canvas, streamOf(seed, 'back street'));
  drawTank(canvas, 150, 262);
  return canvas;
}
