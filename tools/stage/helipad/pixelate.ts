/**
 * Gives H-02 Helipad the characters' pixel grain. The source is the AI illustration's adapted
 * layers under art-src/helipad/source/ai/ (far, mid, floor and the animation sheet). The pass:
 * a 3 × 3 median at full resolution (removes the AI's pixel-level noise), a 2 × 2 box downsample
 * and nearest 2 × nearest upsample (each visual pixel becomes a 2 × 2 block), a contrast and
 * saturation lift, and one 64-colour palette for the whole stage, highlights included. The result
 * is written back to art-src/helipad/.
 *
 * One-off tool: run it only from the pristine layers in source/ai/, never on its own output.
 */

import { writeFile } from 'node:fs/promises';
import { encodeTruecolorPng } from '../../sprites/png.ts';
import { quantizeRgba } from '../../sprites/quantize.ts';
import { readTruecolor, type TruecolorImage } from '../../sprites/truecolor.ts';

const ROOT = new URL('../../../art-src/helipad/', import.meta.url);
const SOURCE = new URL('source/ai/', ROOT);
const LAYERS = ['far', 'mid', 'floor', 'animation'] as const;
type Layer = (typeof LAYERS)[number];

const COLORS = 64;
const CONTRAST = 1.08;
const SATURATION = 1.1;
const BRIGHTNESS = 18;
const BOOST = 8;

interface Coarse {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

/** The 3 × 3 median of the opaque pixels around each pixel: the AI's grain disappears. */
function median(image: TruecolorImage): Uint8ClampedArray {
  const out = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const at = (y * image.width + x) * 4;
      if ((image.data[at + 3] ?? 0) === 0) continue;
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];
      const as: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const n = (ny * image.width + nx) * 4;
          if ((image.data[n + 3] ?? 0) === 0) continue;
          rs.push(image.data[n] ?? 0);
          gs.push(image.data[n + 1] ?? 0);
          bs.push(image.data[n + 2] ?? 0);
          as.push(image.data[n + 3] ?? 0);
        }
      }
      rs.sort((a, b) => a - b);
      gs.sort((a, b) => a - b);
      bs.sort((a, b) => a - b);
      as.sort((a, b) => a - b);
      const middle = Math.floor(rs.length / 2);
      out[at] = rs[middle] ?? 0;
      out[at + 1] = gs[middle] ?? 0;
      out[at + 2] = bs[middle] ?? 0;
      out[at + 3] = as[middle] ?? 0;
    }
  }
  return out;
}

/** A 2 × 2 box downsample: each visual pixel is the average of its block, alpha weighted. */
function downsample(image: TruecolorImage, pixels: Uint8ClampedArray): Coarse {
  const width = image.width / 2;
  const height = image.height / 2;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const from = ((y * 2 + dy) * image.width + x * 2 + dx) * 4;
          const alpha = pixels[from + 3] ?? 0;
          if (alpha === 0) continue;
          r += pixels[from] ?? 0;
          g += pixels[from + 1] ?? 0;
          b += pixels[from + 2] ?? 0;
          a += alpha;
          count++;
        }
      }
      if (count === 0) continue;
      const to = (y * width + x) * 4;
      out[to] = Math.round(r / count);
      out[to + 1] = Math.round(g / count);
      out[to + 2] = Math.round(b / count);
      out[to + 3] = Math.round(a / count);
    }
  }
  return { width, height, pixels: out };
}

/** A contrast and saturation lift over the opaque pixels. */
function tone(pixels: Uint8ClampedArray): void {
  for (let at = 0; at < pixels.length; at += 4) {
    if ((pixels[at + 3] ?? 0) === 0) continue;
    const r = pixels[at] ?? 0;
    const g = pixels[at + 1] ?? 0;
    const b = pixels[at + 2] ?? 0;
    const light = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels[at] = Math.max(
      0,
      Math.min(
        255,
        Math.round((light + (r - light) * SATURATION - 128) * CONTRAST + 128 + BRIGHTNESS),
      ),
    );
    pixels[at + 1] = Math.max(
      0,
      Math.min(
        255,
        Math.round((light + (g - light) * SATURATION - 128) * CONTRAST + 128 + BRIGHTNESS),
      ),
    );
    pixels[at + 2] = Math.max(
      0,
      Math.min(
        255,
        Math.round((light + (b - light) * SATURATION - 128) * CONTRAST + 128 + BRIGHTNESS),
      ),
    );
  }
}

const images: Record<Layer, TruecolorImage> = {} as Record<Layer, TruecolorImage>;
for (const layer of LAYERS) {
  images[layer] = await readTruecolor(new URL(`${layer}.png`, SOURCE));
}
const coarse = {} as Record<Layer, Coarse>;
for (const layer of LAYERS) {
  coarse[layer] = downsample(images[layer], median(images[layer]));
}

// One palette for the whole stage: the large surfaces, then the animation's bright pixels.
const total = LAYERS.reduce((sum, layer) => sum + coarse[layer].width * coarse[layer].height, 0);
const joined = new Uint8ClampedArray(total * 4);
let at = 0;
for (const layer of LAYERS) {
  joined.set(coarse[layer].pixels, at);
  at += coarse[layer].pixels.length;
}
tone(joined);
const extra: number[] = [];
for (let p = 0; p < joined.length; p += 4) {
  if ((joined[p + 3] ?? 0) === 0) continue;
  const r = joined[p] ?? 0;
  const g = joined[p + 1] ?? 0;
  const b = joined[p + 2] ?? 0;
  const light = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (light > 150 || saturation > 80) for (let n = 0; n < BOOST; n++) extra.push(p);
}
const weighted = new Uint8ClampedArray(joined.length + extra.length * 4);
weighted.set(joined);
let outAt = joined.length;
for (const p of extra) {
  weighted[outAt] = joined[p] ?? 0;
  weighted[outAt + 1] = joined[p + 1] ?? 0;
  weighted[outAt + 2] = joined[p + 2] ?? 0;
  weighted[outAt + 3] = joined[p + 3] ?? 0;
  outAt += 4;
}
const { palette, slots } = quantizeRgba(weighted, COLORS);

let offset = 0;
for (const layer of LAYERS) {
  const image = coarse[layer];
  const layerSlots = slots.subarray(offset, offset + image.width * image.height);
  offset += image.width * image.height;
  const pixels = new Uint8ClampedArray(image.width * 2 * image.height * 2 * 4);
  for (let y = 0; y < image.height * 2; y++) {
    for (let x = 0; x < image.width * 2; x++) {
      const slot = layerSlots[Math.floor(y / 2) * image.width + Math.floor(x / 2)] ?? 0;
      const color = palette[slot] ?? { r: 0, g: 0, b: 0, a: 0 };
      const to = (y * image.width * 2 + x) * 4;
      pixels[to] = color.r;
      pixels[to + 1] = color.g;
      pixels[to + 2] = color.b;
      pixels[to + 3] = color.a;
    }
  }
  await writeFile(
    new URL(`${layer}.png`, ROOT),
    await encodeTruecolorPng(image.width * 2, image.height * 2, pixels),
  );
  console.log(layer, 'written');
}
console.log('palette', palette.length);
