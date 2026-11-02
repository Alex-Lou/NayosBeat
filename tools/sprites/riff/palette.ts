/**
 * Riff's colors: the punk girl of Zen-Tazzer (assets/Mobs/0 - Mobs/4 - Idl Mob). Black outfit,
 * magenta accents (the fringe, the jacket's patch, the boots' triangles, the lips), silver metal,
 * warm peach skin.
 *
 * Second colorway (mirror match): an oxblood-red leather jacket and gold accents (the fringe dyed
 * gold, the patch, the boots' triangles; crimson lips). The jacket is her biggest mass: red
 * against black changes its value and its hue at once, so the two Riffs part at a glance even in
 * a scramble, and the warm gold against the cool magenta keeps her accents apart. Red leather
 * and gold stay punk (the classic red biker jacket), and they clash with neither of Nayo's
 * colorways (black and cyan, light grey and magenta). The jeans turn a washed charcoal grey, so
 * the lower halves part as well. The hair, the skin, the crop top, the boots and the silver
 * metal stay. Same layout as Nayo's palette: drawn once, saved twice.
 *
 * She stands in the same street as Nayo, under the same light (docs/art/riff-lumiere.md,
 * ../street-light.ts): the sodium lamps from above and in front (the key light), the club's
 * violet sign behind her, up high (the back light, the rim tone of every material). Every ramp
 * shifts its hue with its value: the shadows sink toward blue violet, never pure black; the
 * lights and the shine warm up toward the lamps. Her own character is in her materials: leather
 * with a sharp warm shine, a denim bluer than Nayo's cargo, the magenta of her fringe.
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
   * Warm peach skin, as in the reference: a red-brown outline turning violet, rust shadows, a
   * pale peach light warmed by the lamps; the sign's violet on it is a pale mauve.
   */
  skin: {
    main: ['#4c1828', '#923e3c', '#c86c4e', '#f1ad7a', '#fac690', '#ffdcb0', '#deaabc'],
  },
  /** Blue-black hair, a bluer black than Nayo's; a mauve sheen where the lamps catch it. */
  hair: {
    main: ['#0a0a14', '#111222', '#1a1a2e', '#24243c', '#33324e', '#6e6070', RIM],
  },
  /** The shaved undercut: dark stubble over the scalp, a two-tone brown check. */
  stubble: {
    main: ['#2a1426', '#3c1f2e', '#522c34', '#6a3e3a', '#86543e', '#a06a48', '#a07ca4'],
  },
  /**
   * Her accent color: the dyed fringe, the jacket's round patch, the boots' triangles. A deep
   * magenta, a paint and not a light: its shadows sink toward violet, its light warms toward
   * pink. Gold on the second colorway, its shadows a violet brown.
   */
  magenta: {
    main: ['#1e0828', '#340a3c', '#4e0e4e', '#6c125a', '#921e6a', '#ba3a78', '#b46cc0'],
    alt: ['#1e0e16', '#3a2014', '#664010', '#9a6a16', '#c89628', '#f0cc62', '#d4b4d4'],
  },
  /** Silver: earrings, choker, zipper, studs, buckle, the belt's chain. */
  metal: {
    main: ['#1c1a2a', '#3a3650', '#5c5872', '#8e8ca4', '#c8c4d0', '#fff2dc', RIM_ON_LIGHT],
  },
  /**
   * The cropped jacket: glossy black leather, as dark as the jeans and the boots (its mass reads
   * black, never charcoal canvas); the leather comes from its warm shine, sharp and small, where
   * the lamps catch it. Oxblood-red leather on the second colorway: its shadows sink toward
   * wine violet, its shine warms toward orange (a pink line along the red would outline her like
   * a sticker).
   */
  jacket: {
    main: ['#09090f', '#12121e', '#1c1b2c', '#28263a', '#3a3650', '#8c7270', RIM],
    alt: ['#1c0616', '#3a0a1e', '#5e1222', '#8a1c26', '#ac3030', '#d0583e', '#94669e'],
  },
  /** The crop top: matte black jersey, about the jacket's value (it reads black, not grey). */
  top: {
    main: ['#08070e', '#100e1a', '#191626', '#231f34', '#342c44', '#342c44', RIM],
  },
  /**
   * Black jeans, a washed blue-black denim (the reference's), bluer than Nayo's cargo; its
   * worn folds catch a pale, warmer grey. On the second colorway a washed charcoal-grey denim,
   * two steps lighter: the lower halves part too when the two Riffs scramble jacket against
   * jacket.
   */
  jeans: {
    main: ['#090a13', '#11111f', '#181c2c', '#22273a', '#2f354c', '#665e66', RIM],
    alt: ['#0e0c16', '#1a1826', '#282636', '#383748', '#4a485a', '#6e6878', RIM],
  },
  /** Fingerless gloves, the belt: black leather, a warm shine. */
  leather: {
    main: ['#0a0810', '#15101e', '#20192c', '#2c233a', '#3e3250', '#8a6a64', RIM],
  },
  /** Combat boots: black leather, a warm grey shine on the toe cap (the reference's). */
  boot: {
    main: ['#09080e', '#13101c', '#1d1928', '#292336', '#3a3248', '#7a6460', RIM],
  },
  /** Thick lugged rubber soles: matte, they never shine. */
  sole: {
    main: ['#08070e', '#0e0c16', '#16131f', '#1f1b2a', '#2c2536', '#2c2536', '#2c2536'],
  },
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Single slots: face details, then the effects. The effect names are the shared ones (`sound`
 * is the energy color, `strike` the impact color, see ../vfx.ts); their colors follow her hit
 * style in src/render/hit-styles.ts.
 */
