/**
 * The far layer (docs/art/decor-night-market.md §2.1): the city behind the market. The sky from a
 * deep indigo to a warm haze above the roofs, low clouds; the towers in flat silhouettes, a few
 * windows lit, one tall tower with its red light; wires hanging between poles, a few lanterns on
 * them. Opaque everywhere. Flat tones (docs/art/proprete.md): the sky's gradient is the only dither.
 * Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, DISTANT, HAZE, LANTERN, LANTERN_FRAME, SKY, WINDOW, WIRE } from './palette.ts';

/** The horizon's row: the city from here down. */
export const HORIZON = 300;
const SEED = 71;

/** The far skyline: a few masses, their tops at different heights, gaps of haze between them. */
const BUILDINGS: readonly { x: number; width: number; top: number }[] = [
  { x: -20, width: 150, top: 252 },
  { x: 142, width: 96, top: 276 },
  { x: 250, width: 66, top: 214 },
  { x: 328, width: 150, top: 262 },
  { x: 492, width: 118, top: 238 },
  { x: 622, width: 86, top: 284 },
  { x: 720, width: 156, top: 246 },
  { x: 892, width: 96, top: 196 },
  { x: 1000, width: 220, top: 268 },
];

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.25;
}

/** A low cloud: a long flat band, a step lighter on its underside. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/** A building: a flat mass, its roof line, a sparse grid of small lit windows, a rooftop detail. */
function drawBuilding(
  canvas: Canvas,
  { x, width, top }: { x: number; width: number; top: number },
  detail: number,
): void {
  canvas.fill(x, top, width, canvas.height - top, at(DISTANT, 1));
  canvas.hline(x, top, width, at(DISTANT, 2));
  canvas.fill(x, top, 3, canvas.height - top, at(DISTANT, 2));
  for (let column = 0; column * 14 + 8 < width - 6; column++) {
    for (let row = top + 12; row < Math.min(HORIZON - 10, top + 120); row += 16) {
      const lit = noise(SEED, x + column * 14, row, 13) > 0.7;
      if (!lit) continue;
      canvas.fill(x + 8 + column * 14, row, 2, 3, at(WINDOW, column % 4 === 0 ? 1 : 0));
    }
  }
  if (detail === 0) {
    // A water tank on legs.
    canvas.fill(x + Math.round(width * 0.62), top - 16, 18, 12, at(DISTANT, 1));
    canvas.hline(x + Math.round(width * 0.62), top - 16, 18, at(DISTANT, 2));
    canvas.vline(x + Math.round(width * 0.62) + 3, top - 4, 4, at(DISTANT, 0));
    canvas.vline(x + Math.round(width * 0.62) + 14, top - 4, 4, at(DISTANT, 0));
  } else if (detail === 1) {
    // An antenna, and its red light.
    const mast = x + Math.round(width * 0.3);
    canvas.vline(mast, top - 26, 26, at(DISTANT, 2));
    canvas.hline(mast - 5, top - 20, 11, at(DISTANT, 1));
    canvas.fill(mast - 1, top - 30, 3, 3, at(WINDOW, 2));
  }
}

/** A wire hanging from `from` to `to`, sagging by `sag`, with small lanterns on it. */
function drawWire(
  canvas: Canvas,
  from: readonly [number, number],
  to: readonly [number, number],
  sag: number,
  lanterns: readonly number[],
): void {
  for (let x = from[0]; x <= to[0]; x++) {
    const t = (x - from[0]) / (to[0] - from[0]);
    const y = Math.round(from[1] + (to[1] - from[1]) * t + sag * Math.sin(t * Math.PI));
    canvas.set(x, y, at(WIRE, 1));
  }
  for (const lanternX of lanterns) {
    const t = (lanternX - from[0]) / (to[0] - from[0]);
    const y = Math.round(from[1] + (to[1] - from[1]) * t + sag * Math.sin(t * Math.PI)) + 1;
    canvas.vline(lanternX, y, 3, at(WIRE, 0));
    canvas.fill(lanternX - 3, y + 3, 7, 6, at(LANTERN, 2));
    canvas.hline(lanternX - 3, y + 3, 7, at(LANTERN_FRAME, 1));
    canvas.hline(lanternX - 3, y + 9, 7, at(LANTERN_FRAME, 0));
    canvas.fill(lanternX - 1, y + 5, 3, 2, at(LANTERN, 4));
  }
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  // The warm haze above the roofs, and the low distance between the towers.
  canvas.fill(0, HORIZON - 34, width, 34, at(HAZE, 0));
  canvas.fill(0, HORIZON - 12, width, 8, at(HAZE, 1));
  canvas.hline(0, HORIZON - 6, width, at(HAZE, 2));
  drawCloud(canvas, 120, 96, 340, 10);
  drawCloud(canvas, 640, 150, 300, 8);
  drawCloud(canvas, 1010, 70, 180, 7);
  canvas.fill(0, HORIZON, width, height - HORIZON, at(HAZE, 0));
  canvas.fill(0, height - 46, width, 46, at(DISTANT, 0));
  BUILDINGS.forEach((building, index) => {
    drawBuilding(canvas, building, index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : 2);
  });
  drawWire(canvas, [0, 118], [420, 142], 26, [150, 330]);
  drawWire(canvas, [520, 132], [900, 108], 22, [640, 820]);
  drawWire(canvas, [960, 150], [width, 128], 24, [1100, 1300]);
  return canvas;
}
