/**
 * The far layer (docs/art/decor-plage.md §2.1): the open sea at the golden hour. The sky from deep
 * blue to amber, a few long clouds lit from below, the low sun setting into the sea, its path of
 * light on the water; a headland on the left, its palms; the sea in clean bands to the shore.
 * Opaque everywhere. Flat tones (docs/art/proprete.md): the sky's gradient is the only dither.
 * Image pixels (STAGE_SCALE).
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, GLITTER, GULL, HEADLAND, SEA, SKY, STRIPE, SUN, WOOD } from './palette.ts';

/** The horizon's row: the sea from here down. */
export const HORIZON = 300;
export const SUN_AT = { x: 720, y: HORIZON - 14, radius: 30 } as const;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.2;
}

/** A cloud: a long flat band, lit along its underside, its ends rounded. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.ellipse(x, y, width, height);
  mask.ellipse(x + width * 0.25, y - height * 0.5, width * 0.4, height * 1.2);
  mask.ellipse(x + width * 0.55, y - height * 0.3, width * 0.3, height);
  canvas.paint(x - 2, y - height, width + 4, height * 2 + 2, (px, py) => {
    if (!mask.has(px, py)) return undefined;
    const under = !mask.has(px, py + 2);
    const top = !mask.has(px, py - 1);
    return at(CLOUD, under ? 3 : top ? 2 : 1);
  });
}

/** The sun setting: a flat disc cut by the horizon, its core, a ring of light around it. */
function drawSun(canvas: Canvas): void {
  const { x, y, radius } = SUN_AT;
  canvas.paint(
    x - radius - 12,
    y - radius - 12,
    radius * 2 + 24,
    HORIZON - y + radius + 12,
    (px, py) => {
      if (py >= HORIZON) return undefined;
      const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
      if (d > radius + 10) return undefined;
      if (d > radius) return d < radius + 4 ? at(SKY, 8) : undefined;
      return at(SUN, d < radius - 8 ? 2 : 1);
    },
  );
}

/** The headland on the left: a long low ridge, its palms. */
function drawHeadland(canvas: Canvas): void {
  const left = -40;
  const right = 420;
  for (let x = Math.max(left, 0); x < right; x++) {
    const t = (x - left) / (right - left);
    const hill = Math.sin(t * Math.PI) ** 0.6;
    const rough = noise(41, x, 0, 80) * 0.3;
    const top = Math.round(HORIZON - 54 * hill * (0.8 + rough));
    for (let y = top; y < HORIZON + 3; y++) {
      canvas.set(x, y, at(HEADLAND, y - top < 2 ? 2 : y >= HORIZON ? 0 : 1));
    }
  }
  for (const [x, tall] of [
    [120, 40],
    [168, 52],
    [300, 34],
  ] as const) {
    const foot = HORIZON - 44;
    canvas.line(x, foot, x + 6, foot - tall, at(HEADLAND, 0), 2);
    for (const [dx, dy] of [
      [-14, 6],
      [14, 6],
      [-9, 9],
      [9, 10],
      [-12, 1],
      [12, 1],
    ] as const) {
      canvas.line(x + 6, foot - tall, x + 6 + dx, foot - tall + dy, at(HEADLAND, 0), 2);
    }
  }
}

/** The sea: flat bands from the horizon down, the lighter near it, a swell line now and then. */
function drawSea(canvas: Canvas): void {
  canvas.paint(0, HORIZON, canvas.width, canvas.height - HORIZON, (x, y) => {
    const band = Math.floor((y - HORIZON) / 40);
    const swell = (y - HORIZON) % 40 === 0 && noise(9, x, y, 50) > 0.5 ? 1 : 0;
    return at(SEA, Math.max(0, 4 - band) - swell);
  });
}

/** The sun's path on the sea: short flat dashes under it, sparser and longer nearer (`frame`). */
export function drawGlitter(canvas: Canvas, frame: number): void {
  const { x } = SUN_AT;
  for (let y = HORIZON + 3; y < canvas.height - 10; y += 7) {
    const spread = 14 + (y - HORIZON) * 0.25;
    const count = Math.max(1, Math.round(5 - (y - HORIZON) / 50));
    for (let dash = 0; dash < count; dash++) {
      const offset = Math.sin(dash * 2.3 + y * 0.7 + frame * 2.1) * spread;
      const length = Math.max(3, 9 - Math.floor((y - HORIZON) / 40));
      canvas.hline(Math.round(x + offset), y, length, at(GLITTER, dash === 0 ? 2 : 1));
    }
  }
}

/** A sailboat far out, its sail lit by the sun: drawn at x, its waterline on row y (index.ts). */
export function drawSail(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x, y - 3, 24, 3, at(WOOD, 1));
  canvas.fill(x + 11, y - 30, 2, 27, at(WOOD, 0));
  const sail = new Mask(canvas.width, canvas.height);
  sail.polygon([
    [x + 13, y - 29],
    [x + 13, y - 5],
    [x + 26, y - 5],
  ]);
  canvas.paint(x + 13, y - 29, 14, 25, (px, py) =>
    sail.has(px, py) ? at(STRIPE, sail.has(px + 1, py) ? 3 : 2) : undefined,
  );
  canvas.hline(x + 2, y, 18, at(GLITTER, 0));
}

/** A gull at x, y: wings up (`frame` 0) or down (1). */
export function drawGull(canvas: Canvas, x: number, y: number, frame: number): void {
  const tip = frame === 0 ? -4 : 3;
  canvas.line(x - 7, y + tip, x - 2, y, at(GULL, 1));
  canvas.line(x - 2, y, x, y + 1, at(GULL, 1));
  canvas.line(x, y + 1, x + 2, y, at(GULL, 1));
  canvas.line(x + 2, y, x + 7, y + tip, at(GULL, 1));
  canvas.set(x, y + 1, at(GULL, 0));
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  drawSun(canvas);
  drawCloud(canvas, 90, 70, 300, 9);
  drawCloud(canvas, 520, 150, 260, 8);
  drawCloud(canvas, 880, 100, 240, 7);
  drawCloud(canvas, 640, 236, 180, 5);
  drawSea(canvas);
  drawGlitter(canvas, 0);
  drawHeadland(canvas);
  return canvas;
}
