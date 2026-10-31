/**
 * Colors of the images drawn with a free palette (the title vinyl, the icons' master, see
 * ui-drawn.ts): read from an indexed PNG, and gathered into the smallest palette that holds them.
 */

import type { IndexedImage, Rgba } from './png.ts';

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** The color of palette slot `slot` of an image as read back. */
export function rgbaAt(image: IndexedImage, slot: number): Rgba {
  const alpha = image.alpha[slot] ?? 255;
  if (alpha === 0) return TRANSPARENT;
  const color = image.colors[slot] ?? 0;
  return { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff, a: alpha };
}

/**
 * A palette filled as colors come, each color once (every fully transparent color is the same
 * one): `slotOf` gives a color's slot, adding it when it is new.
 */
export function paletteBuilder(first: readonly Rgba[] = []): {
  readonly palette: readonly Rgba[];
  readonly slotOf: (color: Rgba) => number;
} {
  const palette: Rgba[] = [];
  const slots = new Map<string, number>();
  const slotOf = (color: Rgba): number => {
    const key = color.a === 0 ? 'none' : `${color.r},${color.g},${color.b},${color.a}`;
    const known = slots.get(key);
    if (known !== undefined) return known;
    if (palette.length === 256) throw new Error('More than 256 colors');
    slots.set(key, palette.length);
    palette.push(color.a === 0 ? TRANSPARENT : color);
    return palette.length - 1;
  };
  for (const color of first) slotOf(color);
  return { palette, slotOf };
}

/**
 * An image's pixels in the smallest palette that holds its colors, the transparent one first
 * when it has some (and only then).
 */
export function compactImage(image: IndexedImage): {
  pixels: Uint8Array;
  palette: readonly Rgba[];
} {
  const used = new Set(image.pixels);
  const transparent = [...used].some((slot) => rgbaAt(image, slot).a === 0);
  const { palette, slotOf } = paletteBuilder(transparent ? [TRANSPARENT] : []);
  const pixels = image.pixels.map((slot) => slotOf(rgbaAt(image, slot)));
  return { pixels, palette };
}
