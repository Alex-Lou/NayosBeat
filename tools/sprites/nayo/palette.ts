/**
 * Nayo's colors: black techwear lit by cyan neon (the second colorway: light grey techwear and
 * magenta neon). Every material takes the same seven palette slots in both colorways, so the
 * strips are drawn once and saved twice: the second colorway only swaps the palette.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/**
 * The light (docs/art/nayo-lumiere.md): a warm key light from the top and the front (the street
 * lamps; its direction is raster.ts's), a neon back light from behind and above, cyan (magenta on
 * the second colorway). Every ramp shifts its hue with its value: the shadows sink toward blue
 * violet, never pure black; the lights warm up toward the lamps; the rim is the neon's.
 */
const RIM = { main: '#3ee6f4', alt: '#ff6ad0' } as const;

/** A ramp without its rim: outline, deep, shadow, base, light, gloss. */
type Ramp = readonly [string, string, string, string, string, string];

/** A material of the same colors in both colorways, its rim the colorway's neon. */
function lit(
  ramp: Ramp,
  rim: { readonly main: string; readonly alt: string } = RIM,
): MaterialTones {
  return { main: [...ramp, rim.main], alt: [...ramp, rim.alt] };
}

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  skin: lit(['#4e1624', '#a4423a', '#e8844c', '#fca86a', '#ffc286', '#ffdcb0'], {
    main: '#bfeee6',
    alt: '#ffc4e4',
  }),
  /** Black hair, its sheen blue violet. */
  hair: lit(['#0a0816', '#140f26', '#1e1836', '#2a2248', '#3d3262', '#6e5ea2']),
  /** Quilted tech jacket: black nylon, light grey on the second colorway. */
  jacket: {
    main: ['#0b0914', '#171228', '#241e38', '#322a48', '#4b3f62', '#7c687e', RIM.main],
    alt: ['#2a2238', '#5a4f72', '#8580a0', '#b1aec6', '#d8d6e6', '#fff8f2', '#ff86d8'],
  },
  /** Shirt under the open jacket: charcoal, matte. */
  shirt: {
    main: ['#0b0912', '#15121e', '#1e1a2a', '#292337', '#373048', '#373048', '#373048'],
    alt: ['#0a0910', '#131020', '#1c182b', '#272238', '#342e48', '#342e48', '#342e48'],
  },
  /** Fingerless gloves, belt: black leather, a warm shine. */
  leather: lit(['#0c0910', '#19121f', '#261b2d', '#34253b', '#4c3652', '#ae8ea6']),
  /** Cargo pants: black cotton, cooler than the jacket; mid grey on the second colorway. */
  pants: {
    main: ['#0b0a14', '#151424', '#1f1d33', '#2a2842', '#3c3957', '#3c3957', RIM.main],
    alt: ['#1a1626', '#34304a', '#4c4766', '#66627f', '#84809c', '#84809c', RIM.alt],
  },
  /** Cargo pocket and seams, a step darker than the pants. */
  pocket: {
    main: ['#0b0a14', '#12111f', '#1a182c', '#232139', '#302d4a', '#302d4a', '#302d4a'],
    alt: ['#16121f', '#2c283e', '#403b56', '#56516e', '#6e6a88', '#6e6a88', '#6e6a88'],
  },
  /** Combat boots: black leather, white on the second colorway. */
  boot: {
    main: ['#0a0812', '#151021', '#201a31', '#2c2441', '#413658', '#b6a0b6', RIM.main],
    alt: ['#282034', '#5a5272', '#8c86a4', '#bebacf', '#e4e2ec', '#ffffff', '#ff8ad8'],
  },
  sole: {
    main: ['#0a0812', '#110e19', '#191523', '#231d2f', '#2f283d', '#2f283d', '#2f283d'],
  },
  metal: lit(['#1c1828', '#363048', '#5a5270', '#8e88a6', '#c8c4d8', '#fffaf0'], {
    main: '#a8f6ff',
    alt: '#ffc0ec',
  }),
  /** Headphones: black plastic with a soft sheen. */
  plastic: lit(['#0a0812', '#141020', '#1f1a30', '#2c2642', '#443c5e', '#8e84b0']),
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
  neonCore: { main: '#c8fcff', alt: '#ffd6f2' },
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
  /** The 1 px glow of the neon accents on the cloth around them (index.ts, Lighting.glow). */
  neonHalo: { main: '#16707e', alt: '#f08ad0' },
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
