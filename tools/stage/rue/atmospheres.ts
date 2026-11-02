/**
 * The street's atmospheres (docs/art/decor-rue.md §13): the same street, each in its own palette,
 * slot for slot with the night's (palette.ts). A palette is drawn, never a filter laid over the
 * picture: each ramp keeps its steps, the darkest first. `npm run sprites` writes each atmosphere's
 * layers in its folder (tools/sprites/stage-drawn.ts).
 */

import type { Atmosphere } from '../../../src/art/stage-layers.ts';
import type { Rgba } from '../../sprites/png.ts';
import {
  CLOUD,
  COOL,
  DISTANT,
  DISTANT_LIT,
  LAMP,
  LIGHTBOX,
  NEON_ORANGE,
  NEON_VIOLET,
  PALETTE,
  SKY,
  WARM,
} from './palette.ts';

function rgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 };
}

/** `color` brought `amount` (0 to 1) of the way to `to`. */
function mix(color: Rgba, to: Rgba, amount: number): Rgba {
  const channel = (from: number, target: number) => Math.round(from + (target - from) * amount);
  return {
    r: channel(color.r, to.r),
    g: channel(color.g, to.g),
    b: channel(color.b, to.b),
    a: color.a,
  };
}

/** WCAG's relative luminance (src/render/luminance.ts, which the tools may not import: engine). */
function luminanceOf({ r, g, b }: Rgba): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The most luminance a color of an atmosphere's street takes: under VEIL_DELTA (0.08), a black
 * effect over any of them changes it no more than the flash effects are tuned for
 * (docs/flashs.md §3; tests/tools/stage-drawn.test.ts).
 */
const MOST_LUMINANCE = 0.078;

/** `color`, darkened step by step until its luminance is under MOST_LUMINANCE (its hue kept). */
function capped(color: Rgba): Rgba {
  let shown = color;
  while (luminanceOf(shown) > MOST_LUMINANCE)
    shown = mix(shown, { r: 0, g: 0, b: 0, a: 255 }, 0.02);
  return shown;
}

/** A ramp of the night's palette given other colors, step for step. */
function repaint(palette: Rgba[], ramp: readonly number[], hexes: readonly string[]): void {
  if (hexes.length !== ramp.length) {
    throw new Error(`A ramp of ${ramp.length} steps repainted with ${hexes.length} colors`);
  }
  ramp.forEach((slot, step) => {
    palette[slot] = rgba(hexes[step] ?? '#000000');
  });
}

/**
 * Dusk: the last light of the day, low behind the city. The sky goes from a deep blue overhead to
 * a dull amber at the horizon, the clouds lit pink from below, the towers backlit, darker than
 * their sky. The street is in the evening's shade, a little lighter and less violet than at
 * midnight; its lamps and signs just lit, weaker than the daylight still left. Still darker, duller
 * and less saturated than the fighters (docs/flashs.md §3), and nowhere near their cyan or magenta.
 */
function dusk(): Rgba[] {
  const palette = [...PALETTE];
  // The evening's light: the street's walls and stones turn rose, at about their own luminance
  // (the flashes' band, docs/flashs.md §3), its deepest shadows blue; its lights still faint.
  const glow = rgba('#7a4a58');
  const shadow = rgba('#2a2c4a');
  const lit = new Set([...WARM, ...LAMP, ...LIGHTBOX, ...NEON_ORANGE, ...NEON_VIOLET, ...COOL]);
  palette.forEach((color, slot) => {
    if (slot === 0) return;
    const light = (color.r + color.g + color.b) / 3;
    const graded = lit.has(slot)
      ? mix(color, glow, 0.35)
      : light < 48
        ? mix(color, shadow, 0.35)
        : mix(color, glow, 0.22);
    // Only what the night kept under the band is held to it: its lights stay as bright as they were.
    palette[slot] = luminanceOf(color) <= MOST_LUMINANCE ? capped(graded) : graded;
  });
  // Its lightest steps stay under VEIL_DELTA's luminance: a black effect over the sky changes it
  // no more than over the night's (docs/flashs.md §3; tests/tools/stage-drawn.test.ts).
  repaint(palette, SKY, [
    '#202848',
    '#262e50',
    '#2e3355',
    '#3a3757',
    '#483c57',
    '#563f53',
    '#62434e',
    '#66444b',
    '#6c4443',
  ]);
  repaint(palette, CLOUD, ['#3e3756', '#4d3f59', '#5a4456', '#5f4552']);
  repaint(palette, DISTANT, ['#211f38', '#25223c', '#2a2640', '#312b46']);
  repaint(palette, DISTANT_LIT, ['#3e3550', '#574352', '#715452']);
  return palette;
}

/** An atmosphere of the street and its palette, slot for slot with the night's. */
export interface StreetAtmosphere {
  readonly atmosphere: Atmosphere;
  readonly palette: readonly Rgba[];
}

/** The atmospheres the street offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const STREET_ATMOSPHERES: readonly StreetAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
];
