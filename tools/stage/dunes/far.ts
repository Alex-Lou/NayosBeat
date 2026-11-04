/**
 * The far layer (docs/art/decor-dune-dusk.md §2.1): the desert at dusk. The sky from a deep indigo
 * overhead to the dull amber of the setting sun, the low sun half behind the dunes, and three
 * planes of dunes in waves, the farthest pale. Opaque everywhere. Flat tones (docs/art/proprete.md):
 * the sky's gradient is the only dither. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, DUNE_FAR, DUNE_MID, DUNE_NEAR, SKY, SUN, SUNGLOW } from './palette.ts';

/** The horizon's row: the dunes from here down. */
export const HORIZON = 300;
const SEED = 191;
const SUN_AT = { x: 720, y: HORIZON - 10, radius: 24 } as const;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.25;
}

/** A low cloud, a long flat band. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/** A plane of dunes: long waves of sand, their crests lit, the farthest first. */
function drawDunes(
  canvas: Canvas,
  ramp: readonly number[],
  base: number,
  amplitude: number,
  wavelength: number,
  seed: number,
): void {
  canvas.paint(0, HORIZON, canvas.width, canvas.height - HORIZON, (x, y) => {
    const swell = Math.sin(x / wavelength + noise(seed, x, 0, 4)) * amplitude;
    const crest = base + Math.round(swell);
    if (y < crest) return at(ramp, 1);
    return at(ramp, y < crest + 3 ? 2 : 0);
  });
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  // The low sun, half behind the dunes, and the amber band above the horizon.
  canvas.fill(0, HORIZON - 26, width, 18, at(SUNGLOW, 0));
  canvas.fill(0, HORIZON - 12, width, 8, at(SUNGLOW, 1));
  const { x, y, radius } = SUN_AT;
  canvas.paint(x - radius - 10, y - radius - 10, radius * 2 + 20, HORIZON - y + 12, (px, py) => {
    if (py >= HORIZON) return undefined;
    const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
    if (d > radius + 8) return undefined;
    if (d > radius) return d < radius + 3 ? at(SUN, 0) : undefined;
    return at(SUN, d < radius - 8 ? 2 : 1);
  });
  drawCloud(canvas, 140, 90, 300, 9);
  drawCloud(canvas, 780, 140, 260, 8);
  canvas.fill(0, HORIZON, width, height - HORIZON, at(DUNE_FAR, 0));
  drawDunes(canvas, DUNE_FAR, HORIZON + 18, 26, 300, SEED);
  drawDunes(canvas, DUNE_MID, HORIZON + 42, 30, 240, SEED + 30);
  drawDunes(canvas, DUNE_NEAR, HORIZON + 74, 28, 200, SEED + 60);
  return canvas;
}
