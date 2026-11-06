/**
 * Adapts the Sahel Sunset illustration (art-src/sahel/source/sahel.png) to the game: the street,
 * its warm lights and its colours stay, but the illustration is brought to the fighters' own
 * resolution (one image pixel for one image pixel, 2 × 2 world) and given a pixel-art material:
 * a short median pass flattens the photographic grain, a 32-colour palette and a light ordered
 * dither settle the planes, and the road is darkened in a warm gradient under the feet.
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
/** The fighters' grain: one image pixel, 2 × 2 world pixels. */
const COLORS = 32;
const MEDIAN_RADIUS = 1;
const CONTRAST = 1.12;
const SATURATION = 1.05;
const DITHER = 4;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** The sunset keeps its heat; the road starts at the far road's light, then falls into shadow. */
function grade(
  r: number,
  g: number,
  b: number,
  floor: boolean,
  depth: number,
): readonly [number, number, number] {
  const light = 0.299 * r + 0.587 * g + 0.114 * b;
  const fade = floor ? Math.min(1, depth / 0.18) : 0;
  const saturation = floor ? 0.94 - 0.06 * fade : 0.96;
  const shade = floor ? 0.86 - 0.19 * fade : 0.86;
  let rr = (light + (r - light) * saturation) * shade;
  let gg = (light + (g - light) * saturation) * shade;
  let bb = (light + (b - light) * saturation) * shade;
  const shadow = Math.max(0, 1 - light / 130);
  rr += 6 * shadow;
  gg += 3 * shadow;
  bb += 8 * shadow;
  if (floor) {
    const sunset = fade * (1 - depth * 0.4) * 0.12;
    rr += (255 - rr) * sunset;
    gg += (166 - gg) * sunset;
    bb += (96 - bb) * sunset;
  } else {
    const haze = Math.max(0, 1 - Math.abs(depth - 0.48) / 0.3) * 0.05;
    rr += (255 - rr) * haze;
    gg += (208 - gg) * haze;
    bb += (158 - bb) * haze;
  }
  return [clamp(rr), clamp(gg), clamp(bb)];
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

/** A short median pass: the illustration's photographic grain becomes flat pixel-art planes. */
function median(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      red.length = 0;
      green.length = 0;
      blue.length = 0;
      for (let dy = -MEDIAN_RADIUS; dy <= MEDIAN_RADIUS; dy++) {
        for (let dx = -MEDIAN_RADIUS; dx <= MEDIAN_RADIUS; dx++) {
          const sx = Math.max(0, Math.min(width - 1, x + dx));
          const sy = Math.max(0, Math.min(height - 1, y + dy));
          const at = (sy * width + sx) * 4;
          red.push(pixels[at] ?? 0);
          green.push(pixels[at + 1] ?? 0);
          blue.push(pixels[at + 2] ?? 0);
        }
      }
      red.sort((a, b) => a - b);
      green.sort((a, b) => a - b);
      blue.sort((a, b) => a - b);
      const middle = Math.floor(red.length / 2);
      const at = (y * width + x) * 4;
      out[at] = red[middle] ?? 0;
      out[at + 1] = green[middle] ?? 0;
      out[at + 2] = blue[middle] ?? 0;
      out[at + 3] = 255;
    }
  }
  return out;
}

/** Contrast and saturation, so the stage answers the fighters' own contrast. */
function adjust(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  for (let at = 0; at < pixels.length; at += 4) {
    const r = pixels[at] ?? 0;
    const g = pixels[at + 1] ?? 0;
    const b = pixels[at + 2] ?? 0;
    const light = 0.299 * r + 0.587 * g + 0.114 * b;
    out[at] = clamp((light + (r - light) * SATURATION - 128) * CONTRAST + 128);
    out[at + 1] = clamp((light + (g - light) * SATURATION - 128) * CONTRAST + 128);
    out[at + 2] = clamp((light + (b - light) * SATURATION - 128) * CONTRAST + 128);
    out[at + 3] = 255;
  }
  return out;
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
      const bias = ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) / 16 - 0.5) * DITHER;
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
    const [rr, gg, bb] = grade(r, g, b, false, y / FAR_HEIGHT);
    const at = (y * FAR_WIDTH + x) * 4;
    far[at] = rr;
    far[at + 1] = gg;
    far[at + 2] = bb;
    far[at + 3] = 255;
  }
}

for (let y = 0; y < FLOOR_HEIGHT; y++) {
  for (let x = 0; x < FLOOR_WIDTH; x++) {
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (x / FLOOR_WIDTH) * source.width,
      groundSource + (y / FLOOR_HEIGHT) * cropHeight,
    );
    const [rr, gg, bb] = grade(r, g, b, true, y / FLOOR_HEIGHT);
    const at = (y * FLOOR_WIDTH + x) * 4;
    floor[at] = rr;
    floor[at + 1] = gg;
    floor[at + 2] = bb;
    floor[at + 3] = 255;
  }
}

const styledFar = adjust(median(far, FAR_WIDTH, FAR_HEIGHT));
const styledFloor = adjust(median(floor, FLOOR_WIDTH, FLOOR_HEIGHT));

const combined = new Uint8ClampedArray(styledFar.length + styledFloor.length);
combined.set(styledFar);
combined.set(styledFloor, styledFar.length);
const { palette } = quantizeRgba(combined, COLORS - 1);
await writeFile(
  FAR,
  await encodeIndexedPng(
    FAR_WIDTH,
    FAR_HEIGHT,
    mapWithDither(styledFar, FAR_WIDTH, palette),
    palette,
  ),
);
await writeFile(
  FLOOR,
  await encodeIndexedPng(
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    mapWithDither(styledFloor, FLOOR_WIDTH, palette),
    palette,
  ),
);
