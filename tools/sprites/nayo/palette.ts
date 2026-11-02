/**
 * Nayo's colors: black techwear lit by cyan neon (the second colorway: light grey techwear and
 * magenta neon). Every material takes the same seven palette slots in both colorways, so the
 * strips are drawn once and saved twice: the second colorway only swaps the palette.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/**
 * The street's light on him (docs/art/nayo-lumiere.md, docs/art/decor-rue.md §5): the sodium
 * lamps, warm, from above and in front (the key light, raster.ts), and the club's violet sign
 * behind him, up high (the back light, `RIM`). Every ramp shifts its hue with its value: the
 * shadows sink toward blue violet, never pure black; the lights and the shine warm up toward the
 * lamps. The back light is the sign's, the same on both colorways: it lights the street, not
 * the outfit.
 */
const RIM = '#8e74c0';
/** The sign's violet on a light material (the second colorway's jacket and boots). */
const RIM_ON_LIGHT = '#cbb8ee';

/** A ramp without its rim: outline, deep, shadow, base, light, gloss. */
type Ramp = readonly [string, string, string, string, string, string];

/** A material of the same colors in both colorways, its rim the sign's. */
function lit(ramp: Ramp, rim: string = RIM): MaterialTones {
  return { main: [...ramp, rim] };
}

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  skin: lit(['#4e1624', '#a4423a', '#e8844c', '#fca86a', '#ffc286', '#ffdcb0'], '#e0a6b4'),
  /** Black hair, a mauve sheen where the lamps catch it. */
  hair: lit(['#0a0816', '#140f26', '#1e1836', '#2a2248', '#3d3160', '#76607e']),
  /** Quilted tech jacket: black nylon, light grey on the second colorway. */
  jacket: {
    main: ['#0b0914', '#171228', '#241e38', '#322a48', '#56425a', '#96706a', RIM],
    alt: ['#2a2238', '#5a4f72', '#8580a0', '#b3aec4', '#ddd6de', '#fff4e6', RIM_ON_LIGHT],
  },
  /** Shirt under the open jacket: charcoal, matte. */
  shirt: {
    main: ['#0b0912', '#15121e', '#1e1a2a', '#292337', '#373048', '#373048', '#373048'],
    alt: ['#0a0910', '#131020', '#1c182b', '#272238', '#342e48', '#342e48', '#342e48'],
  },
  /** Fingerless gloves, belt: black leather, a warm shine. */
  leather: lit(['#0c0910', '#19121f', '#261b2d', '#34253b', '#4c3648', '#a07c6c']),
  /** Cargo pants: black cotton, cooler than the jacket; mid grey on the second colorway. */
  pants: {
    main: ['#0b0a14', '#151424', '#1f1d33', '#2a2842', '#3c3654', '#3c3654', RIM],
    alt: ['#1a1626', '#34304a', '#4c4766', '#66627f', '#86809a', '#86809a', RIM_ON_LIGHT],
  },
  /** Cargo pocket and seams, a step darker than the pants. */
  pocket: {
    main: ['#0b0a14', '#12111f', '#1a182c', '#232139', '#302d4a', '#302d4a', '#302d4a'],
    alt: ['#16121f', '#2c283e', '#403b56', '#56516e', '#6e6a88', '#6e6a88', '#6e6a88'],
  },
  /** Combat boots: black leather, white on the second colorway. */
  boot: {
    main: ['#0a0812', '#151021', '#201a31', '#2c2441', '#413552', '#a07c6e', RIM],
    alt: ['#282034', '#5a5272', '#8c86a4', '#bebacf', '#e2dce4', '#fff4e6', RIM_ON_LIGHT],
  },
  sole: {
    main: ['#0a0812', '#110e19', '#191523', '#231d2f', '#2f283d', '#2f283d', '#2f283d'],
  },
  metal: lit(['#1c1828', '#363048', '#5a5270', '#8e88a6', '#ccc4d2', '#fff2dc'], RIM_ON_LIGHT),
  /** Headphones: black plastic with a soft sheen. */
  plastic: lit(['#0a0812', '#141020', '#1f1a30', '#2c2642', '#443a58', '#8a7080']),
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/** Single slots: face details, neon accents and effects, swapped with the colorway. */
const DETAILS = {
  ink: { main: '#0a0608' },
  eyeWhite: { main: '#f0ece8' },
  iris: { main: '#0f9fb8' },
  irisLight: { main: '#3fcfe6' },
  lip: { main: '#a8502e' },
  lipLight: { main: '#d88058' },
  teeth: { main: '#e8dcd0' },
  mouth: { main: '#3a0c08' },
  /** Neon accents of the outfit (emblem, LED strips, zipper pull), deep to core. */
  neonDeep: { main: '#00687e', alt: '#7a0e56' },
  neon: { main: '#00b8d0', alt: '#d0288e' },
  neonLight: { main: '#2ce8f8', alt: '#ff5cc8' },
  /** The LED strips and the emblem: a soft lit color, not a fluorescent one (Lighting.glow). */
  neonCore: { main: '#62c4d0', alt: '#d878b8' },
  /** Sound (the Vinyle, energy, trails): the neon color. */
  soundDeep: { main: '#006a80', alt: '#80105a' },
  sound: { main: '#00c0d8', alt: '#d82896' },
  soundLight: { main: '#40f0ff', alt: '#ff60cc' },
  soundCore: { main: '#e0feff', alt: '#ffe0f6' },
  soundGlow: { main: '#30e8ff58', alt: '#ff50c058' },
  /** Strikes (impacts, flashes): gold and orange on both colorways. */
  strikeDeep: { main: '#8a2a06' },
  strike: { main: '#f07818' },
  strikeLight: { main: '#ffc040' },
  strikeCore: { main: '#fff6d0' },
  strikeGlow: { main: '#ffb03058' },
  /** Motion trails of the limbs, in the neon color, translucent (alpha last). */
  trail: { main: '#30e8ffb4', alt: '#ff50c0b4' },
  trailFaint: { main: '#30e8ff5c', alt: '#ff50c05c' },
  /** Dust kicked up from the floor. */
  dustDeep: { main: '#2c2840' },
  dust: { main: '#4a4566' },
  dustLight: { main: '#77719a' },
  /** Tazz's beige floor dust (puffs and grit kicked up by the feet), deep to light. */
  sandDeep: { main: '#8c7860' },
  sand: { main: '#bfab8e' },
  sandLight: { main: '#e6d8c2' },
  /** The dark smoky heart of a heavy hit spark (Tazz's hit VFX), on both colorways. */
  strikeSmoke: { main: '#3a3246' },
  /** Their faint glow on the cloth around them, 1 px (index.ts, Lighting.glow). */
  neonHalo: { main: '#253e52', alt: '#c4a4c4' },
} as const satisfies Record<string, DetailColor>;

export type DetailName = keyof typeof DETAILS;

const PALETTE = definePalette(MATERIALS, DETAILS);

/** Palette slots of every material (slot 0 is transparent). */
export const MATERIAL = PALETTE.material;
/** Palette slot of every detail color. */
export const DETAIL = PALETTE.detail;
export const paletteOf = PALETTE.paletteOf;

/** Nayo's effects: cyan sound (magenta on the second colorway), gold strikes, beige dust. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'cross' };
