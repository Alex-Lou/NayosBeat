/**
 * The far layer (docs/art/decor-temple.md §2.1): the sea and archipelago past the courtyard's wall,
 * in high-detail pixel art. Starry twilight sky with a luminous moon halo, silver-rimmed clouds,
 * tiered mountain islands, a five-story illuminated pagoda, a cliffside torii and coastal harbor
 * village with warm water reflections, moonlit sea swells, and the drifting fishing boat.
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  BRONZE,
  CLOUD,
  GLITTER,
  ISLAND,
  ISLAND_FAR,
  LACQUER,
  LANTERN,
  MOON,
  SEA,
  SKY,
  WOOD,
} from './palette.ts';

export const HORIZON = 268;
export const MOON_AT = { x: 860, y: 112, radius: 28 } as const;

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
  return (SKY.length - 1) * t ** 1.15;
}

function drawStars(canvas: Canvas): void {
  for (let i = 0; i < 42; i++) {
    const sx = (i * 173 + 29) % canvas.width;
    const sy = (i * 67 + 13) % (HORIZON - 80);
    if (Math.hypot(sx - MOON_AT.x, sy - MOON_AT.y) < MOON_AT.radius + 34) continue;
    const bright = i % 5 === 0;
    canvas.set(sx, sy, at(GLITTER, bright ? 2 : 1));
    if (bright) {
      canvas.set(sx + 1, sy, at(GLITTER, 0));
      canvas.set(sx, sy + 1, at(GLITTER, 0));
    }
  }
}

function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.ellipse(x, y, width, height);
  mask.ellipse(x + width * 0.16, y - height * 0.6, width * 0.48, height * 1.3);
  mask.ellipse(x + width * 0.48, y - height * 0.4, width * 0.38, height * 1.1);
  canvas.paint(x - 2, y - height, width + 4, height * 2 + 2, (px, py) => {
    if (!mask.has(px, py)) return undefined;
    const under = !mask.has(px, py + 2);
    const top = !mask.has(px, py - 1);
    if (under) return at(CLOUD, 3);
    if (top) return at(CLOUD, 2);
    const depth = (py - (y - height * 0.5)) / Math.max(1, height * 1.5);
    return hdTone(CLOUD, 1 + depth * 1.7, px, py);
  });
}

function drawMoon(canvas: Canvas): void {
  const { x, y, radius } = MOON_AT;
  canvas.paint(x - radius - 26, y - radius - 26, radius * 2 + 52, radius * 2 + 52, (px, py) => {
    const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
    if (d > radius + 24) return undefined;
    if (d > radius) {
      const t = 1 - (d - radius) / 24;
      return hdTone(SKY, skyLevel(py) + t * 2.6, px, py);
    }
    const lit = Math.hypot(px + 0.5 - (x + 6), py + 0.5 - (y - 4));
    if (lit >= radius - 2) return at(MOON, 0);
    return hdTone(MOON, 1.45 + (1 - lit / (radius - 2)) * 0.55, px, py);
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
    const hill = Math.sin(t * Math.PI) ** 0.68;
    const rough = noise(seed, x, 0, 52) * 0.34 + noise(seed + 1, x, 0, 14) * 0.08;
    const top = Math.round(HORIZON - peak * hill * (0.74 + rough));
    for (let y = top; y < HORIZON + 2; y++) {
      const dy = y - top;
      if (dy < 2) {
        canvas.set(x, y, at(ramp, ramp.length - 1));
      } else {
        const ridge = noise(seed + 2, x >> 2, y >> 1, 16) * 0.85;
        const level = Math.max(0, ramp.length - 1.5 - (dy / Math.max(12, peak)) * 1.7 + ridge);
        canvas.set(x, y, hdTone(ramp, level, x, y));
      }
    }
  }
}

function drawPagodaAndHarbor(canvas: Canvas, cx: number, foot: number): void {
  let y = foot;
  for (let tier = 0; tier < 5; tier++) {
    const half = 25 - tier * 3;
    const body = 11 - tier;
    canvas.fill(cx - half + 6, y - body, (half - 6) * 2, body, at(ISLAND, 1));
    canvas.vline(cx + half - 7, y - body, body, at(ISLAND, 3));
    canvas.fill(cx - half, y - body - 3, half * 2, 3, at(ISLAND, 2));
    canvas.hline(cx - half, y - body - 3, half * 2, at(ISLAND, 3));
    canvas.fill(cx - half - 2, y - body - 4, 3, 2, at(ISLAND, 3));
    canvas.fill(cx + half - 1, y - body - 4, 3, 2, at(ISLAND, 3));
    canvas.set(cx - half + 1, y - body, at(LANTERN, 3));
    canvas.set(cx + half - 2, y - body, at(LANTERN, 3));
    y -= body + 3;
  }
  canvas.fill(cx - 1, y - 16, 2, 16, at(BRONZE, 3));
  for (let ry = y - 13; ry < y - 3; ry += 3) {
    canvas.hline(cx - 2, ry, 4, at(BRONZE, 2));
  }
  canvas.fill(cx - 2, foot - 9, 4, 5, at(LANTERN, 3));
  canvas.fill(cx - 1, foot - 8, 2, 3, at(LANTERN, 4));
  canvas.fill(cx - 2, foot - 23, 4, 4, at(LANTERN, 2));
  canvas.fill(cx - 2, foot - 36, 3, 3, at(LANTERN, 2));

  const tx = cx + 56;
  const ty = HORIZON - 24;
  canvas.fill(tx - 6, ty - 10, 2, 12, at(LACQUER, 3));
  canvas.fill(tx + 4, ty - 10, 2, 12, at(LACQUER, 3));
  canvas.hline(tx - 9, ty - 11, 18, at(LACQUER, 4));
  canvas.hline(tx - 7, ty - 8, 14, at(LACQUER, 3));

  for (const [hx, hy, hw] of [
    [438, HORIZON - 9, 14],
    [458, HORIZON - 11, 18],
    [484, HORIZON - 8, 14],
    [542, HORIZON - 10, 16],
    [592, HORIZON - 9, 16],
    [614, HORIZON - 8, 12],
  ] as const) {
    canvas.fill(hx, hy, hw, HORIZON - hy, at(ISLAND, 1));
    canvas.hline(hx - 1, hy, hw + 2, at(ISLAND, 3));
    canvas.fill(hx + 3, hy + 3, 3, 3, at(LANTERN, 3));
    if (hw >= 16) canvas.fill(hx + 9, hy + 3, 3, 3, at(LANTERN, 2));
    canvas.hline(hx + 2, HORIZON + 2, 4, at(LANTERN, 1));
    canvas.hline(hx + 3, HORIZON + 5, 3, at(LANTERN, 2));
  }
}

function drawSea(canvas: Canvas): void {
  canvas.paint(0, HORIZON, canvas.width, canvas.height - HORIZON, (x, y) => {
    const depth = (y - HORIZON) / (canvas.height - HORIZON);
    const wave = Math.sin(x / 26 + y * 0.42) * 0.4;
    const level = (1 - depth) * 3.4 + wave;
    return hdTone(SEA, level, x, y);
  });
  canvas.hline(0, HORIZON, canvas.width, at(SEA, 4));
}

export function drawGlitter(canvas: Canvas, frame: number): void {
  const { x } = MOON_AT;
  for (let y = HORIZON + 3; y < canvas.height - 18; y += 4) {
    const spread = 12 + (y - HORIZON) * 0.22;
    const count = Math.round(4 - (y - HORIZON) / 55);
    for (let dash = 0; dash < Math.max(count, 1); dash++) {
      const offset = Math.sin(dash * 2.3 + y * 0.7 + frame * 2.1) * spread;
      const length = 8 - Math.floor((y - HORIZON) / 48);
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
    at(WOOD, 2),
  );
  canvas.hline(x - 1, y - 4, 28, at(WOOD, 4));
  canvas.fill(x + 6, y - 8, 10, 4, at(WOOD, 3));
  canvas.hline(x + 5, y - 8, 12, at(WOOD, 4));
  canvas.fill(x + 18, y - 15, 2, 11, at(WOOD, 3));
  canvas.line(x + 18, y - 15, x + 23, y - 12, at(WOOD, 4));
  canvas.fill(x + 21, y - 11, 4, 4, at(LANTERN, 3));
  canvas.set(x + 22, y - 10, at(LANTERN, 4));
  canvas.hline(x + 18, y, 9, at(GLITTER, 2));
}

export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => hdTone(SKY, skyLevel(y), x, y));
  drawStars(canvas);
  drawMoon(canvas);
  drawCloud(canvas, 110, 92, 260, 10);
  drawCloud(canvas, 620, 166, 220, 8);
  drawCloud(canvas, 970, 58, 190, 8);
  drawSea(canvas);
  drawGlitter(canvas, 0);
  drawIsland(canvas, ISLAND_FAR, 30, 400, 50, 11);
  drawIsland(canvas, ISLAND_FAR, 900, 1240, 36, 13);
  drawIsland(canvas, ISLAND, 360, 780, 84, 17);
  drawPagodaAndHarbor(canvas, 518, HORIZON - 58);
  return canvas;
}
