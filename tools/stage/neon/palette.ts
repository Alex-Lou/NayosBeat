/**
 * Neon Dusk's palette (docs/art/decor-neon-dusk.md §3): its own. A cyberpunk street at night: a
 * deep indigo sky over the towers, the asphalt wet, the neon orange and the acid green of the
 * signs, their reflections in the puddles, the steam, the flying cars. Held inside the flash
 * measures' band (docs/flashs.md §3): the masses stay dark, the neons are small lights. Slot 0 is
 * transparent, every other color opaque. The fighters own cyan and magenta: the green stays acid
 * (far from cyan) and nothing is pink.
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

/** The sky, overhead to the city: deep indigo, then the warm haze above the roofs. */
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
export const CLOUD = ramp('#252540', '#2c2a46', '#34304c', '#3c3650');
export const HAZE = ramp('#3a2e42', '#4a3448', '#5a3c48', '#664244');
/** The far city: the farthest towers off the haze, the near ones darker; their windows. */
export const DISTANT_FAR = ramp('#2a2b38', '#30313e', '#363744', '#3c3d4a');
export const DISTANT = ramp('#20222e', '#252733', '#2b2d39', '#313340');
export const WINDOW = ramp('#6a4a38', '#9a6a44', '#c88a54');
/** The neons: a warm orange and an acid green (the lights, kept small), and their signs' frames. */
export const NEON_ORANGE = ramp('#5a2e1e', '#8a4422', '#c06028', '#f09038', '#ffc868');
export const NEON_GREEN = ramp('#2e4a20', '#3e6428', '#4e7c2e', '#66a034', '#8ac848');
export const SIGN_BOARD = ramp('#1e2030', '#262838', '#2e3040');
/** The walls, the towers' steel, the stalls' tin. */
export const WALL = ramp('#1c1e26', '#22242c', '#2a2c34', '#32343c');
export const TIN = ramp('#24242e', '#2c2c38', '#343442');
/** The asphalt, wet where the neons light it; the light the neons lay. */
export const STONE = ramp('#1c1e24', '#22242a', '#2a2c32', '#32343a');
export const PUDDLE = ramp('#181a20', '#1e2028');
export const LIGHT_POOL = ramp('#3a2a20', '#463220', '#523a20', '#5e4220');
export const GREEN_POOL = ramp('#24301c', '#2c3c20', '#324420');
/** The stalls' wood and cloth, the crates. */
export const WOOD = ramp('#241c1c', '#2e2320', '#3a2c26', '#46352b', '#54402f');
export const CLOTH = ramp('#2e2c3a', '#3a3644', '#46424e');
export const CRATE = ramp('#2a241c', '#342c22', '#403528');
/** The steam of the vents and the noodle pot. */
export const STEAM = ramp('#2e2a2e', '#3a3538', '#4a4444', '#5a5250');
/** The flying cars: their bodies, their lit windows and lights. */
export const CAR = ramp('#16181e', '#1e2028', '#262832');
export const CAR_LIGHT = ramp('#8a5a30', '#c89048', '#f0c068');
/** The paper of the signs, the goods. */
export const PAPER = ramp('#3e362e', '#4a423a', '#544a3e');
export const GOODS = ramp('#3a2c30', '#4a3226', '#5e3e2c', '#6a442a');
/** The people, their skin, their rim; the cat. */
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');
export const SHADOW = ramp('#24202a', '#2a2530');
/** The mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The street's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`Neon Dusk has ${PALETTE.length} colors: 256 at most`);
