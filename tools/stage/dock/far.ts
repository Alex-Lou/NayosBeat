/**
 * The far layer (docs/art/decor-dock.md §2.1): what shows over L'Entrepôt's roof and down the alley
 * on the left. The street's night sky, the city's towers with a few windows awake, a smokestack and
 * water tanks on the roofs around; down the alley, the back street: low warehouses with sawtooth
 * roofs, the elevated line on its girders, a street lamp. Clean flat tones (docs/art/proprete.md).
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { BRICK, CLOUD, DISTANT, DISTANT_LIT, SKY, SODIUM, STEAM, STEEL } from './palette.ts';

const GLOW = 300;
const STREET = 430;
const DECK_TOP = 316;
const DECK_BOTTOM = 332;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.5;
}

function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 220);
    if (presence < 0.42) continue;
    const swell = (presence - 0.42) / 0.58;
    const bumps = noise(seed + 1, x, 0, 30) * 0.7 + noise(seed + 2, x, 0, 8) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 3 + noise(seed + 3, x, 0, 20) * 4 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      const step = depth > 0.72 ? 3 : depth > 0.48 ? 2 : depth > 0.22 ? 1 : 0;
      canvas.set(x, y, at(CLOUD, step));
    }
  }
}

function drawTowers(canvas: Canvas, random: Random): void {
  let x = -10;
  while (x < canvas.width) {
    const width = random.int(40, 86);
    const top = random.int(42, 186);
    const inset = random.chance(0.55) ? random.int(6, 12) : 0;
    const tier = inset > 0 ? random.int(12, 26) : 0;
    const mask = new Mask(canvas.width, canvas.height);
    mask.rect(x, top, width, STREET - top);
    if (tier > 0) mask.rect(x + inset, top - tier, width - inset * 2, tier);
    for (let y = Math.max(0, top - tier); y < STREET; y++) {
      const band = y > 260 ? 1 : 0;
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const topEdge = !mask.has(px, y - 1);
        const rightEdge = !mask.has(px + 1, y) || !mask.has(px + 2, y);
        const leftShade = !mask.has(px - 1, y);
        const step = topEdge ? 3 : rightEdge ? 2 : leftShade ? 0 : band + 1;
        canvas.set(px, y, at(DISTANT, step));
      }
    }
    for (let y = top + 8; y < STREET - 12; y += 9) {
      if (!random.chance(0.35)) continue;
      const from = x + 5 + random.int(0, Math.max(0, width - 22));
      const run = random.int(2, 5);
      const toneStep = random.int(0, 2);
      for (let w = 0; w < run; w++) {
        const wx = from + w * 6;
        if (wx + 3 >= x + width - 4) break;
        canvas.fill(wx, y, 3, 4, at(DISTANT_LIT, toneStep));
      }
    }
    x += width + random.int(-8, 6);
  }
}

function drawStack(canvas: Canvas, x: number, top: number): void {
  const width = 26;
  canvas.paint(x, top, width, STREET - top, (px, py) => {
    const course = Math.floor(py / 4);
    const joint = py % 4 === 3 || (px + (course % 2) * 4) % 8 === 0;
    const col = px - x;
    const base = col < 4 ? 3 : col < 10 ? 2 : col > width - 5 ? 0 : 1;
    return at(BRICK, Math.max(0, base - (joint ? 1 : 0)));
  });
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
    const step = rise > 44 ? 0 : rise > 22 ? (lit ? 2 : 1) : lit ? 2 : 1;
    return at(STEAM, step);
  });
}

function drawTank(canvas: Canvas, cx: number, base: number): void {
  const width = 46;
  const left = cx - width / 2;
  const legs = 30;
  for (const lx of [left + 4, left + width - 7, left + width / 2 - 1]) {
    canvas.fill(lx, base - legs, 3, legs, at(STEEL, 1));
    canvas.vline(lx + 2, base - legs, legs, at(STEEL, 2));
  }
  canvas.line(left + 4, base - legs, left + width - 5, base - 4, at(STEEL, 1));
  canvas.line(left + width - 5, base - legs, left + 4, base - 4, at(STEEL, 1));
  const top = base - legs - 52;
  canvas.paint(left, top, width, 52, (px, py) => {
    const hoop = (py - top) % 13 === 12;
    if (hoop) return at(STEEL, 1);
    const col = px - left;
    return at(DISTANT, col > width - 8 ? 3 : col > width - 16 ? 2 : col < 5 ? 0 : 1);
  });
  for (let row = 0; row < 16; row++) {
    const half = Math.round((width / 2 + 2) * (row / 15));
    canvas.hline(cx - half, top - 16 + row, half * 2, at(DISTANT, row < 4 ? 3 : 2));
    if (half > 2) canvas.fill(cx + half - 3, top - 16 + row, 3, 1, at(DISTANT, 3));
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
      return at(DISTANT, py > 360 ? 2 : 1);
    });
    for (let wx = x + 12; wx < x + width - 16; wx += 24) {
      if (random.chance(0.28)) {
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
  canvas.paint(0, STREET, right, canvas.height - STREET, (_px, py) =>
    at(DISTANT, py < STREET + 4 ? 2 : py < STREET + 32 ? 1 : 0),
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
  canvas.paint(0, 0, width, height, (x, y) => tone(SKY, skyLevel(y), x, y));
  drawCloud(canvas, seed + 1, 70, 22);
  drawCloud(canvas, seed + 5, 150, 30);
  drawTowers(canvas, streamOf(seed, 'towers'));
  drawStack(canvas, 820, 96);
  drawTank(canvas, 1010, 214);
  drawBackStreet(canvas, streamOf(seed, 'back street'));
  drawTank(canvas, 150, 262);
  return canvas;
}
