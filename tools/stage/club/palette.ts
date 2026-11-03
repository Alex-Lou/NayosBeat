/**
 * L'Entrepôt's palette, inside (docs/art/decor-club.md §3): its own. The club at night: a room of
 * black brick and steel, the speaker wall, the DJ's booth; the light is the violet of the LED bar
 * and the stage's lamps, a warm amber at the bar, the crowd dark against it. Slot 0 is
 * transparent, every other color opaque. The fighters own cyan and magenta: the club's violet
 * stays far from both.
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

/** The room: black brick, a step lighter where the stage's light falls. */
export const BRICK = ramp('#1b1b2f', '#1f1d31', '#242034', '#2a2338', '#31273c', '#3a2c41');
/** Steel: the trusses, the speaker cabinets' frames, the bar's rail, the door's frame. */
export const STEEL = ramp('#1d1d2c', '#232232', '#2a2838', '#333041', '#3f3b4e', '#544e62');
/** The speakers' cabinets and their cones. */
export const CABINET = ramp('#1c1b28', '#211f2d', '#282535', '#302c3e');
export const CONE = ramp('#26232f', '#322e3c', '#45404f');
/** The LED bar and the stage's lamps: violet, its glow (two steps), the tube, its core. */
export const VIOLET = ramp('#2c2446', '#463454', '#7c54b8', '#a47ce0', '#dccaff');
/** The bar's warm light, the bottles behind it. */
export const AMBER = ramp('#3e2a22', '#5a3828', '#b4703a', '#e8a85c');
export const GLASS = ramp('#2a3a30', '#3e5a44', '#4a3a2a', '#6a5034');
/** The bar's counter, the booth's front: dark wood. */
export const WOOD = ramp('#231d25', '#2a2228', '#33282b', '#3e2f2f');
/** The dance floor: dark polished concrete, its taped lines, its shine. */
export const FLOOR = ramp('#1c1b27', '#201f2b', '#252331', '#2b2837', '#322e3e', '#3a3545');
export const TAPE = ramp('#4a4436', '#6a6248');
/** The crowd, in silhouettes, its rim of violet; the bartender, the DJ. */
export const PERSON = ramp('#1a1824', '#1f1c29', '#252130', '#2c2737', '#352f41');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#7a5aa8', '#a482d4');
/** The yard outside the loading door: the night, the wet concrete (docs/art/decor-dock.md). */
export const NIGHT = ramp('#1b1b2f', '#211e36', '#2a243e');
export const YARD = ramp('#242230', '#2c2a38', '#353241');
export const SODIUM = ramp('#5a3a26', '#c47a3a', '#f0b064');
/** The rain falling in the doorway, drawn only by the rain's animation. */
export const RAIN = ramp('#3c4262', '#566082', '#7e88aa');
/** The stage's smoke, drawn only in the fog (kit/fog.ts): the dancefloor's haze. */
export const MIST = ramp(...MIST_HEXES);

/** The club's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The club has ${PALETTE.length} colors: 256 at most`);
