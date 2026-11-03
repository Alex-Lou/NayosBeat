/**
 * Le Bal du Samedi's palette (docs/art/decor-bal.md §3): its own. A ballroom of the fifties at night,
 * Saphir's place: deep green velvet, gold trims and brass, a honey parquet, ivory walls gone warm
 * in the lamplight; the chandeliers and the marquee's bulbs, warm. Slot 0 is transparent, every
 * other color opaque. The fighters own cyan and magenta: the room's green and gold stay far from both.
 */

import type { Rgba } from '../../sprites/png.ts';
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

/** The velvet: the curtains, the band stand's skirt, the banquettes. */
export const VELVET = ramp('#1c2120', '#1f2a25', '#243229', '#2a3b2e', '#304434');
/** The walls: warm ivory gone dim in the night, their panels. */
export const WALL = ramp('#272123', '#30282a', '#3a2f2f', '#443634', '#4e3f3a');
/** Gold: the trims, the frames, the capitals, the brass of the band. */
export const GOLD = ramp('#3a2c1c', '#5a4224', '#8a6630', '#c49a48', '#f0cc78');
/** The parquet, honey gone dark, its joints. */
export const PARQUET = ramp('#231b1c', '#2b201e', '#342620', '#3d2c22', '#463224');
/** The lamps, the chandeliers, the marquee's bulbs: their glow, the shade, the bulb. */
export const LAMP = ramp('#4a3424', '#7a5430', '#d8a050', '#ffe0a0');
/** The high windows: the night outside, its frame. */
export const NIGHT = ramp('#1b1b2f', '#1e1f34', '#232439');
/**
 * The windows' sills outside, hidden (docs/art/decor-bal.md §4): the night's lowest tone in every
 * palette but the snow's, where it is the snow piled on them.
 */
export const SILL = ramp('#232439', '#232439');
/** The rain and the snow at the windows, drawn only by their weathers' animations. */
export const RAIN = ramp('#3c4262', '#566082', '#7e88aa');
export const SNOW = ramp('#6a6478', '#9a94a8', '#c8c4d0');
/** The tables' cloths, the chairs' dark wood. */
export const CLOTH = ramp('#3e3432', '#52443e', '#66564c');
export const WOOD = ramp('#1e1819', '#271e1e', '#312624');
/** The dancers, the band, in silhouettes; their rim of the lamps' light; a dress's red. */
export const PERSON = ramp('#1a1824', '#1f1c29', '#252130', '#2c2737', '#352f41');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#7a5a3a', '#b08452');
export const DRESS = ramp('#24161d', '#2e1a21', '#3e1c22');

/** The ballroom's ramps for the shared drawing code (people.ts): the men, the women's dresses. */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };
export const DRESS_RAMPS: FigureRamps = { body: DRESS, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The ballroom has ${PALETTE.length} colors: 256 at most`);
