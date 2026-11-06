/**
 * Harmonises H-02 Helipad with the fighters, at full resolution. The source is the AI
 * illustration's adapted layers under art-src/helipad/source/ai/ (far, mid, floor and the
 * animation sheet). A light 3 × 3 blur removes the AI's pixel-level noise, a measured contrast,
 * saturation and brightness lift tames the neon, one 192-colour palette unifies the scene, and an
 * unsharp mask restores the edges. Nothing is downsampled: the stage keeps its detail.
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

const COLORS = 192;
const CONTRAST = 1;
const SATURATION = 0.9;
const BRIGHTNESS = 8;
const SHARPEN = 0.35;

/** A light 3 × 3 blur over the opaque pixels: kills the AI grain, keeps the shapes. */
function softBlur(image: TruecolorImage, pixels: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const weights = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const at = (y * image.width + x) * 4;
      if ((pixels[at + 3] ?? 0) === 0) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const nat = (ny * image.width + nx) * 4;
          if ((pixels[nat + 3] ?? 0) === 0) continue;
          const weight = weights[(dy + 1) * 3 + dx + 1] ?? 1;
          r += (pixels[nat] ?? 0) * weight;
          g += (pixels[nat + 1] ?? 0) * weight;
          b += (pixels[nat + 2] ?? 0) * weight;
          total += weight;
        }
      }
      out[at] = Math.round(r / total);
      out[at + 1] = Math.round(g / total);
      out[at + 2] = Math.round(b / total);
      out[at + 3] = pixels[at + 3] ?? 0;
    }
  }
  return out;
}

/** An unsharp mask over the opaque pixels: restores the edges the blur softened. */
function sharpen(
  image: TruecolorImage,
  pixels: Uint8ClampedArray,
  amount: number,
): Uint8ClampedArray {
  const blurred = softBlur(image, pixels);
  const out = new Uint8ClampedArray(pixels);
  for (let at = 0; at < pixels.length; at += 4) {
    if ((pixels[at + 3] ?? 0) === 0) continue;
    for (let channel = 0; channel < 3; channel++) {
      const value = pixels[at + channel] ?? 0;
      const low = blurred[at + channel] ?? 0;
      out[at + channel] = Math.max(0, Math.min(255, Math.round(value + (value - low) * amount)));
    }
  }
  return out;
}

/** The measured contrast, saturation and brightness lift. */
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

const images = {} as Record<Layer, TruecolorImage>;
for (const layer of LAYERS) images[layer] = await readTruecolor(new URL(`${layer}.png`, SOURCE));

const prepared = {} as Record<Layer, Uint8ClampedArray>;
for (const layer of LAYERS) {
  const image = images[layer];
  prepared[layer] = softBlur(image, image.data);
  tone(prepared[layer]);
}

// One palette for the whole stage: the large surfaces, then the bright pixels once more so the
// neon and the moon keep a slot.
const total = LAYERS.reduce((sum, layer) => sum + images[layer].width * images[layer].height, 0);
const joined = new Uint8ClampedArray(total * 4);
let at = 0;
for (const layer of LAYERS) {
  joined.set(prepared[layer], at);
  at += prepared[layer].length;
}
const extra: number[] = [];
for (let p = 0; p < joined.length; p += 4) {
  if ((joined[p + 3] ?? 0) === 0) continue;
  const r = joined[p] ?? 0;
  const g = joined[p + 1] ?? 0;
  const b = joined[p + 2] ?? 0;
  const light = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (light > 150 || saturation > 80) extra.push(p);
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
  const image = images[layer];
  const layerSlots = slots.subarray(offset, offset + image.width * image.height);
  offset += image.width * image.height;
  const quantized = new Uint8ClampedArray(image.data.length);
  for (let p = 0; p < layerSlots.length; p++) {
    const color = palette[layerSlots[p] ?? 0] ?? { r: 0, g: 0, b: 0, a: 0 };
    const to = p * 4;
    quantized[to] = color.r;
    quantized[to + 1] = color.g;
    quantized[to + 2] = color.b;
    quantized[to + 3] = color.a;
  }
  const sharpened = sharpen(image, quantized, SHARPEN);
  await writeFile(
    new URL(`${layer}.png`, ROOT),
    await encodeTruecolorPng(image.width, image.height, sharpened),
  );
  console.log(layer, 'written');
}
console.log('palette', palette.length);
