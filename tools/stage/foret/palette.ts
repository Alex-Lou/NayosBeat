/**
 * Dancing Forest's palette (docs/art/decor-forest-dance.md §3): its own. A clearing at dawn: the
 * sky from a cold blue-grey overhead to a warm glow behind the trees, the layered trunks, the dark
 * green canopies, the earth of the path, the dead leaves. Held inside the flash measures' band
 * (docs/flashs.md §3): a dawn, never a full day. Slot 0 is transparent, every other color opaque.
 * The fighters own cyan and magenta: the greens stay dark and dull, the dawn's pink stays unlit.
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

/** The dawn sky, overhead to the trees: cold blue-grey, then the warm glow. */
export const SKY = ramp(
  '#222634',
  '#262936',
  '#2b2d38',
  '#30323c',
  '#38373f',
  '#413d42',
  '#4a4346',
  '#50443e',
  '#52443c',
);
export const CLOUD = ramp('#2c2c3e', '#343448', '#3c3c50');
/** The low sun's glow through the trunks. */
export const SUNGLOW = ramp('#463c3e', '#4c423e', '#52423c');
/** The far trees, three planes, the farthest off the light. */
export const TREE_FAR = ramp('#2a2b34', '#30313c', '#363744');
export const TREE_MID = ramp('#242530', '#2a2b36', '#30313c');
export const TREE_NEAR = ramp('#1e1f2a', '#242530', '#2a2b36');
/** The bark, dark and warm; the roots. */
export const BARK = ramp('#2a2220', '#342a24', '#3e322a', '#4a3c2e');
/** The canopies: dark greens, a sunlit tip for the touches under 1 % of the screen. */
export const LEAF = ramp('#1c2c18', '#22341c', '#283c20', '#2e4424');
export const LEAF_LIT = ramp('#425e2c', '#4e6e34');
/** The dead leaves on the path, the moss. */
export const DEAD_LEAF = ramp('#3a301f', '#423823', '#4a4026');
export const MOSS = ramp('#243022', '#2c3a26');
/** The earth of the path, the stones. */
export const EARTH = ramp('#2e2620', '#362c24', '#3e3228', '#46382c');
export const STONE = ramp('#242630', '#2c2e38');
/** The dawn's pink, unlit, far from the fighters' magenta. */
export const BLUSH = ramp('#4a3444', '#563c4c');
/** The light the dawn lays on the path. */
export const LIGHT_POOL = ramp('#3a3226', '#463c2a', '#52462e');
/** The bird, the figures. */
export const BIRD = ramp('#2a2830', '#36343c', '#423e44');
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

if (PALETTE.length > 256) throw new Error(`The forest has ${PALETTE.length} colors: 256 at most`);
