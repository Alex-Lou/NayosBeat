/**
 * Dune Dusk's palette (docs/art/decor-dune-dusk.md §3): its own. A desert at dusk: the sky from a
 * deep indigo overhead to the dull amber of the setting sun, the low sun and its path on the sand,
 * three planes of dunes, the dead tree, the dry grass. Held inside the flash measures' band
 * (docs/flashs.md §3): a dusk, never a full day. Slot 0 is transparent, every other color opaque.
 * The fighters own cyan and magenta: nothing vivid comes near them.
 */

import type { Rgba } from '../../sprites/png.ts';
import { MIST_HEXES } from '../kit/fog.ts';
import type { FigureRamps } from '../rue/people.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The dusk sky, overhead to the dunes: deep indigo, then the dull amber of the setting sun. */
export const SKY = ramp(
  '#1e2038',
  '#242440',
  '#2b2a46',
  '#342f49',
  '#403648',
  '#4d3d46',
  '#55423e',
  '#584238',
  '#5a4438',
);
export const CLOUD = ramp('#3a3050', '#46384f', '#523e4c');
/** The low sun: its disc and its core; its path on the sand. */
export const SUN = ramp('#5e4430', '#8a5e34', '#c8843c');
export const SUNGLOW = ramp('#463a2a', '#4e402e', '#56442f');
/** The dunes, three planes, the farthest pale, the nearest dark. */
export const DUNE_FAR = ramp('#3e3324', '#463a28', '#4e412c');
export const DUNE_MID = ramp('#372e20', '#3f3424', '#473a28');
export const DUNE_NEAR = ramp('#302820', '#382e22', '#403424');
/** The sand under the feet, its wet band where the rare rain fell. */
export const SAND = ramp('#3a2c1e', '#423220', '#4a3824', '#523e28');
export const SAND_WET = ramp('#34281c', '#3c2e20');
/** The dead tree, the dry grass, the stones. */
export const DEAD_TREE = ramp('#241c16', '#2c2218', '#342818');
export const GRASS = ramp('#2e3a22', '#36441f');
export const STONE = ramp('#28282e', '#302e36');
/** The beetle. */
export const BEETLE = ramp('#201e16', '#282418', '#302a1c');
/** The light the dusk lays on the sand, and the shade of the dunes. */
export const LIGHT_POOL = ramp('#42321e', '#4a3822', '#523e26');
export const SHADOW = ramp('#24202a', '#2a2530');
/** The mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The desert's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: BEETLE, skin: BEETLE };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The dunes have ${PALETTE.length} colors: 256 at most`);
