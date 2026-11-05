/**
 * Adapts the Sahel Sunset illustration (art-src/sahel/source/sahel.png) to the game: the street,
 * its warm lights and its colours stay; the whole is snapped to the fighters' pixel grain (a 2 × 2
 * block a world pixel), the road under the fighters is darkened in a warm sunset gradient, and the
 * distant buildings take a breath of haze so the fight stays in front.
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
/** The pixel-art grain: a block is a world pixel, as in Chinatown and the hand-drawn stages. */
const BLOCK = 2;
const FAR_BLOCKS_WIDTH = FAR_WIDTH / BLOCK;
const FAR_BLOCKS_HEIGHT = FAR_HEIGHT / BLOCK;
const FLOOR_BLOCKS_WIDTH = FLOOR_WIDTH / BLOCK;
const FLOOR_BLOCKS_HEIGHT = FLOOR_HEIGHT / BLOCK;
const COLORS = 64;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** The sunset keeps its heat; the road under the feet loses light, warmer at its far edge. */
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
    // The road starts where the far road ends, then falls into the fight's shadow.
    const sunset = fade * (1 - depth * 0.4) * 0.12;
    rr += (255 - rr) * sunset;
    gg += (166 - gg) * sunset;
    bb += (96 - bb) * sunset;
  } else {
    // A breath of warm haze over the distant buildings, never on the sky's colour.
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

/** Indexes the blocks, the ordered dither at the block's own grain. */
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

/** A block's pixels, repeated into the game's image grain. */
function enlarge(blocks: Uint8Array, width: number, height: number): Uint8Array {
  const pixels = new Uint8Array(width * BLOCK * height * BLOCK);
  for (let y = 0; y < height * BLOCK; y++) {
    for (let x = 0; x < width * BLOCK; x++) {
      pixels[y * width * BLOCK + x] =
        blocks[Math.floor(y / BLOCK) * width + Math.floor(x / BLOCK)] ?? 0;
    }
  }
  return pixels;
}

const source = await readTruecolor(SOURCE);
const cropHeight = Math.min(source.height, Math.round(source.width / (600 / 270)));
if (cropHeight > source.height) throw new Error('Source too short for the stage');
const groundSource = (230 / 270) * cropHeight;
const far = new Uint8ClampedArray(FAR_BLOCKS_WIDTH * FAR_BLOCKS_HEIGHT * 4);
const floor = new Uint8ClampedArray(FLOOR_BLOCKS_WIDTH * FLOOR_BLOCKS_HEIGHT * 4);

for (let y = 0; y < FAR_BLOCKS_HEIGHT; y++) {
  for (let x = 0; x < FAR_BLOCKS_WIDTH; x++) {
    const depth = y / FAR_BLOCKS_HEIGHT;
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (x / FAR_BLOCKS_WIDTH) * source.width,
      depth * cropHeight,
    );
    const [rr, gg, bb] = grade(r, g, b, false, depth);
    const at = (y * FAR_BLOCKS_WIDTH + x) * 4;
    far[at] = rr;
    far[at + 1] = gg;
    far[at + 2] = bb;
    far[at + 3] = 255;
  }
}

for (let y = 0; y < FLOOR_BLOCKS_HEIGHT; y++) {
  for (let x = 0; x < FLOOR_BLOCKS_WIDTH; x++) {
    const depth = y / FLOOR_BLOCKS_HEIGHT;
    const [r, g, b] = sourcePixel(
      source.data,
      source.width,
      source.height,
      (x / FLOOR_BLOCKS_WIDTH) * source.width,
      groundSource + depth * cropHeight,
    );
    const [rr, gg, bb] = grade(r, g, b, true, depth);
    const at = (y * FLOOR_BLOCKS_WIDTH + x) * 4;
    floor[at] = rr;
    floor[at + 1] = gg;
    floor[at + 2] = bb;
    floor[at + 3] = 255;
  }
}

const combined = new Uint8ClampedArray(far.length + floor.length);
combined.set(far);
combined.set(floor, far.length);
const { palette } = quantizeRgba(combined, COLORS);
await writeFile(
  FAR,
  await encodeIndexedPng(
    FAR_WIDTH,
    FAR_HEIGHT,
    enlarge(mapWithDither(far, FAR_BLOCKS_WIDTH, palette), FAR_BLOCKS_WIDTH, FAR_BLOCKS_HEIGHT),
    palette,
  ),
);
await writeFile(
  FLOOR,
  await encodeIndexedPng(
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    enlarge(
      mapWithDither(floor, FLOOR_BLOCKS_WIDTH, palette),
      FLOOR_BLOCKS_WIDTH,
      FLOOR_BLOCKS_HEIGHT,
    ),
    palette,
  ),
);
