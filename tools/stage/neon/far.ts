/**
 * The far layer (docs/art/decor-neon-dusk.md §2.1): the megacity at night. The sky from a deep
 * indigo to a warm haze, two skylines of towers with steady lights and antennas, a dim holo
 * billboard, and the flying cars that glide above the roofs (`car0`, `car1`, index.ts). Opaque
 * everywhere. Flat tones (docs/art/proprete.md): the sky's gradient is the only dither. Image
 * pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import {
  CAR,
  CAR_LIGHT,
  CLOUD,
  DISTANT,
  DISTANT_FAR,
  HAZE,
  NEON_GREEN,
  NEON_ORANGE,
  SKY,
  WINDOW,
} from './palette.ts';

/** The horizon's row: the city from here down. */
export const HORIZON = 300;
/** The flying cars: where the near one passes (the moment), and the far one, higher. */
export const CAR0_RECT = { x: 430, y: 182, width: 124, height: 30 } as const;
export const CAR1_RECT = { x: 400, y: 132, width: 100, height: 26 } as const;
export const CAR0_Y = 192;
export const CAR1_Y = 140;
const SEED = 113;

/** The farthest skyline, low and pale. */
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

/** The near skyline: darker towers of uneven heights, gaps of haze between them. */
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

/** A low cloud, a long flat band, a step lighter on its underside. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/** A far tower: a flat pale mass, a few windows, a rooftop box. */
function drawFarTower(
  canvas: Canvas,
  { x, width, top }: { x: number; width: number; top: number },
): void {
  canvas.fill(x, top, width, canvas.height - top, at(DISTANT_FAR, 1));
  canvas.hline(x, top, width, at(DISTANT_FAR, 3));
  for (let column = 0; column * 18 + 8 < width - 4; column++) {
    for (let row = top + 14; row < HORIZON - 8; row += 22) {
      if (noise(SEED + 10, x + column * 18, row, 17) < 0.82) continue;
      canvas.fill(x + 8 + column * 18, row, 2, 3, at(WINDOW, 0));
    }
  }
}

/** A near tower: a dark mass, its roofline, a sparse grid of lit windows, an antenna. */
function drawNearTower(
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
    const mast = x + Math.round(width * 0.3);
    canvas.vline(mast, top - 26, 26, at(DISTANT, 2));
    canvas.hline(mast - 5, top - 20, 11, at(DISTANT, 1));
    canvas.fill(mast - 1, top - 30, 3, 3, at(WINDOW, 2));
  } else if (detail === 1) {
    const tank = x + Math.round(width * 0.62);
    canvas.fill(tank, top - 16, 18, 12, at(DISTANT, 1));
    canvas.hline(tank, top - 16, 18, at(DISTANT, 2));
  } else {
    const hut = x + Math.round(width * 0.55);
    canvas.fill(hut, top - 10, 20, 10, at(DISTANT, 2));
  }
}

/** The holo billboard: a dim panel on a near tower, its glow steady, never blinking. */
function drawBillboard(canvas: Canvas): void {
  const { x, top } = NEAR_BUILDINGS[3] ?? { x: 0, top: 0 };
  const px = x + 20;
  canvas.fill(px, top - 26, 90, 22, at(DISTANT, 2));
  canvas.hline(px, top - 26, 90, at(NEON_GREEN, 2));
  canvas.fill(px + 6, top - 20, 78, 10, at(NEON_GREEN, 1));
  canvas.hline(px + 6, top - 20, 78, at(NEON_GREEN, 3));
  canvas.fill(px + 10, top - 17, 40, 4, at(NEON_ORANGE, 2));
}

/** A flying car, its nose left, at x, y: the body, its cabin, its lights, its trail. */
export function drawCar(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.fill(x, y + 3, width, height - 5, at(CAR, 1));
  canvas.fill(x + 3, y, width - 6, 4, at(CAR, 2));
  canvas.hline(x + 3, y, width - 6, at(CAR, 1));
  // The nose, cut on a slant.
  canvas.paint(x, y + 3, 12, height - 5, (px, py) => {
    const cut = (x + 12 - px) * 0.6;
    if (py - (y + 3) < cut) return undefined;
    return at(CAR, py - (y + 3) < cut + 3 ? 2 : 1);
  });
  // The cabin, lit from within.
  canvas.fill(
    x + Math.round(width * 0.25),
    y + 5,
    Math.round(width * 0.5),
    height - 10,
    at(CAR, 0),
  );
  canvas.hline(
    x + Math.round(width * 0.25) + 2,
    y + 6,
    Math.round(width * 0.5) - 4,
    at(CAR_LIGHT, 1),
  );
  // The lights: white at the front, red at the back, a dim trail under.
  canvas.fill(x + 1, y + height - 7, 4, 4, at(CAR_LIGHT, 2));
  canvas.fill(x + width - 5, y + height - 7, 4, 4, at(NEON_ORANGE, 2));
  canvas.hline(x - 10, y + height - 2, 10, at(CAR_LIGHT, 0));
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  canvas.fill(0, HORIZON - 34, width, 34, at(HAZE, 0));
  canvas.fill(0, HORIZON - 12, width, 8, at(HAZE, 1));
  canvas.hline(0, HORIZON - 6, width, at(HAZE, 2));
  drawCloud(canvas, 120, 96, 340, 10);
  drawCloud(canvas, 640, 150, 300, 8);
  drawCloud(canvas, 1010, 70, 180, 7);
  canvas.fill(0, HORIZON, width, height - HORIZON, at(HAZE, 0));
  canvas.fill(0, height - 46, width, 46, at(DISTANT, 0));
  FAR_BUILDINGS.forEach((building) => {
    drawFarTower(canvas, building);
  });
  NEAR_BUILDINGS.forEach((building, index) => {
    drawNearTower(canvas, building, index % 3);
  });
  drawBillboard(canvas);
  return canvas;
}
