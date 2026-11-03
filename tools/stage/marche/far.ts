/**
 * The far layer (docs/art/decor-night-market.md §2.1): the city behind the market. Two skylines,
 * the farthest off the haze, the nearer in flat silhouettes with lit windows and rooftop details;
 * the moon and a few stars; an elevated line above the roofs, where a train passes once a cycle;
 * wires between poles, a few lanterns on them. Opaque everywhere. Flat tones (docs/art/proprete.md):
 * the sky's gradient is the only dither. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  AWNING_RED,
  CLOUD,
  DISTANT,
  DISTANT_FAR,
  HAZE,
  LANTERN,
  LANTERN_FRAME,
  MOON,
  SKY,
  TRAIN,
  TRAIN_LIGHT,
  WINDOW,
  WIRE,
} from './palette.ts';

/** The horizon's row: the city from here down. */
export const HORIZON = 300;
/** The elevated line: its beam, and the train that runs on it (height above the roofs). */
export const TRACK_Y = 188;
export const TRAIN_Y = 150;
export const TRAIN_SIZE = { width: 360, height: 36 } as const;
export const TRAIN_RECT = { x: 410, y: 146, width: 384, height: 48 } as const;
const SEED = 71;
const MOON_AT = { x: 238, y: 92, radius: 16 } as const;

/** The farthest skyline, low and pale, its towers close to the haze. */
const FAR_BUILDINGS: readonly { x: number; width: number; top: number }[] = [
  { x: -20, width: 170, top: 292 },
  { x: 150, width: 130, top: 276 },
  { x: 280, width: 90, top: 304 },
  { x: 370, width: 160, top: 286 },
  { x: 530, width: 120, top: 312 },
  { x: 650, width: 180, top: 282 },
  { x: 830, width: 110, top: 300 },
  { x: 940, width: 150, top: 272 },
  { x: 1090, width: 130, top: 294 },
];

/** The near skyline: a few masses, their tops at different heights, gaps of haze between them. */
const NEAR_BUILDINGS: readonly { x: number; width: number; top: number }[] = [
  { x: -20, width: 150, top: 252 },
  { x: 142, width: 96, top: 276 },
  { x: 250, width: 66, top: 214 },
  { x: 328, width: 150, top: 262 },
  { x: 492, width: 118, top: 238 },
  { x: 622, width: 86, top: 284 },
  { x: 720, width: 156, top: 246 },
  { x: 892, width: 96, top: 198 },
  { x: 1000, width: 220, top: 268 },
];

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.25;
}

/** The moon, high and dim, its ring, and a scattering of stars. */
function drawSky(canvas: Canvas, width: number): void {
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  const { x: mx, y: my, radius } = MOON_AT;
  canvas.paint(mx - radius - 10, my - radius - 10, radius * 2 + 20, radius * 2 + 20, (x, y) => {
    const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
    if (d > radius + 8) return undefined;
    if (d > radius) return d < radius + 3 ? at(MOON, 0) : undefined;
    return at(MOON, d < radius - 6 ? 2 : 1);
  });
  for (let index = 0; index < 34; index++) {
    const x = Math.round(noise(SEED + 40, index, 0, width));
    const y = Math.round(12 + noise(SEED + 41, 0, index, 170));
    const bright = noise(SEED + 42, index, 1, 10) > 0.7;
    canvas.set(x, y, at(MOON, bright ? 1 : 0));
  }
}

/** A low cloud: a long flat band, a step lighter on its underside. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/** A distant tower: a flat pale mass, a few windows, a rooftop box. */
function drawFarTower(
  canvas: Canvas,
  { x, width, top }: { x: number; width: number; top: number },
): void {
  canvas.fill(x, top, width, canvas.height - top, at(DISTANT_FAR, 1));
  canvas.hline(x, top, width, at(DISTANT_FAR, 3));
  canvas.fill(x, top, 2, canvas.height - top, at(DISTANT_FAR, 0));
  for (let column = 0; column * 18 + 8 < width - 4; column++) {
    for (let row = top + 14; row < HORIZON - 8; row += 22) {
      if (noise(SEED + 10, x + column * 18, row, 17) < 0.82) continue;
      canvas.fill(x + 8 + column * 18, row, 2, 3, at(WINDOW, 0));
    }
  }
  if (width > 80) canvas.fill(x + 10, top - 8, 16, 8, at(DISTANT_FAR, 2));
}

