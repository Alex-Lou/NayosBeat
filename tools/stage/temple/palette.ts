/**
 * Temple Courtyard's palette (docs/art/decor-temple.md §3): its own. The Archipel des Légendes at
 * night: a deep blue sky over the sea, the islands' silhouettes, the moon; the courtyard's grey
 * stone and moss, the dark wood, the hall's lacquer gone a deep red, the roof tiles; the light is
 * the warm orange of the paper lanterns and the stone ones' fireboxes. Slot 0 is transparent, every
 * other color opaque. The fighters own cyan and magenta: the cherry's pinks stay dull.
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

/** A ramp given again, tone for tone: a hidden one, which only an atmosphere repaints. */
function twin(of: readonly number[]): readonly number[] {
  return ramp(
    ...of.map((slot) => {
      const { r, g, b } = colors[slot] ?? { r: 0, g: 0, b: 0 };
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }),
  );
}

/** The night over the sea: deep blue overhead, a violet haze down to the horizon. */
export const SKY = ramp(
  '#1b1b2f',
  '#1b1d33',
  '#1c2037',
  '#1f223b',
  '#23243e',
  '#282641',
  '#2e2943',
  '#352c46',
  '#3c2f48',
);
export const CLOUD = ramp('#232540', '#2a2a46', '#33304c', '#3d3651');
export const MOON = ramp('#5e5a6e', '#a8a2b0', '#dcd6d8');
/** The sea, the moon's path on it. */
export const SEA = ramp('#1b1c30', '#1d2034', '#202438', '#24283c', '#292c40');
export const GLITTER = ramp('#4a4a60', '#7a7890', '#b0acbc');
/** The islands, farthest first a step off the sky, the nearer darker. */
export const ISLAND_FAR = ramp('#212238', '#25253c', '#2a2840');
export const ISLAND = ramp('#1c1d30', '#1f2033', '#232337', '#28263b');
/** The courtyard's stone: the walls, the lanterns, the flagstones, the steps. */
export const STONE = ramp(
  '#211f29',
  '#27242e',
  '#2e2a34',
  '#36313b',
  '#3f3943',
  '#4a424c',
  '#564c56',
  '#635760',
);
export const MOSS = ramp('#1e231f', '#253026', '#2e3b2c', '#3a4834');
/** Dark wood: the hall's frame, the railings, the plaques. */
export const WOOD = ramp('#231d25', '#2a2228', '#32272a', '#3c2d2c', '#4a3732');
/** The hall's and the gate's lacquer, a deep red gone dark with the years. */
export const LACQUER = ramp('#2a1820', '#3a1c22', '#4b2226', '#5c282c', '#6a3030');
/** The roofs' tiles, grey-blue. */
export const TILE = ramp('#1c1c26', '#21212c', '#272733', '#2e2e3a', '#373744');
/** The paper lanterns and the stone lanterns' fire: their glow (two steps), the paper, the flame. */
export const LANTERN = ramp('#4a2a1e', '#7a3e22', '#c46a30', '#f0a050', '#ffd890');
/**
 * Paper: the hall's doors lit from within (their two masses, inside the flashes' band), and the
 * shide on the gate's rope and the omikuji knots (its light touches).
 */
export const PAPER = ramp('#4a3c3e', '#5e4442', '#a09a8c');
export const ROPE = ramp('#3a3022', '#544630', '#6e5c3c');
/** The cherry tree: its bark, its blossoms (dull pinks, far from the fighters' magenta). */
export const BARK = ramp('#1c1618', '#251c1e', '#2f2426', '#3a2c2c');
export const BLOSSOM = ramp('#3a2832', '#48303c', '#563846', '#643e4c', '#a47480');
/** The fox guardians' stone, a little warmer, and their red bibs. */
export const BIB = ramp('#4a1e22', '#6a2a2c');
export const BRONZE = ramp('#24261e', '#30332a', '#3e4236', '#505444');
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
/** The fog's mist (kit/fog.ts), used by no atmosphere yet. */
export const MIST = ramp(...MIST_HEXES);
/**
 * The snow (docs/art/decor-temple.md §4), drawn where the snow would settle (the roofs, the walls'
 * caps, the lanterns' tops, the flagstones), tone for tone with what it covers: dry, nothing shows;
 * under the snow, they turn to snow.
 */
export const SNOW_TILE = twin(TILE);
export const SNOW_STONE = twin(STONE);
export const SNOW_MOSS = twin(MOSS);
export const SNOW_BLOSSOM = twin(BLOSSOM);

/** The courtyard's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The temple has ${PALETTE.length} colors: 256 at most`);
