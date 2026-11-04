/**
 * The Dojo's palette (docs/art/decor-dojo.md §3): its own. A training hall at night: dark wood,
 * the paper of the shōji softly lit, the warm orange of the paper lanterns, the rope, the scroll.
 * Held inside the flash measures' band (docs/flashs.md §3): the wood stays dark, the lanterns are
 * small lights. Slot 0 is transparent, every other color opaque. The fighters own cyan and
 * magenta: nothing vivid comes near them.
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

/** The wall behind the screens, the ceiling, dark. */
export const WALL = ramp('#1c1c2a', '#22222e', '#282834');
/** The wood: the pillars, the beams, the floor. */
export const WOOD_DARK = ramp('#241e18', '#2c241c', '#342a20', '#3c3024');
export const WOOD_LIGHT = ramp('#3a3024', '#443a2a', '#4e4230');
/** The paper of the shōji and the lanterns, lit from within. */
export const PAPER = ramp('#423a2c', '#4a4030', '#4e4432');
export const PAPER_LIT = ramp('#4a4030', '#504430');
/** The lanterns' warm light: their glow, their paper, their heart. */
export const LANTERN = ramp('#5a3e22', '#8a5c2c', '#c08838', '#f0b048', '#ffd878');
/** The rope, the scroll, the dummy. */
export const ROPE = ramp('#3a2c1c', '#463420', '#523c24');
export const SCROLL = ramp('#423a2c', '#4a4030');
export const DUMMY = ramp('#2c2218', '#362a1c');
/** The floor's marks, the light the lanterns lay. */
export const LIGHT_POOL = ramp('#463a26', '#4e3e28', '#54442a');
export const SHADOW = ramp('#221e26', '#282430');
/** The rain on the screens, drawn only in the rain. */
export const RAIN = ramp('#2a2a3a', '#343444');
/** The figures. */
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');

/** The hall's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The dojo has ${PALETTE.length} colors: 256 at most`);
