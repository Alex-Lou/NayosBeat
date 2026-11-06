/**
 * The subject's silhouette in an imported image (docs/art/roto.md §2): what the tool keeps, and
 * what is background. Two ways, tried in this order.
 *
 * - **The image already says it.** Enough transparent pixels and the alpha channel is the answer:
 *   a Blender render, a generated PNG on a transparent background, a drawing already cut out.
 * - **The background is keyed out.** A flood fill starts at the four corners, each keeping its own
 *   reference colour, and spreads while a pixel stays within `tolerance` of that corner (ΔE in
 *   Lab). Four references, so a wall and a floor of two different colours both go; the reference
 *   never moves, so a fill cannot drift along a soft edge into the subject the way a fill compared
 *   to its neighbour would. The corners are used rather than the whole border because feet often
 *   touch the bottom edge of a photo, and a fill seeded on the feet would eat the fighter.
 *
 * Then the specks go: the largest island is kept, and so is any island at least `minShare` of it
 * (a detached hand, a weapon, hair). A hole inside the subject is kept by construction — the fill
 * never reaches it.
 *
 * The limit is known and is the method's, not a bug: this works on a plain background (a wall, a
 * studio backdrop, a render) and fails on a busy one. A photo against a bookshelf needs a
 * segmentation model, which this tool does not have.
 */

import type { Bitmap, Box, ToLab } from './pixels.ts';
import { labBufferOf, labDistanceSquared } from './pixels.ts';

export interface Mask {
  readonly width: number;
  readonly height: number;
  /** 1 where the subject is, 0 where the background is. */
  readonly on: Uint8Array;
  /** The box the subject fills; empty subjects report the whole image. */
  readonly box: Box;
  readonly pixels: number;
  /** How the mask was found, for the page to say which. */
  readonly from: 'alpha' | 'key';
  /** Islands kept, and islands dropped as specks: the page warns when many were dropped. */
  readonly islands: number;
  readonly specks: number;
}

export interface SilhouetteOptions {
  /** ΔE in Lab at or under which a pixel joins the background it spread from. */
  readonly tolerance: number;
  /** Alpha at or over which a pixel is the subject, when the image carries alpha. */
  readonly alphaFloor: number;
  /** An island under this share of the largest one is a speck. */
  readonly minShare: number;
}

export const SILHOUETTE_DEFAULTS: SilhouetteOptions = {
  tolerance: 14,
  alphaFloor: 128,
  minShare: 0.02,
};

/** Under this share of transparent pixels, the image is treated as opaque and keyed instead. */
const ALPHA_SHARE = 0.01;

/**
 * The subject of `image`. `lab` is its colours in Lab (pixels.ts `labBufferOf`), computed once per
 * image by the caller and handed back on every move of the tolerance slider; without it, this
 * computes its own.
 */
export function silhouetteOf(
  image: Bitmap,
  options: SilhouetteOptions,
  toLab: ToLab,
  lab?: Float32Array,
): Mask {
  const count = image.width * image.height;
  let transparent = 0;
  for (let pixel = 0; pixel < count; pixel++) {
    if ((image.data[pixel * 4 + 3] ?? 0) < options.alphaFloor) transparent++;
  }
  const on =
    transparent >= count * ALPHA_SHARE
      ? fromAlpha(image, options.alphaFloor)
      : keyedOut(image, options.tolerance, lab ?? labBufferOf(image, toLab));
  const from = transparent >= count * ALPHA_SHARE ? 'alpha' : 'key';
  return despeckle(image.width, image.height, on, options.minShare, from);
}

function fromAlpha(image: Bitmap, alphaFloor: number): Uint8Array {
  const count = image.width * image.height;
  const on = new Uint8Array(count);
  for (let pixel = 0; pixel < count; pixel++) {
    on[pixel] = (image.data[pixel * 4 + 3] ?? 0) >= alphaFloor ? 1 : 0;
  }
  return on;
}

