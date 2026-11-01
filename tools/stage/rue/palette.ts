/**
 * The street's one palette (docs/art/decor-rue.md §4): ramps of tones, each from a cold violet
 * shadow to a warm sodium-lit tone, so the night and the street lamps are in the colors
 * themselves. Slot 0 is transparent. Every color is opaque: the stage takes whole pixels only.
 * The fighters own cyan and magenta; nothing here comes near them.
 */

import type { Rgba } from '../../sprites/png.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** Transparent: what a layer in front shows the one behind through. */
export const CLEAR = 0;

export const SKY = ramp(
  '#1b1b2f',
  '#231e3a',
  '#29223f',
  '#302545',
  '#38294a',
  '#432e4f',
  '#503452',
  '#5e3b55',
  '#6d4357',
);
/** Low clouds lit from below by the city. */
export const CLOUD = ramp('#2a2342', '#352a4a', '#433152', '#55395a');
/** Distant towers, one step off the sky (aerial perspective). */
export const DISTANT = ramp('#211c37', '#26203c', '#2c2442', '#342a48');
export const DISTANT_LIT = ramp('#4c3a55', '#6c4c58', '#8e6458');
export const STEEL = ramp('#1e1c2c', '#221d2f', '#2a2437', '#352d42', '#463a4e', '#5e4c58');
export const BRICK_RED = ramp(
  '#251b27',
  '#2d1f2b',
  '#382530',
  '#442b34',
  '#523339',
  '#633c3e',
  '#784943',
  '#905849',
);
export const BRICK_PAINTED = ramp(
  '#211d2a',
  '#282330',
  '#302a38',
  '#3a3341',
  '#463d4b',
  '#564a55',
  '#6b5b5e',
);
export const BRICK_TAN = ramp(
  '#272129',
  '#2f2830',
  '#393038',
  '#463a41',
  '#55484b',
  '#685855',
  '#7f6b5f',
  '#9a826a',
);
export const STONE = ramp('#2c2834', '#383241', '#463f4e', '#585060', '#6d6370', '#86787c');
export const GLASS = ramp('#1f1c2e', '#221f31', '#2a2639', '#363048', '#463d58');
export const WARM = ramp('#4a3036', '#6b4239', '#8f5a3f', '#b47a4d', '#d29e63', '#e8c086');
export const COOL = ramp('#26343c', '#2e3e42', '#3e5252', '#5e766c', '#8aa08e');
export const CURTAIN = ramp('#6b4a40', '#8a6248', '#a87e58');
export const SHUTTER = ramp('#24232f', '#2d2b39', '#383545', '#454152', '#555064');
export const AWNING = ramp('#2a1822', '#3a1f29', '#4e2730', '#643238');
export const LIGHTBOX = ramp('#6e5c44', '#9a8256', '#bba46a');
export const SIGN_INK = ramp('#3a1a22', '#5c2a2e');
/** A neon tube: its glow on the wall (two steps), the tube, its core. */
export const NEON_ORANGE = ramp('#4a2a2c', '#7a3c2e', '#c86a36', '#f0a066', '#ffd2a4');
export const NEON_VIOLET = ramp('#33264a', '#553a7c', '#8a5cc4', '#b48ae6', '#e2ccff');
export const NEON_DEAD = ramp('#3a3040', '#4c3e4c');
export const LAMP = ramp('#c87a3e', '#f0b064', '#ffe0a8');
export const PERSON = ramp('#1d1825', '#241e2c', '#2c2535', '#372e40', '#43384b');
export const RIM_WARM = ramp('#7a5246', '#a06a52', '#c48a62');
export const RIM_VIOLET = ramp('#55406e', '#74589a');
export const RIM_COOL = ramp('#4e6662', '#6e8a80');
export const SKIN = ramp('#6a4438', '#946050', '#b88064');
export const CONCRETE = ramp(
  '#25222b',
  '#2c2832',
  '#34303a',
  '#3d3843',
  '#47414c',
  '#534b56',
  '#605760',
  '#6f646b',
);
export const ASPHALT = ramp('#1f1d26', '#25222c', '#2c2833');
export const TAG = {
  outline: ramp('#17141c')[0] ?? CLEAR,
  rose: ramp('#6e4058', '#8a5470'),
  teal: ramp('#36605e', '#4a7a74'),
  cream: ramp('#9a8c78', '#b8aa90'),
  violet: ramp('#574078', '#6e5294'),
  ochre: ramp('#8a5a34', '#a8723e'),
} as const;
export const PAPER = ramp('#5c5250', '#746860', '#8c7e6e', '#a29280');
export const POSTER_RED = ramp('#5e2a30', '#7a383a');
export const PLYWOOD = ramp('#33272a', '#433230', '#563f38', '#6a4e42');
export const FRUIT = {
  orange: ramp('#8a4a2a', '#b46a32', '#d08a44'),
  red: ramp('#5a2228', '#7c3032'),
  green: ramp('#33442e', '#4a5e38'),
  yellow: ramp('#8c7a3a', '#b09a4a'),
} as const;
export const CRATE = ramp('#3a2a26', '#54402e', '#6e543a');
export const HYDRANT = ramp('#3e1e26', '#5a2a30', '#7a3a3a', '#9a5446');
export const BAG = ramp('#19171f', '#221f29', '#2e2a36', '#423c4c');
export const STEAM = ramp('#4a4252', '#5e5464', '#746876', '#8a7c86');
export const CAT = ramp('#1a161e', '#2a2430');

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The street has ${PALETTE.length} colors: 256 at most`);
