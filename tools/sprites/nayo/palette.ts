/**
 * Nayo's colors: black techwear lit by cyan neon (the second colorway: light grey techwear and
 * magenta neon). Every material takes the same seven palette slots in both colorways, so the
 * strips are drawn once and saved twice: the second colorway only swaps the palette.
 */

import type { Rgba } from '../png.ts';
import type { Material } from '../raster.ts';

export type Colorway = 'main' | 'alt';

/** Darkest to lightest, then the gloss and the back-light tone. */
type Tones = readonly [
  outline: string,
  deep: string,
  shadow: string,
  base: string,
  light: string,
  gloss: string,
  rim: string,
];

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  skin: {
    main: ['#5c1e10', '#b04a2a', '#e8844c', '#fca86a', '#ffc286', '#ffdcb0', '#e0a8a0'],
  },
  hair: {
    main: ['#030304', '#0b0b0e', '#151519', '#202026', '#2e2e36', '#44444e', '#4a5468'],
  },
  /** Quilted tech jacket: black, light grey on the second colorway. */
  jacket: {
    main: ['#040405', '#0d0d10', '#18181d', '#26262d', '#36363f', '#55555f', '#4e5a70'],
    alt: ['#3a3a48', '#6e6e82', '#9a9aae', '#c4c4d2', '#e4e4ee', '#ffffff', '#b0b0d0'],
  },
  /** Shirt under the open jacket: charcoal. */
  shirt: {
    main: ['#0a0a0c', '#16161a', '#222228', '#33333c', '#45454f', '#45454f', '#45454f'],
    alt: ['#08080a', '#121216', '#1c1c22', '#2a2a32', '#3a3a44', '#3a3a44', '#3a3a44'],
  },
  /** Fingerless gloves, belt: black leather. */
  leather: {
    main: ['#030304', '#0c0c0f', '#16161a', '#232328', '#34343c', '#5a5a66', '#4e5a70'],
  },
  /** Cargo pants: black, mid grey on the second colorway. */
  pants: {
    main: ['#040405', '#0e0e11', '#19191e', '#28282f', '#38383f', '#38383f', '#38383f'],
    alt: ['#14141a', '#26262e', '#3a3a46', '#545462', '#70707e', '#70707e', '#70707e'],
  },
  /** Cargo pocket and seams, a step darker than the pants. */
  pocket: {
    main: ['#040405', '#0b0b0e', '#141418', '#202026', '#2c2c33', '#2c2c33', '#2c2c33'],
    alt: ['#101016', '#1e1e26', '#2e2e38', '#44444f', '#5c5c68', '#5c5c68', '#5c5c68'],
  },
  /** Combat boots: black, white on the second colorway. */
  boot: {
    main: ['#030304', '#0b0b0e', '#151519', '#212127', '#32323a', '#5a5a66', '#4e5a70'],
    alt: ['#2a2a34', '#55556a', '#8a8a9c', '#b8b8c8', '#dcdce6', '#ffffff', '#b0b0d0'],
  },
  sole: {
    main: ['#030304', '#0a0a0c', '#121216', '#1c1c22', '#2a2a32', '#2a2a32', '#2a2a32'],
  },
  metal: {
    main: ['#24242e', '#44444f', '#6c6c7c', '#a0a0b2', '#d6d6e4', '#ffffff', '#d6d6e4'],
  },
  /** Headphones: black plastic with a soft sheen. */
  plastic: {
    main: ['#030304', '#0b0b0e', '#16161b', '#24242b', '#3a3a44', '#7a7a88', '#4e5a70'],
  },
} as const satisfies Record<string, { readonly main: Tones; readonly alt?: Tones }>;

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
  /** Sound (waves, energy, trails): the neon color. */
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
} as const satisfies Record<string, { readonly main: string; readonly alt?: string }>;

export type DetailName = keyof typeof DETAILS;

const TONES_PER_MATERIAL = 7;
const MATERIAL_NAMES = Object.keys(MATERIALS) as MaterialName[];
const DETAIL_NAMES = Object.keys(DETAILS) as DetailName[];
const FIRST_DETAIL = 1 + MATERIAL_NAMES.length * TONES_PER_MATERIAL;

function slotsOf(first: number): Material {
  return {
    outline: first,
    deep: first + 1,
    shadow: first + 2,
    base: first + 3,
    light: first + 4,
    gloss: first + 5,
    rim: first + 6,
  };
}

/** Palette slots of every material (slot 0 is transparent). */
export const MATERIAL: Readonly<Record<MaterialName, Material>> = Object.fromEntries(
  MATERIAL_NAMES.map((name, index) => [name, slotsOf(1 + index * TONES_PER_MATERIAL)]),
) as Record<MaterialName, Material>;

/** Palette slot of every detail color. */
export const DETAIL: Readonly<Record<DetailName, number>> = Object.fromEntries(
  DETAIL_NAMES.map((name, index) => [name, FIRST_DETAIL + index]),
) as Record<DetailName, number>;

export function paletteOf(colorway: Colorway): readonly Rgba[] {
  const colors: string[] = ['#00000000'];
  for (const name of MATERIAL_NAMES) {
    const tones: { readonly main: Tones; readonly alt?: Tones } = MATERIALS[name];
    colors.push(...(colorway === 'alt' && tones.alt ? tones.alt : tones.main));
  }
  for (const name of DETAIL_NAMES) {
    const detail: { readonly main: string; readonly alt?: string } = DETAILS[name];
    colors.push(colorway === 'alt' && detail.alt ? detail.alt : detail.main);
  }
  return colors.map(hexToRgba);
}

/**
 * The same material a step darker, without gloss nor back light, for the limbs on the far side
 * of the body: depth reads at a glance, and the near limbs stand out.
 */
export function farOf(material: Material): Material {
  return {
    outline: material.outline,
    deep: material.deep,
    shadow: material.deep,
    base: material.shadow,
    light: material.base,
  };
}

/** Matte version of a material: no gloss, no back light (small parts, knits). */
export function matteOf(material: Material): Material {
  return {
    outline: material.outline,
    deep: material.deep,
    shadow: material.shadow,
    base: material.base,
    light: material.light,
  };
}

function hexToRgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  const alpha = hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) : 255;
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: alpha };
}
