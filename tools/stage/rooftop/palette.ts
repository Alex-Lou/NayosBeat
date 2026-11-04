/**
 * Rooftop Rain's palette (docs/art/decor-rooftop.md §3): its own. Néon Underground, 2090: a night of
 * deep blue over a megacity, its low clouds lit violet from below; the roof's slate membrane, its
 * concrete, its steel; the giant signs' light, seen from behind, violet and yellow, a few tubes of
 * acid green and orange. Slot 0 is transparent, every other color opaque. The fighters own cyan
 * and magenta; nothing vivid here comes near them (the city's cyan and magenta are theirs alone).
 */

import { MIST_HEXES } from '../kit/fog.ts';
import type { Rgba } from '../../sprites/png.ts';
import type { FigureRamps } from '../rue/people.ts';
import type { SprayRamps } from '../rue/signs.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The night over the megacity: deep blue overhead, violet down to the towers' glow. */
export const SKY = ramp(
  '#1b1b2f',
  '#1c1d34',
  '#1e2039',
  '#21223d',
  '#262441',
  '#2c2745',
  '#332a49',
  '#3b2d4b',
  '#44304c',
);
/** Low clouds, their bellies lit violet by the city. */
export const CLOUD = ramp('#24233d', '#2c2744', '#362c4b', '#433251');
/** The farthest towers, half gone in the haze, a step off the sky. */
export const HAZE = ramp('#211f3a', '#24223e', '#282541', '#2d2945');
/** The nearer towers: darker than their sky, edged by it. */
export const TOWER = ramp('#1c1c31', '#1e1e35', '#22213a', '#27253f', '#2d2a45');
/** Windows awake in the towers: mostly the dim step, a few lit runs. */
export const WINDOW = ramp('#2f2c4a', '#463c5e', '#64546e', '#8a7676');
/**
 * The giant signs' light, seen from behind: violet (ネオン) and yellow (大吉). The two darkest steps
 * of each are the glow spilling around the letters, wide: they stay inside the flashes' band and
 * under the flash measures' ceiling (kit/grade.ts BACKDROP_CEILING); the lighter ones are rims and
 * tubes, touches under 1 % of the screen each (docs/flashs.md §3).
 */
export const NEON_VIOLET = ramp('#2e2448', '#4a3354', '#7c54b8', '#a47ce0', '#e0ccff');
export const NEON_YELLOW = ramp('#33291f', '#56381f', '#c89430', '#f0c860', '#fff0b0');
/** Small tubes: acid green on the hut, orange on the far towers and the flying cars' tails. */
export const NEON_GREEN = ramp('#25331f', '#3e6a24', '#7ab838', '#c4f070');
export const NEON_ORANGE = ramp('#40241a', '#8a4220', '#d86a2a', '#ffa860');
/** Aviation lights: their glow, the lamp. */
export const AVIATION = ramp('#4a1c20', '#e04030');
/** Headlights far off, and the blimp's searchlight lens. */
export const PALE = ramp('#a8a4b4', '#e8e4f0');
/** Steel: the signs' trusses and letter backs, the antennas, the rails. */
export const STEEL = ramp('#1c1c28', '#20202d', '#262635', '#2e2e3e', '#3a3a4c', '#4e4c60');
/** The hut, the parapets, the walkway's pavers: cool concrete. */
export const CONCRETE = ramp(
  '#211f2b',
  '#262431',
  '#2d2a37',
  '#35313f',
  '#3e3948',
  '#484252',
  '#554d5e',
  '#635a6a',
);
/** The roof's membrane: dark slate sheets, their seams. */
export const MEMBRANE = ramp('#1c1c27', '#20202c', '#252431', '#2b2937', '#322f3d', '#3a3644');
export const RUST = ramp('#36221f', '#4c2e20', '#653c24', '#7e4e2c');
/** The hut's lamp over its door: sodium, its glow (two steps), its lens, its core. */
export const SODIUM = ramp('#42291f', '#6e4428', '#c47a3a', '#f0b064', '#ffe0a8');
export const STEAM = ramp('#3c384a', '#4e485a', '#625a6a', '#78707c');
/** The water tank's old paint, a dull blue-green gone grey (hue far from the fighters' cyan). */
export const TANK = ramp('#1e2228', '#242a30', '#2c3238', '#363c40', '#424646');
/** The blimp: its hull, darkest under, and its gondola's frame. */
export const HULL = ramp('#1d1d2a', '#232331', '#2a2a39', '#333343', '#3e3d4f', '#4c4a5c');
/**
 * The searchlight's beam, drawn sparse over what is behind it. BEAM_DROP is the rain caught in it:
 * BEAM's own tones but under the rain (atmospheres.ts), where it lights up.
 */