const DETAILS = {
  /** The lash and the brow. */
  ink: { main: '#070405' },
  /** The white of a wide-open eye (expressions only: as drawn, the eye is in the lash's shade). */
  eyeWhite: { main: '#e8e2e6' },
  /** The reference's eye: a teal iris, a pale blue-grey light, a navy pupil. */
  iris: { main: '#1e6078' },
  irisLight: { main: '#8ea4b8' },
  irisDeep: { main: '#1a1630' },
  /** The warm red where the brow starts. */
  brow: { main: '#c04447' },
  /** Magenta lipstick (and the eyeshadow's tint): deep, base, light. Crimson on the second colorway. */
  lipDeep: { main: '#7a1c38', alt: '#6a1018' },
  lip: { main: '#a82454', alt: '#a8202c' },
  lipLight: { main: '#cc3e70', alt: '#d04450' },
  teeth: { main: '#f4e8e0' },
  mouth: { main: '#3a0c14' },
  /**
   * Energy (dashes, trails, specials, floor rings): a neon magenta, her fringe's color lit up;
   * gold on the second colorway, its fringe's.
   */
  soundDeep: { main: '#6a0a4c', alt: '#6a420c' },
  sound: { main: '#ff3ca0', alt: '#ffc83a' },
  soundLight: { main: '#ff8ccc', alt: '#ffe08a' },
  soundCore: { main: '#ffe4f2', alt: '#fff6d6' },
  soundGlow: { main: '#ff3ca058', alt: '#ffc83a58' },
  /**
   * Strikes (impacts, diamond sparks): silver-white, her studs and her chain struck; crimson on
   * the second colorway, against its gold energy.
   */
  strikeDeep: { main: '#4a5262', alt: '#5a0a16' },
  strike: { main: '#d8e0ec', alt: '#e0283c' },
  strikeLight: { main: '#f0f4fa', alt: '#ff7a86' },
  strikeCore: { main: '#ffffff', alt: '#ffe8ea' },
  strikeGlow: { main: '#d8e0ec58', alt: '#e0283c58' },
  /** The dark smoky heart of a heavy hit spark. */
  strikeSmoke: { main: '#30262e' },
  /** Motion trails of the limbs, in the energy color, translucent (alpha last). */
  trail: { main: '#ff3ca0b4', alt: '#ffc83ab4' },
  trailFaint: { main: '#ff3ca05c', alt: '#ffc83a5c' },
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

/** Riff's effects: magenta energy, silver-white strikes and diamond sparkles, grey-gold dust. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
