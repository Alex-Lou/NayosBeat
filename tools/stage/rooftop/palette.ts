/**
 * Rooftop Rain's palette (docs/art/decor-rooftop.md §3): high-contrast cyberpunk pixel-art ramps.
 * Néon Underground, 2090: a luminous indigo-violet sky over a megacity, clouds lit from below,
 * multi-step skyscraper silhouettes and lit windows, crisp concrete pavers and slate membrane,
 * metallic steel trusses, copper-green water tank, and blazing violet, golden, acid-green and
 * orange neon signs. Slot 0 is transparent, every other color opaque.
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

/** The night over the megacity: deep indigo overhead grading into a glowing violet-rose horizon. */
export const SKY = ramp(
  '#1b1d36',
  '#222344',
  '#2c2952',
  '#383160',
  '#46396e',
  '#58437a',
  '#6c4f84',
  '#825c8c',
  '#9a6b92',
);
/** Low clouds, their bellies lit violet by the city. */
export const CLOUD = ramp('#302c52', '#443a68', '#5e4c80', '#7e649a');
/** The farthest towers in the atmospheric haze. */
export const HAZE = ramp('#28264a', '#36325c', '#464070', '#585086');
/** The nearer skyscrapers: crisp 3D contrast from deep shadow to neon-edged rims. */
export const TOWER = ramp('#1c1e36', '#282b4a', '#363a60', '#484e78', '#606694');
/** Windows awake in the towers: warm gold and violet-lit office bands. */
export const WINDOW = ramp('#423c68', '#6e5e92', '#a88cb8', '#f0d6c8');
/** The giant signs' light, seen from behind: electric violet (ネオン) and golden yellow (大吉). */
export const NEON_VIOLET = ramp('#38285c', '#5e3e88', '#8c60c8', '#b88cf0', '#ead6ff');
export const NEON_YELLOW = ramp('#423222', '#744c26', '#d49e34', '#f8d068', '#fff4b8');
/** Small tubes: acid green on the hut, orange on the far towers and flying cars. */
export const NEON_GREEN = ramp('#283e22', '#467c28', '#84c83e', '#d0f878');
export const NEON_ORANGE = ramp('#4c2a1e', '#984c24', '#e4742e', '#ffb468');
/** Aviation lights: their glow, the lamp. */
export const AVIATION = ramp('#5c2024', '#f04838');
/** Headlights far off, and the blimp's searchlight lens. */
export const PALE = ramp('#b4b0c4', '#f2eef8');
/** Steel: the signs' trusses and letter backs, the antennas, the rails. */
export const STEEL = ramp('#1e2030', '#2e3146', '#424660', '#5a607c', '#78809c', '#9ea6c4');
/** The hut, the parapets, the walkway's pavers: crisp cool concrete. */
export const CONCRETE = ramp(
  '#242232',
  '#343144',
  '#464258',
  '#5a556e',
  '#706a86',
  '#88829e',
  '#a49cb8',
  '#c4bcd6',
);
/** The roof's membrane: slate-blue sheets with distinct lap seams. */
export const MEMBRANE = ramp('#1d1e2e', '#282a3e', '#363850', '#464864', '#585a7a', '#6e7092');
export const RUST = ramp('#422622', '#643824', '#8a4e2a', '#b46834');
/** The hut's lamp over its door: warm sodium glow. */
export const SODIUM = ramp('#543424', '#8e5630', '#d4863e', '#f8ba6c', '#ffe8b0');
export const STEAM = ramp('#4c465e', '#68607a', '#888098', '#aca4ba');
/** The water tank's weathered patina green-slate paint. */
export const TANK = ramp('#1e2830', '#2c3a44', '#3e505c', '#546876', '#6e8492');
/** The blimp: its hull, darkest under, and its gondola's frame. */
export const HULL = ramp('#1e2030', '#2a2c40', '#383a52', '#4a4c68', '#606280', '#7a7c9c');
/** The searchlight's beam and rain caught in it. */
export const BEAM = ramp('#444874', '#646898', '#8c92c0');
export const BEAM_DROP = ramp('#444874', '#646898', '#8c92c0');
export const PERSON = ramp('#1c1a28', '#282438', '#36304a', '#484060', '#5e5478');
export const SKIN = ramp('#744c40', '#a46c58', '#d09276');
export const EMBER = ramp('#8e3020', '#f4683e');
/** The rim the hut's sodium draws on people. */
export const RIM_WARM = ramp('#8e6050', '#bc8062', '#e8a678');
/** An umbrella's canopy. */
export const UMBRELLA = ramp('#202e2c', '#304440', '#445e58');
/** The laundry on its line and the crowd's clothes. */
export const CLOTH = {
  red: ramp('#50262a', '#74383c', '#9c4e50'),
  blue: ramp('#2a3452', '#3c4a72', '#546696'),
  cream: ramp('#5a524c', '#7c7266', '#a29684'),
  olive: ramp('#2e3828', '#44523a', '#5e7050'),
  leather: ramp('#241e28', '#362e3c', '#504458'),
  black: ramp('#1c1a26', '#2a2838', '#3e3a4e'),
  mustard: ramp('#564224', '#7a5e32', '#a27e44'),
} as const;
export const HAIR = {
  black: ramp('#181622', '#262234', '#38324a'),
  brown: ramp('#342424', '#4e3630', '#6c4c40'),
} as const;
/** Colored light from the giant signs falling on the roof's membrane and concrete. */
export const MEMBRANE_VIOLET = ramp(
  '#241e38',
  '#342a4e',
  '#463866',
  '#5c4a80',
  '#745e9c',
  '#9076b8',
);
export const MEMBRANE_YELLOW = ramp(
  '#28222c',
  '#383038',
  '#4c4044',
  '#645452',
  '#7e6a62',
  '#9c8474',
);
export const CONCRETE_VIOLET = ramp(
  '#28223a',
  '#38304e',
  '#4c4064',
  '#62527c',
  '#7a6696',
  '#947eb0',
  '#b098ca',
  '#ceb6e4',
);
export const TAG = {
  outline: ramp('#17141c')[0] ?? 0,
  violet: ramp('#604888', '#8262b0'),
  yellow: ramp('#947a38', '#bc9c48'),
  green: ramp('#446a3c', '#5e9050'),
  cream: ramp('#a49884', '#c8ba9e'),
} as const;
/** The puddles the rain leaves on the roof (dry: equal to MEMBRANE and CONCRETE). */
export const WET = ramp('#1d1e2e', '#282a3e', '#363850', '#464864', '#585a7a', '#6e7092');
export const WET_PAVER = ramp(
  '#242232',
  '#343144',
  '#464258',
  '#5a556e',
  '#706a86',
  '#88829e',
  '#a49cb8',
  '#c4bcd6',
);
export const REFLECT_VIOLET = ramp(
  '#1d1e2e',
  '#282a3e',
  '#363850',
  '#464864',
  '#585a7a',
  '#6e7092',
);
export const REFLECT_YELLOW = ramp(
  '#1d1e2e',
  '#282a3e',
  '#363850',
  '#464864',
  '#585a7a',
  '#6e7092',
);

export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };
export const SPRAY_RAMPS: SprayRamps = {
  outline: TAG.outline,
  pale: TAG.cream,
  colors: [TAG.violet, TAG.yellow, TAG.green, TAG.cream],
};

export const MIST = ramp(...MIST_HEXES);

export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The rooftop has ${PALETTE.length} colors: 256 at most`);
