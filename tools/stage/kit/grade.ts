/**
 * Grading a stage's palette into another atmosphere (docs/art/decor-rue.md §13): each color moved
 * toward the light of the hour, the darkest toward its shadow, never past the luminance the flash
 * effects are tuned for. A palette is drawn, never a filter laid over the picture: each ramp keeps
 * its steps, the darkest first.
 */

import type { Rgba } from '../../sprites/png.ts';

export function rgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 };
}

/** `color` brought `amount` (0 to 1) of the way to `to`. */
export function mix(color: Rgba, to: Rgba, amount: number): Rgba {
  const channel = (from: number, target: number) => Math.round(from + (target - from) * amount);
  return {
    r: channel(color.r, to.r),
    g: channel(color.g, to.g),
    b: channel(color.b, to.b),
    a: color.a,
  };
}

/** WCAG's relative luminance (src/render/luminance.ts, which the tools may not import: engine). */
export function luminanceOf({ r, g, b }: Rgba): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The most luminance a large color of a stage's atmosphere takes: under VEIL_DELTA (0.08), a black
 * effect over any of them changes it no more than the flash effects are tuned for
 * (docs/flashs.md §3; tests/tools/stage-drawn.test.ts).
 */
export const MOST_LUMINANCE = 0.078;

/** `color`, darkened step by step until its luminance is under MOST_LUMINANCE (its hue kept). */
export function capped(color: Rgba): Rgba {
  let shown = color;
  while (luminanceOf(shown) > MOST_LUMINANCE)
    shown = mix(shown, { r: 0, g: 0, b: 0, a: 255 }, 0.02);
  return shown;
}

/** A ramp of `palette` given other colors, step for step. */
export function repaint(palette: Rgba[], ramp: readonly number[], hexes: readonly string[]): void {
  if (hexes.length !== ramp.length) {
    throw new Error(`A ramp of ${ramp.length} steps repainted with ${hexes.length} colors`);
  }
  ramp.forEach((slot, step) => {
    palette[slot] = rgba(hexes[step] ?? '#000000');
  });
}

/** The light of an hour: what its lights, its lit walls and its shadows turn toward. */
export interface Grade {
  readonly glow: Rgba;
  readonly shadow: Rgba;
  /** The slots that give light (neons, lamps, lit windows): they take more of the glow. */
  readonly lit: ReadonlySet<number>;
}

/**
 * Grades `palette`'s slots from `from` on, in place: the lit ones 0.35 toward the glow, the dark
 * ones (under 48 of 255 on average) 0.35 toward the shadow, the others 0.22 toward the glow. Those
 * the base atmosphere kept under the flashes' band stay under it (`capped`); its lights stay as
 * bright as they were.
 */
export function grade(palette: Rgba[], { glow, shadow, lit }: Grade, from = 1): void {
  palette.forEach((color, slot) => {
    if (slot < from || slot === 0) return;
    const light = (color.r + color.g + color.b) / 3;
    const graded = lit.has(slot)
      ? mix(color, glow, 0.35)
      : light < 48
        ? mix(color, shadow, 0.35)
        : mix(color, glow, 0.22);
    palette[slot] = luminanceOf(color) <= MOST_LUMINANCE ? capped(graded) : graded;
  });
}
