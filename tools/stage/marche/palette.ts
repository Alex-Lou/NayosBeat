/**
 * Night Market's palette (docs/art/decor-night-market.md §3): its own. A city market at night: a
 * deep indigo sky over a warm haze, the far towers, the stalls' wood and striped awnings, the
 * lanterns' red and their orange light, the wok's steam. Held inside the flash measures' band
 * (docs/flashs.md §3): the sky and the masses stay dark, the lanterns are small lights. Slot 0 is
 * transparent, every other color opaque. The fighters own cyan and magenta: no vivid green or
 * violet comes near them, and the reds stay warm.
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
/** The warm haze over the roofs, the one lighter band of the far layer. */
export const HAZE = ramp('#3a2c34', '#4a3438', '#5a3c3c', '#66423e');
/** The far city: its towers, their dark windows, the lit ones. */
export const DISTANT = ramp('#20222e', '#252733', '#2b2d39', '#313340');
export const WINDOW = ramp('#6a4a38', '#9a6a44', '#c88a54');
/** The wires hanging between the poles. */
export const WIRE = ramp('#141420', '#1c1c28');
/** The stalls' wood: posts, counters, frames. */
export const WOOD = ramp('#241c1c', '#2e2320', '#3a2c26', '#46352b', '#54402f');
/** The awnings: a dark red and a dull cream, in stripes. */
export const AWNING_RED = ramp('#45242a', '#5a2e2f', '#6a3832');
export const AWNING_CREAM = ramp('#3a322a', '#463c30', '#524436');
/** The lanterns: the frame, their glow and their paper, from the lit red to its core. */
export const LANTERN_FRAME = ramp('#3a1e20', '#4c2426');
export const LANTERN = ramp('#5a241e', '#8a3422', '#c0502a', '#f08a3c', '#ffc070');
/** The wok's steam, and the flame that lights it at the market's high moment. */
export const STEAM = ramp('#2e2a2e', '#3a3538', '#4a4444', '#5a5250');
export const FLARE = ramp('#5a3a26', '#8a5a30', '#c07838', '#e0a050');
/** What the stalls sell: cloth, crates, vegetables. */
export const GOODS = ramp('#3a2c30', '#4a3226', '#5e3e2c', '#6a442a');
export const CRATE = ramp('#2a241c', '#342c22', '#403528');
/** The parked scooter: its dark body, its dull red panel. */
export const SCOOTER = ramp('#20202c', '#282836', '#333344', '#4a2428');
/** The stone of the aisle and the floor: flat bands, their joints. */
export const STONE = ramp('#1c1e26', '#22242c', '#2a2c34', '#32343c');
export const PUDDLE = ramp('#1e202c', '#262838');
/** The paper of the signs. */
export const SIGN = ramp('#3a322a', '#463c30', '#524436');
/** The vendors, in silhouettes; their rim; their skin. */
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');
/** The mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The market's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The market has ${PALETTE.length} colors: 256 at most`);
