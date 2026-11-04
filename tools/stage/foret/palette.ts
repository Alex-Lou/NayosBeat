/**
 * Dancing Forest's palette (docs/art/decor-forest-dance.md §3): its own, drawn from the
 * developer's reference (the pixel forest of the pin): a deep teal night-green forest, the warm
 * glow of a glass-roofed hut, the pale dawn behind the trees. Held inside the flash measures' band
 * (docs/flashs.md §3): the masses stay dark, the glow and the bright leaves are small touches.
 * Slot 0 is transparent, every other color opaque. The fighters own cyan and magenta: the deep
 * teals are dark enough to stay out, the bright greens sit far from cyan.
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

/** The dawn sky, overhead to the trees: a deep navy, then the pale cool light. */
export const SKY = ramp(
  '#12202e',
  '#162636',
  '#1a2c3c',
  '#1f3242',
  '#253847',
  '#2c3e4b',
  '#324450',
  '#374850',
  '#374244',
);
export const CLOUD = ramp('#243444', '#2c3c4a', '#344450');
/** The pale light of the dawn behind the trees, and its veil of haze. */
export const SUNGLOW = ramp('#2f3a42', '#354048', '#37434a');
export const HAZE = ramp('#303c46', '#36424a');
/** The far trees, three planes, the farthest off the light. */
export const TREE_FAR = ramp('#1f2c38', '#253440', '#2b3c48');
export const TREE_MID = ramp('#1a2430', '#202c38', '#263440');
export const TREE_NEAR = ramp('#141e28', '#1a2430', '#202c38');
/** The bark, deep and warm; the roots. */
export const BARK = ramp('#221e16', '#2a241a', '#322a1e', '#3a3020');
/** The foliage: the deep greens and the deep teals, layered; the bright leaves, small touches. */
export const LEAF = ramp('#12301c', '#163a22', '#1a4428');
export const LEAF_TEAL = ramp('#14302c', '#183832', '#1c403a');
export const LEAF_BRIGHT = ramp('#2a5a34', '#3a7a44', '#4e9656');
/** The hut: its warm wood, its glass roof, its warm light inside. */
export const WOOD_HUT = ramp('#2a2016', '#342818', '#3e301c', '#483822');
export const GLASS = ramp('#2a3844', '#2e424e');
export const GLOW = ramp('#7a5a30', '#b08844', '#e8c060', '#ffd878');
/** The cats, warm and pale. */
export const CAT_DARK = ramp('#2a241a', '#342c1e', '#3e3424');
export const CAT_PALE = ramp('#3e382c', '#4a4234');
/** The earth, the moss, the grass, the dead leaves. */
export const EARTH = ramp('#1e241a', '#242a1e', '#2a3022', '#303628');
export const MOSS = ramp('#1c2c1e', '#223620');
export const GRASS = ramp('#2e5a2c', '#3a6e34');
export const DEAD_LEAF = ramp('#3a301f', '#423823', '#4a4026');
/** The stones, the pale light the dawn lays on the path. */
export const STONE = ramp('#242630', '#2c2e38');
export const LIGHT_POOL = ramp('#2e3a42', '#36444a');
/** The bird, the figures. */
export const BIRD = ramp('#2a2830', '#36343c', '#423e44');
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');
export const SHADOW = ramp('#1c2026', '#222630');
/** The mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The clearing's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The forest has ${PALETTE.length} colors: 256 at most`);