export const BEAM = ramp('#363a5e', '#4c5078', '#6c709a');
export const BEAM_DROP = ramp('#363a5e', '#4c5078', '#6c709a');
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const EMBER = ramp('#7a2a1c', '#e0603a');
/** The rim the hut's sodium draws on people. */
export const RIM_WARM = ramp('#7a5246', '#a06a52', '#c48a62');
/** An umbrella's dark canopy. */
export const UMBRELLA = ramp('#1c2422', '#26322e', '#32403a');
/** The laundry on its line and the crowd's clothes: colors gone dull in the night. */
export const CLOTH = {
  red: ramp('#3e2430', '#563040', '#6e3e50'),
  blue: ramp('#252b42', '#323a56', '#424c6e'),
  cream: ramp('#48423e', '#625a50', '#7c7264'),
  olive: ramp('#262c22', '#363e2e', '#4a543e'),
  leather: ramp('#1e1920', '#2b242c', '#3e3440'),
  black: ramp('#181720', '#22202c', '#302d3c'),
  mustard: ramp('#44341e', '#5e4828', '#7a5e34'),
} as const;
export const HAIR = {
  black: ramp('#15131c', '#201c28', '#2e2838'),
  brown: ramp('#2a1e1e', '#3e2b26', '#543a30'),
} as const;
/**
 * Colored light from the giant signs and the sodium lamp falling on the roof's membrane and
 * concrete (kit/light.ts `spill`), even on a dry night.
 */
export const MEMBRANE_VIOLET = ramp(
  '#201c2e',
  '#262036',
  '#2d253f',
  '#352b48',
  '#3e3252',
  '#48395a',
);
export const MEMBRANE_YELLOW = ramp(
  '#221e26',
  '#29242a',
  '#312a2e',
  '#3a3132',
  '#443936',
  '#4e413a',
);
export const CONCRETE_VIOLET = ramp(
  '#241f30',
  '#2b2438',
  '#332b42',
  '#3c324b',
  '#463a54',
  '#50425d',
  '#5c4c66',
  '#68566e',
);
export const TAG = {
  outline: ramp('#17141c')[0] ?? 0,
  violet: ramp('#4e3a6e', '#664c8c'),
  yellow: ramp('#7a6430', '#98803c'),
  green: ramp('#3a5634', '#4e7040'),
  cream: ramp('#8a8070', '#a89c86'),
} as const;
/**
 * The puddles the rain leaves on the roof, drawn where the membrane or the pavers would be, tone for
 * tone: dry, they are the roof's own colors and nothing shows; under the rain (atmospheres.ts),
 * they turn to water. REFLECT_* are the long streaks the signs draw in them, the membrane's tones
 * too while it is dry.
 */
export const WET = ramp('#1c1c27', '#20202c', '#252431', '#2b2937', '#322f3d', '#3a3644');
export const WET_PAVER = ramp(
  '#211f2b',
  '#262431',
  '#2d2a37',
  '#35313f',
  '#3e3948',
  '#484252',
  '#554d5e',
  '#635a6a',
);
export const REFLECT_VIOLET = ramp(
  '#1c1c27',
  '#20202c',
  '#252431',
  '#2b2937',
  '#322f3d',
  '#3a3644',
);
export const REFLECT_YELLOW = ramp(
  '#1c1c27',
  '#20202c',
  '#252431',
  '#2b2937',
  '#322f3d',
  '#3a3644',
);

/** The roof's ramps for the shared drawing code (people.ts, signs.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };
export const SPRAY_RAMPS: SprayRamps = {
  outline: TAG.outline,
  pale: TAG.cream,
  colors: [TAG.violet, TAG.yellow, TAG.green, TAG.cream],
};

/** The mist's wisps, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The rooftop has ${PALETTE.length} colors: 256 at most`);