/** A flood fill from each corner; what it never reaches is the subject. */
function keyedOut(image: Bitmap, tolerance: number, lab: Float32Array): Uint8Array {
  const { width, height } = image;
  const count = width * height;
  const on = new Uint8Array(count).fill(1);
  const limit = tolerance * tolerance;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  // Which corner's fill reached a pixel, so each pixel is compared to that corner's colour alone.
  const seed = new Int32Array(count).fill(-1);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  for (const corner of corners) {
    if (seed[corner] !== -1) continue;
    seed[corner] = corner;
    on[corner] = 0;
    queue[tail++] = corner;
  }
  while (head < tail) {
    const pixel = queue[head++] ?? 0;
    const reference = seed[pixel] ?? 0;
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) spread(pixel - 1);
    if (x < width - 1) spread(pixel + 1);
    if (y > 0) spread(pixel - width);
    if (y < height - 1) spread(pixel + width);

    function spread(next: number): void {
      if (seed[next] !== -1) return;
      if (labDistanceSquared(lab, next, reference) > limit) return;
      seed[next] = reference;
      on[next] = 0;
      queue[tail++] = next;
    }
  }
  return on;
}

/** Only the largest island and the islands worth keeping; the rest is noise. */
function despeckle(
  width: number,
  height: number,
  on: Uint8Array,
  minShare: number,
  from: 'alpha' | 'key',
): Mask {
  const count = width * height;
  const island = new Int32Array(count).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(count);
  for (let start = 0; start < count; start++) {
    if ((on[start] ?? 0) === 0 || island[start] !== -1) continue;
    const index = sizes.length;
    let size = 0;
    let head = 0;
    let tail = 0;
    island[start] = index;
    queue[tail++] = start;
    while (head < tail) {
      const pixel = queue[head++] ?? 0;
      size++;
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (x > 0) join(pixel - 1);
      if (x < width - 1) join(pixel + 1);
      if (y > 0) join(pixel - width);
      if (y < height - 1) join(pixel + width);
    }
    sizes.push(size);

    function join(next: number): void {
      if ((on[next] ?? 0) === 0 || island[next] !== -1) return;
      island[next] = index;
      queue[tail++] = next;
    }
  }
  const largest = sizes.reduce((most, size) => Math.max(most, size), 0);
  const floor = Math.max(1, Math.round(largest * minShare));
  const kept = sizes.map((size) => size >= floor);
  let pixels = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < count; pixel++) {
    const index = island[pixel] ?? -1;
    if (index === -1 || kept[index] !== true) {
      on[pixel] = 0;
      continue;
    }
    pixels++;
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  const box: Box =
    pixels === 0
      ? { left: 0, top: 0, right: width - 1, bottom: height - 1 }
      : { left, top, right, bottom };
  return {
    width,
    height,
    on,
    box,
    pixels,
    from,
    islands: kept.filter(Boolean).length,
    specks: kept.filter((keep) => !keep).length,
  };
}

/**
 * The centre of the feet, in the image: the middle of the subject's lowest band. The lowest row
 * alone would sit on whichever toe is lower; a band of the subject's height averages both feet,
 * which is what the game's anchor means (the centre of the feet, src/art/types.ts `ANCHOR`).
 */
export function soleOf(mask: Mask, band = 0.05): { readonly x: number; readonly y: number } {
  const height = mask.box.bottom - mask.box.top + 1;
  const rows = Math.max(1, Math.round(height * band));
  let sum = 0;
  let found = 0;
  for (let y = mask.box.bottom; y > mask.box.bottom - rows && y >= 0; y--) {
    for (let x = mask.box.left; x <= mask.box.right; x++) {
      if ((mask.on[y * mask.width + x] ?? 0) === 0) continue;
      sum += x;
      found++;
    }
  }
  const x = found === 0 ? (mask.box.left + mask.box.right) / 2 : sum / found;
  return { x, y: mask.box.bottom };
}
