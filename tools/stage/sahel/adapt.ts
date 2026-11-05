/**
 * Adapts the Sahel Sunset illustration (art-src/sahel/source/sahel.png) to the game: the street,
 * its warm lights and its colours stay; the dirt road under the fighters is darkened, and the
 * whole is indexed at the fighters' grain.
 */

import { writeFile } from 'node:fs/promises';
import { readTruecolor } from '../../sprites/truecolor.ts';
import { encodeIndexedPng } from '../../sprites/png.ts';
import { quantizeRgba } from '../../sprites/quantize.ts';

const SOURCE = new URL('../../../art-src/sahel/source/sahel.png', import.meta.url);
const FAR = new URL('../../../art-src/sahel/far.png', import.meta.url);
const FLOOR = new URL('../../../art-src/sahel/floor.png', import.meta.url);

const FAR_WIDTH = 1200;
const FAR_HEIGHT = 540;
const FLOOR_WIDTH = 1920;
const FLOOR_HEIGHT = 80;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** The sunset keeps its heat; the road under the feet loses light. */
function grade(r: number, g: number, b: number, floor: boolean): readonly [number, number, number] {
  const light = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = floor ? 0.88 : 0.96;
  const shade = floor ? 0.66 : 0.86;
  const rr = (light + (r - light) * saturation) * shade;
  const gg = (light + (g - light) * saturation) * shade;
  const bb = (light + (b - light) * saturation) * shade;
  const shadow = Math.max(0, 1 - light / 130);
  return [clamp(rr + 6 * shadow), clamp(gg + 3 * shadow), clamp(bb + 8 * shadow)];
}

function sourcePixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): readonly [number, number, number] {
  const sx = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const at = (sy * width + sx) * 4;
  return [data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0];
}

function nearest(
  palette: readonly { r: number; g: number; b: number; a: number }[],
  r: number,
  g: number,
  b: number,
): number {
  let best = 1;
  let distance = Infinity;
  for (let slot = 1; slot < palette.length; slot++) {
    const color = palette[slot];
    if (!color) continue;
    const d = (color.r - r) ** 2 + (color.g - g) ** 2 + (color.b - b) ** 2;
    if (d < distance) {
      distance = d;
      best = slot;
    }
  }
  return best;
}

function mapWithDither(
  pixels: Uint8ClampedArray,
  width: number,
  palette: readonly { r: number; g: number; b: number; a: number }[],
): Uint8Array {
  const height = pixels.length / 4 / width;
  const slots = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      const bias = ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) / 16 - 0.5) * 8;
      slots[y * width + x] = nearest(
        palette,
        (pixels[at] ?? 0) + bias,
        (pixels[at + 1] ?? 0) + bias,
        (pixels[at + 2] ?? 0) + bias,
      );
    }
  }
  return slots;
}

const source = await readTruecolor(SOURCE);
const cropHeight = Math.min(source.height, Math.round(source.width / (600 / 270)));
if (cropHeight > source.height) throw new Error('Source too short for the stage');
const groundSource = (230 / 270) * cropHeight;
const far = new Uint8ClampedArray(FAR_WIDTH * FAR_HEIGHT * 4);
const floor = new Uint8ClampedArray(FLOOR_WIDTH * FLOOR_HEIGHT * 4);

for (let y = 0; y < FAR_HEIGHT; y++) {
  for (let x = 0; x < FAR_WIDTH; x++) {
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (x / FAR_WIDTH) * source.width,
      (y / FAR_HEIGHT) * cropHeight,
    );
    const [rr, gg, bb] = grade(r, g, b, false);
    const at = (y * FAR_WIDTH + x) * 4;
    far[at] = rr;
    far[at + 1] = gg;
    far[at + 2] = bb;
    far[at + 3] = 255;
  }
}

for (let y = 0; y < FLOOR_HEIGHT; y++) {
  for (let x = 0; x < FLOOR_WIDTH; x++) {
    const worldX = Math.floor(x / 2);
    const worldY = Math.floor(y / 2);
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (worldX / 960) * source.width,
      groundSource + (worldY / 270) * cropHeight,
    );
    const [rr, gg, bb] = grade(r, g, b, true);
    const at = (y * FLOOR_WIDTH + x) * 4;
    floor[at] = rr;
    floor[at + 1] = gg;
    floor[at + 2] = bb;
    floor[at + 3] = 255;
  }
}

const combined = new Uint8ClampedArray(far.length + floor.length);
combined.set(far);
combined.set(floor, far.length);
const { palette } = quantizeRgba(combined, 64);
await writeFile(
  FAR,
  await encodeIndexedPng(FAR_WIDTH, FAR_HEIGHT, mapWithDither(far, FAR_WIDTH, palette), palette),
);
await writeFile(
  FLOOR,
  await encodeIndexedPng(
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    mapWithDither(floor, FLOOR_WIDTH, palette),
    palette,
  ),
);