/** A near tower: a flat mass, its roof line, a sparse grid of small lit windows, a detail. */
function drawNearTower(
  canvas: Canvas,
  { x, width, top }: { x: number; width: number; top: number },
  detail: number,
): void {
  canvas.fill(x, top, width, canvas.height - top, at(DISTANT, 1));
  canvas.hline(x, top, width, at(DISTANT, 2));
  canvas.fill(x, top, 3, canvas.height - top, at(DISTANT, 2));
  canvas.fill(x + width - 2, top, 2, canvas.height - top, at(DISTANT, 0));
  for (let column = 0; column * 14 + 8 < width - 6; column++) {
    for (let row = top + 12; row < Math.min(HORIZON - 10, top + 120); row += 16) {
      const lit = noise(SEED, x + column * 14, row, 13) > 0.7;
      if (!lit) continue;
      canvas.fill(x + 8 + column * 14, row, 2, 3, at(WINDOW, column % 4 === 0 ? 1 : 0));
    }
  }
  if (detail === 0) {
    // A water tank on legs.
    const tank = x + Math.round(width * 0.62);
    canvas.fill(tank, top - 16, 18, 12, at(DISTANT, 1));
    canvas.hline(tank, top - 16, 18, at(DISTANT, 2));
    canvas.vline(tank + 3, top - 4, 4, at(DISTANT, 0));
    canvas.vline(tank + 14, top - 4, 4, at(DISTANT, 0));
  } else if (detail === 1) {
    // An antenna, and its red light.
    const mast = x + Math.round(width * 0.3);
    canvas.vline(mast, top - 26, 26, at(DISTANT, 2));
    canvas.hline(mast - 5, top - 20, 11, at(DISTANT, 1));
    canvas.fill(mast - 1, top - 30, 3, 3, at(WINDOW, 2));
  } else {
    // A stair hut, its rail.
    const hut = x + Math.round(width * 0.55);
    canvas.fill(hut, top - 10, 20, 10, at(DISTANT, 2));
    canvas.hline(hut, top - 10, 20, at(DISTANT, 3));
    canvas.vline(hut + 4, top - 5, 5, at(DISTANT, 0));
  }
}

/** The elevated line: its beam and its pillars, above the roofs. */
function drawTrack(canvas: Canvas, width: number): void {
  canvas.fill(0, TRACK_Y, width, 4, at(TRAIN, 2));
  canvas.hline(0, TRACK_Y, width, at(TRAIN, 1));
  canvas.hline(0, TRACK_Y + 3, width, at(TRAIN, 0));
  for (let x = 40; x < width; x += 190) {
    canvas.fill(x, TRACK_Y + 4, 4, 100, at(TRAIN, 0));
    canvas.fill(x - 4, TRACK_Y + 12, 12, 3, at(TRAIN, 1));
  }
}

/** The train: four cars, their lit windows, its headlight; drawn at x, y (index.ts). */
export function drawTrain(canvas: Canvas, x: number, y: number): void {
  const { width, height } = TRAIN_SIZE;
  canvas.fill(x, y + 4, width, height - 4, at(TRAIN, 1));
  canvas.hline(x, y + 4, width, at(TRAIN, 2));
  canvas.hline(x, y + height - 1, width, at(TRAIN, 0));
  // The nose, at the front (right), cut on a slant.
  canvas.paint(x + width - 16, y + 4, 16, height - 4, (px, py) => {
    const cut = (px - (x + width - 16)) * 0.5;
    if (py - (y + 4) < cut) return undefined;
    return at(TRAIN, py - (y + 4) < cut + 3 ? 2 : 1);
  });
  for (let car = 0; car < 4; car++) {
    const left = x + 6 + car * 88;
    canvas.vline(left, y + 6, height - 9, at(TRAIN, 0));
    for (let window = 0; window < 4; window++) {
      const wx = left + 8 + window * 18;
      canvas.fill(wx, y + 10, 11, 8, at(TRAIN_LIGHT, window === 0 ? 1 : 0));
      canvas.hline(wx, y + 10, 11, at(TRAIN_LIGHT, 2));
    }
    canvas.fill(left + 6, y + height - 8, 76, 2, at(TRAIN, 0));
  }
  // The headlight, and the red light at the back.
  canvas.fill(x + width - 6, y + 16, 5, 5, at(TRAIN_LIGHT, 2));
  canvas.fill(x + 1, y + 16, 3, 4, at(AWNING_RED, 2));
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
  drawSky(canvas, width);
  // The warm haze above the roofs, and the low distance between the towers.
  canvas.fill(0, HORIZON - 34, width, 34, at(HAZE, 0));
  canvas.fill(0, HORIZON - 12, width, 8, at(HAZE, 1));
  canvas.hline(0, HORIZON - 6, width, at(HAZE, 2));
  drawCloud(canvas, 120, 96, 340, 10);
  drawCloud(canvas, 640, 150, 300, 8);
  drawCloud(canvas, 1010, 70, 180, 7);
  drawCloud(canvas, 420, 210, 220, 6);
  canvas.fill(0, HORIZON, width, height - HORIZON, at(HAZE, 0));
  canvas.fill(0, height - 46, width, 46, at(DISTANT, 0));
  FAR_BUILDINGS.forEach((building) => {
    drawFarTower(canvas, building);
  });
  drawTrack(canvas, width);
  NEAR_BUILDINGS.forEach((building, index) => {
    drawNearTower(canvas, building, index % 3);
  });
  drawWire(canvas, [0, 118], [420, 142], 26, [150, 330]);
  drawWire(canvas, [520, 132], [900, 108], 22, [640, 820]);
  drawWire(canvas, [960, 150], [width, 128], 24, [1100, 1300]);
  return canvas;
}
