/**
 * The palette every Sahel Sunset prop draws in (the props share one sheet, so one palette): the
 * middle layer's own colours first, slot for slot, so the crowd moves in the painting's colours,
 * then each effect's colours, each group at its own offset (`enlist`).
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { IndexedImage, Rgba } from '../../sprites/png.ts';
import type { Canvas } from '../kit/canvas.ts';
import { imageOf } from '../kit/stage.ts';

/** The middle layer as `adapt.ts` wrote it: palette indices, the palette, its opacity. */
export interface Layer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
  readonly palette: readonly Rgba[];
}

/** Reads the middle layer (written unfiltered by `encodeIndexedPng`), synchronously. */
function readMid(): Layer {
  const png = readFileSync(new URL('../../../art-src/sahel/mid.png', import.meta.url));
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0;
  let height = 0;
  let rgb: Uint8Array = new Uint8Array(0);
  let alpha: Uint8Array = new Uint8Array(0);
  const data: Uint8Array[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = view.getUint32(offset);
    const type = png.subarray(offset + 4, offset + 8).toString();
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
    } else if (type === 'PLTE') rgb = body;
    else if (type === 'tRNS') alpha = body;
    else if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1);
    if (raw[row] !== 0) throw new Error('mid.png: a filtered row (rewrite it with adapt.ts)');
    pixels.set(raw.subarray(row + 1, row + 1 + width), y * width);
  }
  const palette = Array.from({ length: rgb.length / 3 }, (_, slot) => ({
    r: rgb[slot * 3] ?? 0,
    g: rgb[slot * 3 + 1] ?? 0,
    b: rgb[slot * 3 + 2] ?? 0,
    a: alpha[slot] ?? 255,
  }));
  return { width, height, pixels, palette };
}

/** The middle layer, read once. */
export const MID: Layer = readMid();

/** The props' one palette: the layer's, then each enlisted group's. */
export const PROP_PALETTE: Rgba[] = [...MID.palette];

/**
 * Adds a group of colours (its slot 0 transparent, skipped) and returns its offset: the group's
 * slot n is the palette's slot offset + n. Every group is enlisted at load, before any image.
 */
export function enlist(colors: readonly Rgba[]): number {
  const offset = PROP_PALETTE.length - 1;
  PROP_PALETTE.push(...colors.slice(1));
  if (PROP_PALETTE.length > 256) throw new Error('Sahel props: more than 256 colours');
  return offset;
}

/** A canvas drawn in a group's own slots, as an image in the shared palette. */
export function imageIn(canvas: Canvas, offset: number): IndexedImage {
  if (offset !== 0) {
    const { pixels } = canvas;
    for (let i = 0; i < pixels.length; i++) if (pixels[i]) pixels[i] = (pixels[i] ?? 0) + offset;
  }
  return imageOf(canvas, PROP_PALETTE);
}
