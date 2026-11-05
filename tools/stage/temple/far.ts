/**
 * The far layer (docs/art/decor-temple.md §2.1): the sea past the courtyard's wall, in high-detail
 * pixel art (docs/art/proprete.md). Night sky with atmospheric moon halo, layered clouds, tiered
 * islands with ridged forests, a five-story pagoda and shore lights, the sea with wave swells and
 * the moon's glittering path, and the fishing boat gliding across (index.ts). Opaque everywhere.
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, GLITTER, ISLAND, ISLAND_FAR, LANTERN, MOON, SEA, SKY, WOOD } from './palette.ts';

export const HORIZON = 268;
export const MOON_AT = { x: 860, y: 118, radius: 26 } as const;

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.3;
}

function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.ellipse(x, y, width, height);
  mask.ellipse(x + width * 0.18, y - height * 0.55, width * 0.46, height * 1.25);
  mask.ellipse(x + width * 0.48, y - height * 0.35, width * 0.38, height * 1.05);
  canvas.paint(x - 2, y - height, width + 4, height * 2 + 2, (px, py) => {
    if (!mask.has(px, py)) return undefined;
    const under = !mask.has(px, py + 2);
    const top = !mask.has(px, py - 1);
    if (under) return at(CLOUD, 3);
    if (top) return at(CLOUD, 2);
    const depth = (py - (y - height * 0.5)) / Math.max(1, height * 1.5);
    return hdTone(CLOUD, 0.8 + depth * 1.6, px, py);
  });
}

function drawMoon(canvas: Canvas): void {
  const { x, y, radius } = MOON_AT;
  canvas.paint(x - radius - 22, y - radius - 22, radius * 2 + 44, radius * 2 + 44, (px, py) => {
    const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
    if (d > radius + 20) return undefined;
    if (d > radius) {
      const t = 1 - (d - radius) / 20;
      return hdTone(SKY, skyLevel(py) + t * 2.2, px, py);
    }
    const lit = Math.hypot(px + 0.5 - (x + 6), py + 0.5 - (y - 4));
    if (lit >= radius - 2) return at(MOON, 0);
    return hdTone(MOON, 1.35 + (1 - lit / (radius - 2)) * 0.65, px, py);
  });
}

function drawIsland(
  canvas: Canvas,
  ramp: readonly number[],
  left: number,
  right: number,
  peak: number,
  seed: number,
): void {
  for (let x = left; x < right; x++) {
    const t = (x - left) / (right - left);
    const hill = Math.sin(t * Math.PI) ** 0.7;
    const rough = noise(seed, x, 0, 56) * 0.32 + noise(seed + 1, x, 0, 14) * 0.08;
    const top = Math.round(HORIZON - peak * hill * (0.74 + rough));
    for (let y = top; y < HORIZON + 2; y++) {
      const dy = y - top;
      if (dy < 2) {
        canvas.set(x, y, at(ramp, ramp.length - 1));
      } else {
        const ridge = noise(seed + 2, x >> 2, y >> 1, 18) * 0.8;
        const level = Math.max(0, ramp.length - 1.6 - (dy / Math.max(12, peak)) * 1.8 + ridge);
        canvas.set(x, y, hdTone(ramp, level, x, y));
      }
    }
  }
}

function drawPagoda(canvas: Canvas, cx: number, foot: number): void {
  let y = foot;
  for (let tier = 0; tier < 5; tier++) {
    const half = 24 - tier * 3;
    const body = 11 - tier;
    canvas.fill(cx - half + 6, y - body, (half - 6) * 2, body, at(ISLAND, 1));
    canvas.vline(cx + half - 7, y - body, body, at(ISLAND, 2));
    canvas.fill(cx - half, y - body - 3, half * 2, 3, at(ISLAND, 2));
    canvas.hline(cx - half, y - body - 3, half * 2, at(ISLAND, 3));
    canvas.fill(cx - half - 2, y - body - 4, 3, 2, at(ISLAND, 3));
    canvas.fill(cx + half - 1, y - body - 4, 3, 2, at(ISLAND, 3));
    y -= body + 3;
  }
  canvas.fill(cx - 1, y - 16, 2, 16, at(ISLAND, 3));
  for (let ry = y - 13; ry < y - 3; ry += 3) {
    canvas.hline(cx - 2, ry, 4, at(ISLAND, 3));
  }
  canvas.fill(cx - 2, foot - 9, 4, 5, at(LANTERN, 2));
  canvas.fill(cx - 1, foot - 8, 2, 3, at(LANTERN, 3));
  canvas.fill(cx - 2, foot - 23, 3, 3, at(LANTERN, 1));
  for (const [lx, ly] of [
    [454, HORIZON - 6],
    [472, HORIZON - 5],
    [496, HORIZON - 7],
    [594, HORIZON - 5],
    [618, HORIZON - 6],
  ] as const) {
    canvas.fill(lx, ly, 3, 2, at(LANTERN, 1));
    canvas.set(lx + 1, ly, at(LANTERN, 2));
    canvas.hline(lx, HORIZON + 2, 3, at(LANTERN, 0));
  }
}

function drawSea(canvas: Canvas): void {
  canvas.paint(0, HORIZON, canvas.width, canvas.height - HORIZON, (x, y) => {
    const depth = (y - HORIZON) / (canvas.height - HORIZON);
    const wave = Math.sin(x / 28 + y * 0.45) * 0.35;
    const level = (1 - depth) * 3.2 + wave;
    return hdTone(SEA, level, x, y);
  });
  canvas.hline(0, HORIZON, canvas.width, at(SEA, 4));
}

export function drawGlitter(canvas: Canvas, frame: number): void {
  const { x } = MOON_AT;
  for (let y = HORIZON + 4; y < canvas.height - 20; y += 5) {
    const spread = 10 + (y - HORIZON) * 0.2;
    const count = Math.round(4 - (y - HORIZON) / 60);
    for (let dash = 0; dash < Math.max(count, 1); dash++) {
      const offset = Math.sin(dash * 2.3 + y * 0.7 + frame * 2.1) * spread;
      const length = 7 - Math.floor((y - HORIZON) / 50);
      const gx = Math.round(x + offset);
      canvas.hline(gx, y, Math.max(length, 2), at(GLITTER, dash === 0 ? 2 : 1));
      if (dash === 0 && length >= 4) {
        canvas.hline(gx + 1, y + 1, length - 2, at(GLITTER, 0));
      }
    }
  }
}

export function drawBoat(canvas: Canvas, x: number, y: number): void {
  canvas.polygon(
    [
      [x - 2, y - 4],
      [x + 28, y - 4],
      [x + 24, y],
      [x + 2, y],
    ],
    at(WOOD, 1),
  );
  canvas.hline(x - 1, y - 4, 28, at(WOOD, 3));
  canvas.fill(x + 6, y - 8, 10, 4, at(WOOD, 2));
  canvas.hline(x + 5, y - 8, 12, at(WOOD, 4));
  canvas.fill(x + 18, y - 15, 2, 11, at(WOOD, 2));
  canvas.line(x + 18, y - 15, x + 23, y - 12, at(WOOD, 3));
  canvas.fill(x + 21, y - 11, 4, 4, at(LANTERN, 3));
  canvas.set(x + 22, y - 10, at(LANTERN, 4));
  canvas.hline(x + 18, y, 9, at(GLITTER, 1));
}

export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => hdTone(SKY, skyLevel(y), x, y));
  drawMoon(canvas);
  drawCloud(canvas, 120, 96, 260, 10);
  drawCloud(canvas, 640, 170, 220, 8);
  drawCloud(canvas, 980, 60, 180, 7);
  drawSea(canvas);
  drawGlitter(canvas, 0);
  drawIsland(canvas, ISLAND_FAR, 40, 410, 48, 11);
  drawIsland(canvas, ISLAND_FAR, 900, 1240, 34, 13);
  drawIsland(canvas, ISLAND, 370, 770, 82, 17);
  drawPagoda(canvas, 518, HORIZON - 58);
  return canvas;
}
