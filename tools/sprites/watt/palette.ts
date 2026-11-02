/**
 * Watt's colors (docs/watt.md §9): the colosse of Zen-Tazzer (assets/Mobs/0 - Mobs/2 - Mob Idle),
 * sampled from that drawing. A black quilted nylon jacket with a hood, a black cotton tee, black
 * work trousers with rubber knee pads, black rangers; on both arms a lifting exoskeleton in
 * brushed gunmetal, its diodes in his energy, VU green (the reference's red LEDs: a saturated red
 * is the flashes' red and Riff's second colorway, docs/flashs.md). For a head, a light bulb: a
 * smoked glass globe, a brass cap screwed into the collar, the filament lit in his energy.
 *
 * Second colorway (mirror match): the jacket in sand, the diodes and the filament in UV. The
 * jacket is his biggest mass: sand against black parts the two Watts at a glance.
 *
 * He stands in the same street as Nayo and Riff, under the same light (../street-light.ts): the
 * sodium lamps from above and in front (the key light), the club's violet sign behind him, up
 * high (the back light, the rim tone of every material). Every ramp shifts its hue with its
 * value: the shadows sink toward blue violet, never pure black; the lights warm toward the lamps.
 * Same layout as the others' palettes: drawn once, saved twice.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import { STREET_SIGN } from '../street-light.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

const RIM = STREET_SIGN.color;
const RIM_ON_LIGHT = STREET_SIGN.onLight;

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  /**
   * The quilted jacket: matte black nylon, its puffed bands catching a cool grey sheen on their
   * tops (a puffer shines dull, never sharp). Sand on the second colorway.
   */
  nylon: {
    main: ['#07070c', '#0f0f17', '#171724', '#20202f', '#2b2b3e', '#4a4a62', RIM],
    alt: ['#2a2016', '#4a3a28', '#6e5a40', '#8e7a58', '#ae9a74', '#cfbe98', '#b4a0b8'],
  },
  /** The tee under the open jacket, matte black cotton. */
  cotton: {
    main: ['#07070c', '#0e0d16', '#161522', '#201e2e', '#2c2a3e', '#2c2a3e', RIM],
  },
  /** Black work trousers: a heavy canvas, a little warmer than the nylon. */
  canvas: {
    main: ['#09080e', '#121019', '#1b1824', '#252131', '#332d42', '#4e4658', RIM],
    alt: ['#0d0c14', '#18161f', '#24212d', '#312d3c', '#423c4e', '#5e566a', RIM],
  },
  /** The knee pads and the rangers' soles: matte black rubber. */
  rubber: {
    main: ['#07060c', '#0d0b14', '#15121d', '#1e1a28', '#2a2436', '#3a3348', '#3a3348'],
  },
  /** The rangers: black leather, a warm grey shine on the toe cap. */
  boot: {
    main: ['#09080e', '#13101c', '#1d1928', '#292336', '#3a3248', '#7a6460', RIM],
  },
  /**
   * The exoskeleton: brushed gunmetal plates, cool, a bright sharp edge where the lamps catch a
   * bevel (metal shines where cloth does not).
   */
  metal: {
    main: ['#0a0a12', '#181824', '#262634', '#343446', '#4a4a60', '#9aa0b6', RIM_ON_LIGHT],
  },
  /** The bulb's glass: smoked, dark where nothing lights it, its reflections cool. */
  glass: {
    main: ['#0e1220', '#1a2438', '#26344c', '#334662', '#4c6688', '#c8e0f0', '#7a8cc0'],
  },
  /** The bulb's cap: brass, its threads catching the lamps in warm lines. */
  brass: {
    main: ['#1e1206', '#4a2e0c', '#7a5016', '#a8761e', '#d0a03a', '#f4d47a', RIM_ON_LIGHT],
  },
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Single slots: the bulb's light and the diodes, then the effects. The effect names are the
 * shared ones (`sound` is the energy color, `strike` the impact color, see ../vfx.ts); their
 * colors follow his hit style in src/render/hit-styles.ts.
 */
const DETAILS = {
  /** The darkest line of the effects (a smear's edge, a spark's outline). */
  ink: { main: '#070609' },
  /** The filament's wires and its coil unlit (the bulb out). */
  wire: { main: '#4a4a5a' },
  /** The glass lit from inside, around the filament: two steps of his energy in the smoke. */
  glowDeep: { main: '#123a2a', alt: '#2e1a48' },
  glow: { main: '#1e5e3e', alt: '#4a2a70' },
  /** The diodes and the filament: a lit core, a halo the shading around them takes (glow). */
  ledCore: { main: '#7cf0a8', alt: '#f0b8ff' },
  ledHalo: { main: '#1a4a34', alt: '#4a2a5e' },
  /** Energy (dashes, trails, specials, floor rings): VU green; UV on the second colorway. */
  soundDeep: { main: '#0a5a2a', alt: '#5a1e7a' },
  sound: { main: '#1ec85a', alt: '#e070ff' },
  soundLight: { main: '#8cf0b0', alt: '#f0b8ff' },
  soundCore: { main: '#e8fff0', alt: '#fcf0ff' },
  soundGlow: { main: '#1ec85a58', alt: '#e070ff58' },
  /** Strikes (impacts, cross sparks): a white-green, an arc of current; the same on both. */
  strikeDeep: { main: '#3a5a48' },
  strike: { main: '#d8ffe6' },
  strikeLight: { main: '#f0fff6' },
  strikeCore: { main: '#ffffff' },
  strikeGlow: { main: '#d8ffe658' },
  /** The dark smoky heart of a heavy hit spark. */
  strikeSmoke: { main: '#262a30' },
  /** Motion trails of the limbs, in the energy color, translucent (alpha last). */
  trail: { main: '#1ec85ab4', alt: '#e070ffb4' },
  trailFaint: { main: '#1ec85a5c', alt: '#e070ff5c' },
  /** Dust kicked up from the floor: mauve-grey grit, gold-beige puffs. */
  dustLight: { main: '#584a54' },
  sandDeep: { main: '#7a6440' },
  sand: { main: '#b89a64' },
  sandLight: { main: '#e8d6a8' },
} as const satisfies Record<string, DetailColor>;

export type DetailName = keyof typeof DETAILS;

const PALETTE = definePalette(MATERIALS, DETAILS);

/** Palette slots of every material (slot 0 is transparent). */
export const MATERIAL = PALETTE.material;
/** Palette slot of every detail color. */
export const DETAIL = PALETTE.detail;
export const paletteOf = PALETTE.paletteOf;

/** Watt's effects: green energy, white-green strikes and cross sparkles (an electric arc). */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'cross' };
