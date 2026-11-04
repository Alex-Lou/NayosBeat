/**
 * Firefly Forest's palette (docs/art/decor-firefly-forest.md §3): its own. An enchanted forest at
 * night: a deep indigo sky, the pale moon, the layered trunks in blue-greens, the dark pond, the
 * fireflies and the glowing mushrooms. Held inside the flash measures' band (docs/flashs.md §3):
 * the masses stay dark, the fireflies are small lights. Slot 0 is transparent, every other color
 * opaque. The fighters own cyan and magenta: the greens stay dark and dull, far from cyan.
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

/** The night sky, overhead to the trees: deep indigo, then a pale green glow. */
export const SKY = ramp(
  '#1b1b30',
  '#1c1e34',
  '#1e2138',
  '#21243b',
  '#25273f',
  '#2a2a43',
  '#302d46',
  '#373047',
  '#3e3347',
);
export const CLOUD = ramp('#252540', '#2c2a46', '#34304c');
/** The moon, pale, through the branches. */
export const MOON = ramp('#5a5870', '#9a98a8', '#d0ccd8');
/** The far trees, three planes, the farthest off the light. */
export const TREE_FAR = ramp('#2a2b34', '#30313c', '#363744');
export const TREE_MID = ramp('#242530', '#2a2b36', '#30313c');
export const TREE_NEAR = ramp('#1e1f2a', '#242530', '#2a2b36');
/** The bark, blue-green; the roots. */
export const BARK = ramp('#20282a', '#282e2c', '#303a32', '#384434');
/** The canopies: dark blue-greens, a moonlit tip for the touches under 1 % of the screen. */
export const LEAF = ramp('#1c2a2c', '#223230', '#283a36');
export const LEAF_LIT = ramp('#284234', '#2a4436');
/** The pond, dark and still. */
export const POND = ramp('#1c2630', '#222c38', '#283440');
/** The fireflies and the glowing mushrooms: small lights, yellow-green. */
export const FIREFLY = ramp('#5e5e28', '#8a8a38', '#c8c850', '#f0f068');
export const SHROOM = ramp('#4a4a2a', '#6a6a34', '#9a9a48', '#d0d060');
/** The moss, the earth of the path, the stones. */
export const MOSS = ramp('#22302a', '#2a3a30');
export const EARTH = ramp('#262a26', '#2e322c', '#363a32', '#3e4238');
export const STONE = ramp('#242630', '#2c2e38');
/** The light the moon lays on the pond and the path. */
export const LIGHT_POOL = ramp('#2e3038', '#383a42', '#42444c');
/** The figures. */
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');
export const SHADOW = ramp('#24202a', '#2a2530');
/** The mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The clearing's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) {
  throw new Error(`The firefly forest has ${PALETTE.length} colors: 256 at most`);
}
