/**
 * How clean a stage reads (docs/art/proprete.md): the share of its pixels that differ from all four
 * of their neighbours, where the fighters stand. Such pixels are noise: single dots of dither or
 * grain that swarm when the camera moves and blur the fighters' silhouettes. A clean stage draws
 * in flat tones and firm shapes, and keeps its detail for the top and the ends of the screen.
 */

import type { StageLayer } from '../../../src/art/stage-layers.ts';
import type { IndexedImage } from '../../sprites/png.ts';

/**
 * The fighters' zone, rows of each layer's image: from over their heads at the closest framing
 * (world y 100, under the HUD) down to the ground line (230), and the whole floor.
 */
export const FIGHTERS_ROWS: Readonly<Record<StageLayer, readonly [number, number]>> = {
  far: [200, 460],
  mid: [200, 460],
  floor: [0, 80],
};

/** The most noise each layer may have in the fighters' zone (the street's measure, rounded up). */
export const MOST_NOISE: Readonly<Record<StageLayer, number>> = {
  far: 0.04,
  mid: 0.05,
  floor: 0.03,
};

/**
 * The share of `image`'s opaque pixels between rows `from` and `to` that differ from their four
 * neighbours (a transparent pixel counts as no color: it is never noise, and differs from all).
 */
export function noiseOf(image: IndexedImage, from: number, to: number): number {
  const { width, height, pixels } = image;
  let noisy = 0;
  let counted = 0;
  for (let y = Math.max(1, from); y < Math.min(height - 1, to); y++) {
    for (let x = 1; x < width - 1; x++) {
      const slot = pixels[y * width + x] ?? 0;
      if (slot === 0 || image.alpha[slot] === 0) continue;
      counted += 1;
      if (
        slot !== pixels[y * width + x - 1] &&
        slot !== pixels[y * width + x + 1] &&
        slot !== pixels[(y - 1) * width + x] &&
        slot !== pixels[(y + 1) * width + x]
      ) {
        noisy += 1;
      }
    }
  }
  return counted === 0 ? 0 : noisy / counted;
}
