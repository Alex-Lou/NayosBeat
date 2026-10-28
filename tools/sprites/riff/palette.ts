/**
 * Riff's colors: the punk girl of Zen-Tazzer (assets/Mobs/0 - Mobs/4 - Idl Mob), sampled from
 * that sprite. Black outfit, magenta accents (the fringe, the jacket's patch, the boots'
 * triangles, the lips), silver metal, warm peach skin; dark ramps lit by a cool grey-blue back
 * light, like the reference and like Nayo.
 *
 * Second colorway (mirror match): an oxblood-red leather jacket and gold accents (the fringe dyed
 * gold, the patch, the boots' triangles; crimson lips). The jacket is her biggest mass: red
 * against black changes its value and its hue at once, so the two Riffs part at a glance even in
 * a scramble, and the warm gold against the cool magenta keeps her accents apart. Red leather
 * and gold stay punk (the classic red biker jacket), and they clash with neither of Nayo's
 * colorways (black and cyan, light grey and magenta). The jeans turn a washed charcoal grey, so
 * the lower halves part as well. The hair, the skin, the crop top, the boots and the silver
 * metal stay. Same layout as Nayo's palette: drawn once, saved twice.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  /**
   * Warm peach skin, as in the reference: a dark red-brown outline, rust shadows, a pale peach
   * light, a warm cream back light.
   */
  skin: {
    main: ['#561c22', '#9c4636', '#cc744d', '#f1ad7a', '#f6c290', '#ffdcb0', '#ffd6a8'],
  },
  /** Blue-black hair, cool grey lights (the spiky top and the nape). */
  hair: {
    main: ['#030202', '#0a0709', '#111019', '#1b1823', '#26252e', '#36363d', '#5e636c'],
  },
  /** The shaved undercut: dark stubble over the scalp, a two-tone brown check. */
  stubble: {
    main: ['#2a1617', '#3a2122', '#4e2d2b', '#643d36', '#7c4a3e', '#935441', '#935441'],
  },
  /**
   * Her accent color: the dyed fringe, the jacket's round patch, the boots' triangles. Gold on
   * the second colorway.
   */
  magenta: {
    main: ['#200626', '#350832', '#4c0b44', '#6a0f55', '#8e1468', '#b81e7c', '#e04a9e'],
    alt: ['#1e1002', '#3e2406', '#6a420c', '#9a6a16', '#c89628', '#ecc85a', '#ffe08a'],
  },
  /** Silver: earrings, choker, zipper, studs, buckle, the belt's chain. */
  metal: {
    main: ['#1e1e24', '#3e4046', '#5c5e64', '#8e9298', '#c4c8cc', '#f2f4f6', '#a8b4c8'],
  },
  /**
   * The cropped jacket: glossy black leather, as dark as the jeans and the boots (its mass reads
   * black, never charcoal canvas); the leather comes from a few sharp runs of its gloss tone on
   * the shoulder, the rolled folds and the lapels, and a cool grey-blue back light kept for a
   * pixel or two of accent (the reference's). Oxblood-red leather on the second colorway: its sheen a
   * brighter red, not pink (a pink line along the red outlines her like a sticker), the warm pink
   * left for the accent pixels only.
   */
  jacket: {
    main: ['#040406', '#0c0d11', '#16171d', '#22242c', '#30333c', '#4a4e5a', '#6c7890'],
    alt: ['#1a0507', '#3c0a10', '#641219', '#8e1c24', '#a8262e', '#c4383e', '#f08a86'],
  },
  /** The crop top: matte black jersey, about the jacket's value (it reads black, not grey). */
  top: {
    main: ['#040405', '#0b0b0e', '#14151a', '#1f2127', '#2e3038', '#2e3038', '#5a6478'],
  },
  /**
   * Black jeans, a washed blue-black denim (the reference's), its worn folds catching a
   * blue-grey light. On the second colorway a washed charcoal-grey denim, two steps lighter:
   * the lower halves part too when the two Riffs scramble jacket against jacket.
   */
  jeans: {
    main: ['#040507', '#0b0d12', '#151920', '#20252e', '#2c323d', '#3e4552', '#56627a'],
    alt: ['#0b0c0f', '#17191e', '#252830', '#353943', '#454a55', '#5c6270', '#7c8392'],
  },
  /** Fingerless gloves, the belt: black leather. */
  leather: {
    main: ['#030304', '#0b0b0e', '#15151a', '#212127', '#32323a', '#5c5c68', '#5a6478'],
  },
  /** Combat boots: black leather, a warm grey shine on the toe cap (the reference's). */
  boot: {
    main: ['#030303', '#0b0b0c', '#151517', '#222224', '#343436', '#605a54', '#5a6070'],
  },
  /** Thick lugged rubber soles. */
  sole: {
    main: ['#020203', '#08080a', '#0f0f12', '#18181c', '#24242a', '#24242a', '#24242a'],
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
