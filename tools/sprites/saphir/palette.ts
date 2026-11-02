/**
 * Saphir's colors (docs/saphir.md §8), in three: sapphire, ivory, black. A full-head Janus mask
 * in sapphire lacquer, a black ponytail out of its crown; a short ivory jacket with a high
 * collar edged in sapphire, a sapphire sash, wide black dance trousers with a sapphire piping
 * down the seam, black gloves, two-tone savate shoes. Her energy is sapphire too (#3a6cf0),
 * brighter than the mask, measured against the cast's hues and in simulated colorblindness.
 *
 * Second colorway (mirror match): the outfit inverted, a black jacket over ivory trousers, her
 * energy lilac (#c0a0ff). The mask, the hair and the shoes stay. Same layout as Nayo's and
 * Riff's palettes: drawn once, saved twice.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  /** Warm brown skin: only at the neck, between the collar and the mask. */
  skin: {
    main: ['#2e1610', '#5a2e1e', '#7a4228', '#9a5a38', '#b8744a', '#c98a5c', '#d9a070'],
  },
  /** The black ponytail, a cool blue light. */
  hair: {
    main: ['#040406', '#0c0c12', '#16161f', '#22222e', '#30303f', '#464660', '#58607a'],
  },
  /** The mask: sapphire, lacquered. The same on both colorways: it is her name. */
  mask: {
    main: ['#060c2a', '#0e1a52', '#1a3088', '#2a4cb8', '#4a74e0', '#9ab8ff', '#9ab8ff'],
  },
  /**
   * The jacket's cloth, ivory; black on the second colorway. The two colorways part by its
   * value first.
   */
  cloth: {
    main: ['#2e2a26', '#5e5850', '#a49c90', '#d8d2c6', '#ece8de', '#faf8f2', '#c8c4bc'],
    alt: ['#030305', '#09090c', '#121216', '#1c1c22', '#2a2a32', '#3c3c48', '#50505e'],
  },
  /**
   * The trousers and the jacket's lines (closure, cuffs), black; ivory on the second colorway,
   * the outfit inverted.
   */
  band: {
    main: ['#030305', '#09090c', '#121216', '#1c1c22', '#2a2a32', '#3c3c48', '#50505e'],
    alt: ['#2e2a26', '#5e5850', '#a49c90', '#d8d2c6', '#ece8de', '#faf8f2', '#c8c4bc'],
  },
  /** Black leather: the gloves, and the shoes' toe cap and heel. */
  shoe: {
    main: ['#030304', '#0a0a0d', '#141418', '#202026', '#30303a', '#7a7a8a', '#5a6070'],
  },
  /** The two-tone shoes' white leather, between the cap and the heel. */
  spat: {
    main: ['#4a4640', '#8a847a', '#b8b2a6', '#dcd6ca', '#eeeae0', '#ffffff', '#c8c8c8'],
  },
  /** Thin leather soles. */
  sole: {
    main: ['#020203', '#08080a', '#0f0f12', '#18181c', '#24242a', '#24242a', '#24242a'],
  },
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Single slots: the mask's paint, then the effects. The effect names are the shared ones (`sound`
 * is the energy color, `strike` the impact color, see ../vfx.ts); their colors are her hit style
 * (src/render/hit-styles.ts, at the PR that lights her up).
 */
const DETAILS = {
  /** The eye slit's dark, and the paint's lines. */
  ink: { main: '#05060e' },
  /** The paint on the mask: the back face's eye and smile, the tears. */
  eyeWhite: { main: '#eef0f6' },
  /** The painted eye's pupil. */
  irisDeep: { main: '#05060e' },
  /**
   * The glint deep in both eye slits at rest, her presence (src/render/presence.ts): a color of
   * its own, which the game picks out and lets shine; lilac on the second colorway.
   */
  maskGlow: { main: '#5c8cff', alt: '#cbb2ff' },
  /** Energy (steps, trails, specials): sapphire, brighter than the mask; lilac on the second. */
  soundDeep: { main: '#142a6e', alt: '#4a3080' },
  sound: { main: '#3a6cf0', alt: '#c0a0ff' },
  soundLight: { main: '#9cb8ff', alt: '#e0d0ff' },
  soundCore: { main: '#eef3ff', alt: '#f6f0ff' },
  soundGlow: { main: '#3a6cf058', alt: '#c0a0ff58' },
  /** Strikes (impacts, cross sparks): cream, her ivory struck; the same on both colorways. */
  strikeDeep: { main: '#6a5e44' },
  strike: { main: '#f0e2bc' },
  strikeLight: { main: '#faf2dc' },
  strikeCore: { main: '#ffffff' },
  strikeGlow: { main: '#f0e2bc58' },
  /** The dark smoky heart of a heavy hit spark. */
  strikeSmoke: { main: '#302a24' },
  /** Motion trails of the limbs, in the energy color, translucent (alpha last). */
  trail: { main: '#3a6cf0b4', alt: '#c0a0ffb4' },
  trailFaint: { main: '#3a6cf05c', alt: '#c0a0ff5c' },
  /** Dust kicked up from the floor. */
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

/** Saphir's effects: sapphire energy, cream strikes, cut-gem (diamond) sparkles, grey-gold dust. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
