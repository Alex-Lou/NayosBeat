/**
 * The far layer (docs/art/decor-temple.md §2.1): the sea past the courtyard's wall. A night sky,
 * the moon, a few clouds in flat bands; the sea in clean bands to the horizon, the moon's path on
 * it; the islands' silhouettes, a pagoda on the nearest, one window lit. Opaque everywhere. Flat
 * tones (docs/art/proprete.md): the sky's gradient is the only dither. Image pixels (STAGE_SCALE).
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, GLITTER, ISLAND, ISLAND_FAR, LANTERN, MOON, SEA, SKY, WOOD } from './palette.ts';

/** The horizon's row: the sea from here down. */
export const HORIZON = 268;
export const MOON_AT = { x: 860, y: 118, radius: 26 } as const;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.3;
}

/** A cloud: a long flat band, lit along its underside, its ends rounded. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.ellipse(x, y, width, height);
  mask.ellipse(x + width * 0.2, y - height * 0.5, width * 0.45, height * 1.2);
  mask.ellipse(x + width * 0.5, y - height * 0.3, width * 0.35, height);
  canvas.paint(x - 2, y - height, width + 4, height * 2 + 2, (px, py) => {
    if (!mask.has(px, py)) return undefined;
    const under = !mask.has(px, py + 2);
    const top = !mask.has(px, py - 1);
    return at(CLOUD, under ? 3 : top ? 2 : 1);
  });
}

/** The moon: a flat disc, a lighter crescent on its lit side, a faint ring of light around it. */
function drawMoon(canvas: Canvas): void {
  const { x, y, radius } = MOON_AT;
  canvas.paint(x - radius - 10, y - radius - 10, radius * 2 + 20, radius * 2 + 20, (px, py) => {
    const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
    if (d > radius + 8) return undefined;
    if (d > radius) return d < radius + 3 ? at(SKY, 8) : undefined;
    const lit = Math.hypot(px + 0.5 - (x + 6), py + 0.5 - (y - 4)) < radius - 2;
    return at(MOON, lit ? 2 : 1);
  });
}

/** An island's silhouette along the horizon: a smooth ridge, its height a soft noise. */
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
    const rough = noise(seed, x, 0, 60) * 0.35;
    const top = Math.round(HORIZON - peak * hill * (0.75 + rough));
    for (let y = top; y < HORIZON + 2; y++) {
      // Lit along its ridge by the moon, flat below.
      canvas.set(x, y, at(ramp, y - top < 2 ? ramp.length - 1 : 1));
    }
  }
}

/** A pagoda on the nearest island: five roofs, narrower and narrower, a window lit. */
function drawPagoda(canvas: Canvas, cx: number, foot: number): void {
  let y = foot;
  for (let tier = 0; tier < 5; tier++) {
    const half = 22 - tier * 3;
    const body = 12 - tier;
    canvas.fill(cx - half + 6, y - body, (half - 6) * 2, body, at(ISLAND, 1));
    // The roof's eave, flaring at its ends.
    canvas.fill(cx - half, y - body - 3, half * 2, 3, at(ISLAND, 3));
    canvas.set(cx - half - 1, y - body - 4, at(ISLAND, 3));
    canvas.set(cx + half, y - body - 4, at(ISLAND, 3));
    y -= body + 3;
  }
  canvas.fill(cx - 1, y - 14, 2, 14, at(ISLAND, 3));
  canvas.fill(cx - 2, foot - 9, 4, 4, at(LANTERN, 2));
}

/** The sea: flat bands from the horizon down, a little lighter near it. */
function drawSea(canvas: Canvas): void {
  canvas.paint(0, HORIZON, canvas.width, canvas.height - HORIZON, (x, y) => {
    const band = Math.floor((y - HORIZON) / 26);
    const swell = (y - HORIZON) % 26 === 0 && noise(7, x, y, 40) > 0.55 ? 1 : 0;
    return at(SEA, Math.max(0, 3 - band) + swell);
  });
}

/** The moon's path on the sea: short flat dashes under it, sparser away. */
export function drawGlitter(canvas: Canvas, frame: number): void {
  const { x } = MOON_AT;
  for (let y = HORIZON + 4; y < canvas.height - 20; y += 6) {
    const spread = 10 + (y - HORIZON) * 0.18;
    const count = Math.round(4 - (y - HORIZON) / 60);
    for (let dash = 0; dash < Math.max(count, 1); dash++) {
      const offset = Math.sin(dash * 2.3 + y * 0.7 + frame * 2.1) * spread;
      const length = 6 - Math.floor((y - HORIZON) / 50);
      canvas.hline(Math.round(x + offset), y, Math.max(length, 2), at(GLITTER, dash === 0 ? 2 : 1));
    }
  }
}

/** A fishing boat far off, its lantern: drawn at x, its waterline on row y (index.ts). */
export function drawBoat(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x, y - 3, 26, 3, at(WOOD, 1));
  canvas.fill(x + 2, y - 4, 22, 1, at(WOOD, 2));
  canvas.fill(x + 10, y - 16, 2, 12, at(WOOD, 1));
  canvas.fill(x + 13, y - 11, 4, 4, at(LANTERN, 3));
  canvas.hline(x + 11, y, 8, at(GLITTER, 0));
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  drawMoon(canvas);
  drawCloud(canvas, 120, 96, 260, 10);
  drawCloud(canvas, 640, 170, 220, 8);
  drawCloud(canvas, 980, 60, 180, 7);
  drawSea(canvas);
  drawGlitter(canvas, 0);
  drawIsland(canvas, ISLAND_FAR, 380, 760, 46, 11);
  drawIsland(canvas, ISLAND_FAR, 900, 1240, 34, 13);
  drawIsland(canvas, ISLAND, -40, 420, 92, 17);
  drawPagoda(canvas, 210, HORIZON - 66);
  return canvas;
}
