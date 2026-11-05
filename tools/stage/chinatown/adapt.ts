/**
 * Adapts the Chinatown illustration (art-src/chinatown/source/chinatown.png) to the game's stage
 * grain: low-res pixels, a limited palette and a darker, less saturated grade than the fighters.
 * Writes art-src/chinatown/far.png and floor.png; `npm run stages` installs them.
 */

import { writeFile } from 'node:fs/promises';
import { readTruecolor } from '../../sprites/truecolor.ts';
import { encodeIndexedPng } from '../../sprites/png.ts';
import { quantizeRgba } from '../../sprites/quantize.ts';

const SOURCE = new URL('../../../art-src/chinatown/source/chinatown.png', import.meta.url);
const FAR = new URL('../../../art-src/chinatown/far.png', import.meta.url);
const FLOOR = new URL('../../../art-src/chinatown/floor.png', import.meta.url);

const FAR_WIDTH = 1200;
const FAR_HEIGHT = 540;
const FLOOR_WIDTH = 1920;
const FLOOR_HEIGHT = 80;
const GROUND_WORLD = 250;
const SOURCE_ASPECT = 600 / 270;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** The stage recedes: darker, less saturated, a violet shadow and a warm lantern highlight. */
function grade(r: number, g: number, b: number, floor: boolean): readonly [number, number, number] {
  const light = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = floor ? 0.62 : 0.68;
  const shade = floor ? 0.56 : 0.62;
  const rr = (light + (r - light) * saturation) * shade;
  const gg = (light + (g - light) * saturation) * shade;
  const bb = (light + (b - light) * saturation) * shade;
  const shadow = Math.max(0, 1 - light / 120);
  return [clamp(rr + 10 * shadow), clamp(gg + 5 * shadow), clamp(bb + 20 * shadow)];
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
  const slots = new Uint8Array(pixels.length / 4);
  for (let y = 0, at = 0; y < pixels.length / 4 / width; y++) {
    for (let x = 0; x < width; x++, at += 4) {
      const bias = ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) / 16 - 0.5) * 9;
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
const cropHeight = Math.round(source.width / SOURCE_ASPECT);
const cropY = 24;
if (cropY + cropHeight > source.height) throw new Error('Source too short for the stage');
const far = new Uint8ClampedArray(FAR_WIDTH * FAR_HEIGHT * 4);
const floor = new Uint8ClampedArray(FLOOR_WIDTH * FLOOR_HEIGHT * 4);

for (let y = 0; y < FAR_HEIGHT; y++) {
  for (let x = 0; x < FAR_WIDTH; x++) {
    const worldX = Math.floor(x / 2);
    const worldY = Math.floor(y / 2);
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (worldX / 600) * source.width,
      cropY + (worldY / 270) * cropHeight,
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
      cropY + ((GROUND_WORLD + worldY) / 270) * cropHeight,
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
const { palette } = quantizeRgba(combined, 48);
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
