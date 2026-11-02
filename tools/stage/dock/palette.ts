/**
 * The Loading Dock's palette (docs/art/decor-dock.md §3): its own, not the street's. The same night
 * sky as the street (the same city, the same hour), then the yard behind L'Entrepôt: sooty brick,
 * worn concrete, steel and its rust, shutters painted a plum gone grey, hazard yellow; the light is
 * the sodium of the wall packs and the club's violet through its windows. Slot 0 is transparent,
 * every other color opaque. The fighters own cyan and magenta; nothing vivid here comes near them.
 */

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

/** The street's night sky, tone for tone: the same city at the same hour. */
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
export const CLOUD = ramp('#2a2342', '#352a4a', '#433152', '#55395a');
/** Distant towers and warehouses, a step off the sky. */
export const DISTANT = ramp('#211c37', '#26203c', '#2c2442', '#342a48');
export const DISTANT_LIT = ramp('#4c3a55', '#6c4c58', '#8e6458');
/** L'Entrepôt's back wall: brick blackened by exhaust, browner than the street's. */
export const BRICK = ramp(
  '#211b27',
  '#261e28',
  '#2e232c',
  '#392a31',
  '#463237',
  '#553b3d',
  '#674642',
  '#7a5246',
);
/** The dock's platform and the yard's slabs: worn concrete, warm grey. */
export const CONCRETE = ramp(
  '#222029',
  '#29262f',
  '#312d36',
  '#3a353e',
  '#443e47',
  '#504851',
  '#5d545c',
  '#6c6169',
);
export const ASPHALT = ramp('#1d1c26', '#23212b', '#2a2732', '#33303a');
/** Steel: the canopy, the frames, the door, the rails. */
export const STEEL = ramp('#1d1d29', '#20202c', '#282835', '#323241', '#3f3e4e', '#545263');
/** The roll-up shutters, painted plum long ago, gone grey. */
export const SHUTTER = ramp('#241c2b', '#2d2234', '#382a3f', '#44324a', '#513b55', '#60465e');
/** Rust on steel and in streaks down the concrete. */
export const RUST = ramp('#3a2321', '#52301f', '#6c4024', '#88532c', '#a06838');
/** The dock's edge and the yard's lines: hazard yellow, dulled. */
export const HAZARD = ramp('#4a3e24', '#6e5e30', '#94803c');
/** Black rubber: the dock bumpers. */
export const RUBBER = ramp('#16141b', '#1d1b22', '#27242c');
/** A sodium wall pack: its glow (two steps), the lens, its core. */
export const SODIUM = ramp('#4a3026', '#7a4a2e', '#c47a3a', '#f0b064', '#ffe0a8');
/**
 * The club's light through frosted glass: violet, the dancers' shadows its darkest steps. Its
 * mass (up to step 2) stays inside the brightest backdrop the flash tables were measured over
 * (atmospheres.ts BACKDROP); its two lightest are touches only, under 1 % of the screen each
 * (docs/flashs.md §3).
 */
export const GLASS = ramp('#2a2040', '#3a2a50', '#4a3a57', '#6c5088', '#9a7cc0');
/** A few panes lit by the club's orange lights. */
export const GLASS_WARM = ramp('#4a2e30', '#6e4034', '#94583c');
export const PERSON = ramp('#1d1825', '#241e2c', '#2c2535', '#372e40', '#43384b');
export const SKIN = ramp('#6a4438', '#946050', '#b88064');
export const RIM_WARM = ramp('#7a5246', '#a06a52', '#c48a62');
export const RIM_VIOLET = ramp('#55406e', '#74589a');
/** The cigarettes' ends. */
export const EMBER = ramp('#7a2a1c', '#e0603a');
/** The EXIT sign over the stage door: its box, its lit letters. */
export const EXIT = ramp('#1e3226', '#2e5236', '#4c8a52', '#8ccf8a');
export const NEON_DEAD = ramp('#3a3040', '#4c3e4c');
export const LIGHTBOX = ramp('#6e5c44', '#9a8256', '#bba46a');
export const SIGN_INK = ramp('#3a1a22', '#5c2a2e');
export const TAG = {
  outline: ramp('#17141c')[0] ?? 0,
  rose: ramp('#6e4058', '#8a5470'),
  violet: ramp('#574078', '#6e5294'),
  ochre: ramp('#8a5a34', '#a8723e'),
  cream: ramp('#9a8c78', '#b8aa90'),
  green: ramp('#3e5a3a', '#527248'),
} as const;
/** Pallets: rough pine, weathered. */
export const WOOD = ramp('#2e2220', '#3e2e28', '#523c30', '#664a3a');
/** The dumpster, painted a dark green long ago. */
export const DUMPSTER = ramp('#1c2423', '#24302d', '#2e3c37', '#3a4a43');
export const BAG = ramp('#19171f', '#221f29', '#2e2a36', '#423c4c');
export const CAT = ramp('#1a161e', '#2a2430');
export const STEAM = ramp('#4a4252', '#5e5464', '#746876', '#8a7c86');
export const PAPER = ramp('#5c5250', '#746860', '#8c7e6e', '#a29280');
/**
 * The delivery van backed against bay 1 and the old sedan: large surfaces, so their lightest steps
 * stay inside the flashes' band and backdrop (atmospheres.ts DAWN_CEILING, test).
 */
export const VAN = ramp('#26262f', '#2e2d37', '#37353f', '#403c47', '#4a434f');
export const CAR = ramp('#2a1a22', '#36202a', '#432731', '#52303a', '#603a42');
/** The sleeper's blanket, his cardboard. */
export const BLANKET = ramp('#3a2626', '#4c302c', '#5e3c32');
export const CARDBOARD = ramp('#3e3028', '#52402e', '#665036');
/** Bottles in their crates. */
export const BOTTLE = ramp('#24382a', '#33503a');
/**
 * The puddles the rain leaves on the yard: drawn with this ramp where the concrete would be, tone
 * for tone. Dry, it is the concrete's own colors and nothing shows; under the rain
 * (atmospheres.ts), it turns to wet, mirroring the lamps.
 */
export const WET = ramp(
  '#222029',
  '#29262f',
  '#312d36',
  '#3a353e',
  '#443e47',
  '#504851',
  '#5d545c',
  '#6c6169',
);
/** The same for the asphalt's puddles: the asphalt's colors, dry. */
export const WET_ASPHALT = ramp('#1d1c26', '#23212b', '#2a2732', '#33303a');
export const POSTER_RED = ramp('#5e2a30', '#7a383a');

/** The dock's ramps for the shared drawing code (people.ts, signs.ts). */
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

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The dock has ${PALETTE.length} colors: 256 at most`);
