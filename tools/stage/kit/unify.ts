/**
 * The common grade that ties a stage to the fighters (docs/art/manifeste-pixel-art.md §2): the
 * fighters' shadows are a cool violet-navy (measured on their sprites: around Lab L 9, a +5,
 * b −9 in the darkest band, a +10, b −12 in the next), a stage's painted shadows a warm brown.
 * Side by side, the two read as two images. This grade pulls the stage's shadows toward the
 * fighters' (hue shifting, as pixel artists do), calms its midtones a little, and leaves its
 * lights (the sunset, the lamps) as they are: one light, one shadow colour, for the whole screen.
 * Its darkest band is lifted: the near-black belongs to the fighters alone, so that they read first
 * (docs/art/recherche-equilibre-visuel.md).
 */

import type { Rgba } from '../../sprites/png.ts';

/** The fighters' shadow, in Lab (a, b), and how far the stage's shadows go toward it. */
const SHADOW = { a: 7, b: -10 } as const;
const SHADOW_PULL = 0.72;
/** Lightness (Lab L) under which a colour is a shadow, fully at `DEEP`. */
const SHADOW_FROM = 40;
const DEEP = 14;
/** The midtones' chroma, and how much of their yellow they lose, at their middle. */
const MID_CHROMA = 0.86;
const MID_COOL = 5;
/** The stage's darkest lightness (Lab L), and the lightness under which the darks are lifted. */
export const DARK_FLOOR = 12;
const DARK_KNEE = 24;

function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function gamma(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

export function toLab(r: number, g: number, b: number): [number, number, number] {
  const R = linear(r);
  const G = linear(g);
  const B = linear(b);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function fromLab(L: number, A: number, B: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + A / 500;
  const fz = fy - B / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  return [
    gamma(3.2406 * x - 1.5372 * y - 0.4986 * z),
    gamma(-0.9689 * x + 1.8758 * y + 0.0415 * z),
    gamma(0.0557 * x - 0.204 * y + 1.057 * z),
  ];
}

/** One colour, graded toward the fighters' light. */
export function unifyColor(r: number, g: number, b: number): [number, number, number] {
  const [lab, A, B] = toLab(r, g, b);
  // The darks squeezed from 0..DARK_KNEE into DARK_FLOOR..DARK_KNEE, their order kept.
  const L =
    lab >= DARK_KNEE ? lab : DARK_FLOOR + (Math.max(0, lab) * (DARK_KNEE - DARK_FLOOR)) / DARK_KNEE;
  // The shadows: their hue toward the fighters' violet-navy, the deeper the more.
  const shadow = Math.min(1, Math.max(0, (SHADOW_FROM - L) / (SHADOW_FROM - DEEP))) * SHADOW_PULL;
  let a = A + (SHADOW.a - A) * shadow;
  let bb = B + (SHADOW.b - B) * shadow;
  // The midtones: a little less chroma, a little less yellow, most at L 50.
  const mid = Math.max(0, 1 - Math.abs(L - 50) / 30);
  a *= 1 - (1 - MID_CHROMA) * mid;
  bb = bb * (1 - (1 - MID_CHROMA) * mid) - MID_COOL * mid;
  return fromLab(L, a, bb);
}

/** A palette graded colour by colour, its opacity kept (slot 0 stays transparent). */
export function unifyPalette(palette: readonly Rgba[]): Rgba[] {
  return palette.map((color) => {
    if (color.a === 0) return color;
    const [r, g, b] = unifyColor(color.r, color.g, color.b);
    return { r, g, b, a: color.a };
  });
}
