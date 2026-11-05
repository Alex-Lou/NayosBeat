/**
 * The Loading Dock's palette (docs/art/decor-dock.md §3): high-contrast, vibrant pixel-art ramps
 * for the industrial yard behind L'Entrepôt. Warm terracotta brick, crisp industrial concrete,
 * metallic steel and rust, violet club glow, golden sodium wall packs, painted cream delivery van,
 * cherry-red sedan, and vivid hazard yellow. Slot 0 is transparent, every other color opaque.
 */

import { MIST_HEXES } from '../kit/fog.ts';
import type { Rgba } from '../../sprites/png.ts';
import type { FigureRamps } from '../rue/people.ts';
import type { SignRamps, SprayRamps } from '../rue/signs.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The industrial night sky grading into a warm violet-amber city horizon. */
export const SKY = ramp(
  '#1b1d36',
  '#242344',
  '#2f2952',
  '#3c3160',
  '#4c396c',
  '#5e4374',
  '#744e78',
  '#8c5c78',
  '#a66c76',
);
export const CLOUD = ramp('#342c54', '#483a68', '#624c7c', '#826290');
/** Distant towers and warehouses across the railyard. */
export const DISTANT = ramp('#22203e', '#2d2a4e', '#3b3660', '#4c4674');
export const DISTANT_LIT = ramp('#6c5278', '#9e7478', '#d8a274');
/** L'Entrepôt's back wall: warm terracotta-red brick with crisp mortar contrast. */
export const BRICK = ramp(
  '#241a26',
  '#34222c',
  '#482d34',
  '#5e3a3c',
  '#784946',
  '#945b50',
  '#b2705c',
  '#d28a6c',
);
/** The dock's platform and the yard's slabs: crisp industrial concrete. */
export const CONCRETE = ramp(
  '#24222e',
  '#322f3e',
  '#423e50',
  '#544f62',
  '#686276',
  '#7e778c',
  '#9890a4',
  '#b6aebe',
);
export const ASPHALT = ramp('#1d1d2a', '#29293a', '#38384c', '#4c4c62');
/** Steel: the canopy, the frames, the door, the rails. */
export const STEEL = ramp('#1e2030', '#2c2f42', '#3e4258', '#545a72', '#707892', '#949eb8');
/** The roll-up shutters, painted industrial slate-violet. */
export const SHUTTER = ramp('#261e32', '#362a46', '#48385c', '#5c4874', '#745c8e', '#9074aa');
/** Rust on steel and in streaks down the concrete. */
export const RUST = ramp('#422420', '#643624', '#8a4c2a', '#b26434', '#d88242');
/** The dock's edge and the yard's lines: bright hazard yellow. */
export const HAZARD = ramp('#6e5824', '#a88a30', '#e8c440');
/** Black rubber: the dock bumpers. */
export const RUBBER = ramp('#16141e', '#22202c', '#343040');
/** A sodium wall pack: its glow, the lens, its core. */
export const SODIUM = ramp('#5c3826', '#985c32', '#dc8e3e', '#ffbe68', '#ffeaac');
/** The club's light through frosted glass: vivid electric violet. */
export const GLASS = ramp('#342454', '#4e3678', '#6c4c9e', '#946cc6', '#c298f0');
/** A few panes lit by the club's warm amber lights. */
export const GLASS_WARM = ramp('#643838', '#985644', '#d47e52');
export const PERSON = ramp('#1e1928', '#2a2438', '#38304a', '#4a405e', '#605476');
export const SKIN = ramp('#784c3e', '#a86e5a', '#d49478');
export const RIM_WARM = ramp('#94624e', '#c48460', '#f0ac78');
export const RIM_VIOLET = ramp('#6c5090', '#9874c4');
/** The cigarettes' ends. */
export const EMBER = ramp('#943020', '#ff6e40');
/** The EXIT sign over the stage door: its box, its lit emerald letters. */
export const EXIT = ramp('#1e3828', '#326440', '#54a862', '#98f0a0');
export const NEON_DEAD = ramp('#463a50', '#64546e');
export const LIGHTBOX = ramp('#846e50', '#b89c68', '#e4c884');
export const SIGN_INK = ramp('#4a1e28', '#78323a');
export const TAG = {
  outline: ramp('#17141c')[0] ?? 0,
  rose: ramp('#945450', '#bc6e68'),
  violet: ramp('#6c4e98', '#926cc4'),
  ochre: ramp('#a86e3c', '#d4904a'),
  cream: ramp('#b4a48c', '#dcd0b4'),
  green: ramp('#4a7244', '#689c5c'),
} as const;
/** Pallets: rough pine wood. */
export const WOOD = ramp('#382822', '#543c2e', '#76543e', '#9c7252');
/** The dumpster, painted industrial forest green. */
export const DUMPSTER = ramp('#1e2c2a', '#2c423e', '#3e5c56', '#567c74');
export const BAG = ramp('#1c1a24', '#2a2636', '#3c364c', '#564e68');
export const CAT = ramp('#1c1822', '#342c3e');
export const STEAM = ramp('#5c5268', '#786c84', '#988ca4', '#bcb0c6');
export const PAPER = ramp('#706460', '#94867c', '#b8aa9a', '#dcd0be');
/** The delivery van (painted silver-cream) and the cherry-crimson sedan. */
export const VAN = ramp('#323446', '#484c62', '#646882', '#868ca6', '#aeb4cc');
export const CAR = ramp('#3a1c20', '#5a2a2e', '#80383c', '#a84a4e', '#d06264');
/** The sleeper's blanket, his cardboard. */
export const BLANKET = ramp('#482c2c', '#643c38', '#845248');
export const CARDBOARD = ramp('#4c3a2c', '#6c523a', '#906e4a');
/** Bottles in their crates. */
export const BOTTLE = ramp('#284834', '#407050');
/** The puddles the rain leaves on the yard: concrete tones when dry. */
export const WET = ramp(
  '#24222e',
  '#322f3e',
  '#423e50',
  '#544f62',
  '#686276',
  '#7e778c',
  '#9890a4',
  '#b6aebe',
);
/** The same for the asphalt's puddles: the asphalt's colors, dry. */
export const WET_ASPHALT = ramp('#1d1d2a', '#29293a', '#38384c', '#4c4c62');
export const POSTER_RED = ramp('#78323a', '#a8484e');
/** The club's violet light spilling on the brick wall and the concrete dock/yard. */
export const BRICK_VIOLET = ramp(
  '#281c34',
  '#3a2648',
  '#50325e',
  '#684076',
  '#82508e',
  '#9e64a6',
  '#bc7cbe',
  '#da98d6',
);
export const CONCRETE_VIOLET = ramp(
  '#282238',
  '#38304c',
  '#4c4062',
  '#62527a',
  '#7a6692',
  '#947eac',
  '#b09ac6',
  '#ceb8e0',
);
/** The clothes of the dock's people (bouncers, DJ, crowd). */
export const CLOTH = {
  maroon: ramp('#4c2428', '#6e363a', '#944c50'),
  olive: ramp('#323828', '#4c543c', '#6a7454'),
  denim: ramp('#263048', '#384868', '#50648c'),
  beige: ramp('#564840', '#786658', '#9c8672'),
  leather: ramp('#241e26', '#382e38', '#544452'),
  grey: ramp('#30303a', '#464654', '#646272'),
  mustard: ramp('#584426', '#7c6032', '#a48046'),
  black: ramp('#1c1a24', '#2c2836', '#403a4c'),
  khaki: ramp('#463e2e', '#60563e', '#7e7254'),
} as const;
export const HAIR = {
  black: ramp('#18141e', '#26202e', '#3a3044'),
  brown: ramp('#342422', '#50362e', '#6e4c3c'),
  blond: ramp('#685038', '#8e6e4a', '#b08c5c'),
  red: ramp('#562a24', '#783c2e', '#9c523e'),
} as const;

export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };
export const SIGN_RAMPS: SignRamps = {
  steel: STEEL,
  deadTube: NEON_DEAD,
  lightbox: LIGHTBOX,
  ink: SIGN_INK,
};
export const SPRAY_RAMPS: SprayRamps = {
  outline: TAG.outline,
  pale: TAG.cream,
  colors: [TAG.rose, TAG.violet, TAG.ochre, TAG.cream, TAG.green],
};

export const MIST = ramp(...MIST_HEXES);

export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The dock has ${PALETTE.length} colors: 256 at most`);
