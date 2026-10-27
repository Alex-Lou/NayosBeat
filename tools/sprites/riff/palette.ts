/**
 * Riff's colors (docs/combat-v2.md §6.2): a violet oversize hoodie with sun-yellow accents, black
 * cargo shorts over black leggings, white knee pads and high-tops, white terry sweatbands, a
 * white snapback worn backwards (violet brim, yellow button and diamond logo), auburn braids,
 * light golden skin with freckles, green eyes. The second colorway swaps violet and yellow
 * (sun-yellow hoodie and brim, violet accents); the whites, the blacks, the skin, the hair and
 * the eyes stay. Same layout as Nayo's palette: drawn once, saved twice.
 *
 * For univers.md, the cap: white crown, violet brim, yellow button and diamond logo (second
 * colorway: yellow brim, violet button and logo).
 */

import { definePalette, type DetailColor, type MaterialTones, type Tones } from '../palette.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/** The spec's violet (§6.2) as a material: deep to light as given. */
const VIOLET: Tones = ['#16081f', '#2a1240', '#5a2b8a', '#8a4fd1', '#c79bff', '#e6d2ff', '#b48cff'];
/** The spec's yellow as a material: deep to light as given (the small accents). */
const YELLOW: Tones = ['#2a1d00', '#5a4300', '#b89100', '#f0c94a', '#fff1b0', '#fffbe6', '#ffe58a'];
/**
 * The sun-yellow hoodie of the second colorway: the spec's base and light, warm amber shadows
 * (its olive ones would turn a whole hoodie khaki).
 */
const SUN: Tones = ['#3a1c04', '#8a4c08', '#c88a16', '#f0c94a', '#fff1b0', '#fffbe8', '#ffe58a'];

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  /**
   * Light golden skin: warmer and paler than Nayo's peach, shadows toward rust, a warm cream back
   * light (a pink one blotched the jaw and the knuckles at 1x).
   */
  skin: {
    main: ['#5c2614', '#bd6638', '#e8995a', '#f8c283', '#ffdca4', '#fff0cc', '#f6cfa0'],
  },
  /** Auburn: rust-red brown with copper lights, a violet back light. */
  hair: {
    main: ['#240b07', '#5c1f10', '#8a3216', '#b04a1f', '#d9692e', '#f09452', '#9a5c9e'],
  },
  /**
   * White cotton twill, leather and terry, cool violet-grey shadows: the snapback's crown, the
   * knee pads, the high-top uppers, the sweatbands. White on both colorways.
   */
  white: {
    main: ['#241c34', '#6e6488', '#a69cc0', '#dcd6ec', '#f6f4fc', '#ffffff', '#c8b8ff'],
  },
  /** Her color: the oversize fleece hoodie, the cap's brim, the sneaker overlays. */
  primary: { main: VIOLET, alt: SUN },
  /**
   * Small accents: cap logo and button, hair ties, drawstrings and aglets, the sleeve print, the sweatband stripe,
   * sneaker laces and heel tabs, the shorts' pull tab. Yellow, violet on the second colorway.
   */
  accent: { main: YELLOW, alt: VIOLET },
  /**
   * Cargo shorts: violet-black twill (the univers.md black); deep violet on the second colorway,
   * so the yellow hoodie sits over her violet accents, not over a black band. The ramp starts a
   * step up from the leggings': most of the shorts land in the shadow band, which is the twill's
   * main color (#312e40, lighter than the stage), its lit side #4a4660, a #5a5478 edge.
   */
  shorts: {
    main: ['#0d0c12', '#1f1d29', '#312e40', '#4a4660', '#5a5478', '#5a5478', '#5a5478'],
    alt: ['#1c0e30', '#2e1a4a', '#432868', '#5c3a8c', '#7a5aa8', '#7a5aa8', '#7a5aa8'],
  },
  /** Leggings under the shorts: a step darker and smoother, so the two blacks part. */
  leggings: {
    main: ['#050408', '#0a0910', '#16141e', '#24212f', '#363246', '#4e4964', '#5a5478'],
  },
  /** Cupsoles: off-white rubber with a grey-violet edge. */
  sole: {
    main: ['#241c34', '#585070', '#8c84a4', '#c4bed6', '#e6e2f0', '#e6e2f0', '#e6e2f0'],
  },
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Single slots: face details, then the effects. The effect names are the shared ones (`sound`
 * is the energy color, `strike` the impact color, see ../vfx.ts); their colors follow her hit
 * style in src/render/hit-styles.ts.
 */
const DETAILS = {
  ink: { main: '#140810' },
  eyeWhite: { main: '#fbf4ee' },
  /** Green eyes: they pop on the golden skin, apart from the violet outfit and Nayo's cyan. */
  iris: { main: '#1f8c5a' },
  irisLight: { main: '#62d494' },
  irisDeep: { main: '#0e4a32' },
  /** The catchlight in the eye: one white pixel that keeps it alive at 1x. */
  catchlight: { main: '#ffffff' },
  teeth: { main: '#fbf0e6' },
  mouth: { main: '#4a1410' },
  /** Freckles: a soft cinnamon dot between the skin's shadow and its deep tone. */
  freckle: { main: '#d07a48' },
  /** Energy (dashes, trails, specials): violet, sun-yellow on the second colorway. */
  soundDeep: { main: '#3c1470', alt: '#7a5a00' },
  sound: { main: '#a25cff', alt: '#ffd23a' },
  soundLight: { main: '#c99aff', alt: '#ffe98a' },
  soundCore: { main: '#f2e6ff', alt: '#fff8d6' },
  soundGlow: { main: '#a25cff58', alt: '#ffd23a58' },
  /** Strikes (impacts, diamond sparks): sun-yellow, violet on the second colorway. */
  strikeDeep: { main: '#8a5a00', alt: '#4a1a8a' },
  strike: { main: '#ffe03a', alt: '#b070ff' },
  strikeLight: { main: '#fff08a', alt: '#d6b0ff' },
  strikeCore: { main: '#fff8e6' },
  strikeGlow: { main: '#ffe03a58', alt: '#b070ff58' },
  /** The dark smoky heart of a heavy hit spark. */
  strikeSmoke: { main: '#34284a' },
  /** Motion trails of the limbs, in the energy color, translucent (alpha last). */
  trail: { main: '#a25cffb4', alt: '#ffd23ab4' },
  trailFaint: { main: '#a25cff5c', alt: '#ffd23a5c' },
  /** Dust kicked up from the floor: purple-grey grit, gold-beige puffs. */
  dustLight: { main: '#5a4878' },
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

/** Riff's effects: violet energy, yellow strikes and diamond sparkles, purple-gold dust. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
