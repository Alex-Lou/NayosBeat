/**
 * How a fighter's colors become palette slots. Every material takes the same seven slots in both
 * colorways (and every detail one slot), so a strip is drawn once, in slots, and saved once per
 * colorway with that colorway's palette: the second outfit only swaps colors.
 */

import type { Rgba } from './png.ts';
import type { Material } from './raster.ts';

export type Colorway = 'main' | 'alt';

/** Darkest to lightest, then the gloss and the back-light tone. */
export type Tones = readonly [
  outline: string,
  deep: string,
  shadow: string,
  base: string,
  light: string,
  gloss: string,
  rim: string,
];

/** A material's tones; without `alt`, the second colorway keeps the main ones. */
export interface MaterialTones {
  readonly main: Tones;
  readonly alt?: Tones;
}

/** A single color (face details, accents, effects), `#rrggbb` or `#rrggbbaa`. */
export interface DetailColor {
  readonly main: string;
  readonly alt?: string;
}

/**
 * The Boost's platine (docs/combos-v3.md §1.8.7, `tone: 'platine'` in ../vfx.ts): an
 * incandescent white ramp with a dark blue-grey rim, never gold (gold is the second colorway of
 * Riff's energy). The same for every fighter and both colorways: every palette ends with it,
 * after the fighter's own colors.
 */
const PLATINE = {
  /** The translucent glow at the edge of the effects. */
  platineGlow: { main: '#c9d6e858' },
  /** The rim, and the smoky heart of a heavy spark. */
  platineRim: { main: '#20243a' },
  platineBase: { main: '#c9d6e8' },
  platineLight: { main: '#f2f6ff' },
  platineCore: { main: '#ffffff' },
} as const satisfies Record<string, DetailColor>;

export type PlatineSlot = keyof typeof PLATINE;

export interface Palette<M extends string, D extends string> {
  /** Palette slots of every material (slot 0 is transparent). */
  readonly material: Readonly<Record<M, Material>>;
  /** Palette slot of every detail color, the platine's included. */
  readonly detail: Readonly<Record<D | PlatineSlot, number>>;
  /**
   * The colors of every slot in `colorway`. Given the pixels of an image (`drawn`), the
   * platine's slots are left out of it unless it draws in them: the images of the strips that
   * have no Boost effect keep the palette, and the bytes, they always had.
   */
  readonly paletteOf: (colorway: Colorway, drawn?: Uint8Array) => readonly Rgba[];
}

const TONES_PER_MATERIAL = 7;

/**
 * Slots in declaration order: transparent, then 7 per material, then 1 per detail, then the
 * platine's.
 */
export function definePalette<M extends string, D extends string>(
  materials: Readonly<Record<M, MaterialTones>>,
  details: Readonly<Record<D, DetailColor>>,
): Palette<M, D> {
  const materialNames = Object.keys(materials) as M[];
  const detailNames = Object.keys(details) as D[];
  const platineNames = Object.keys(PLATINE) as PlatineSlot[];
  const firstDetail = 1 + materialNames.length * TONES_PER_MATERIAL;
  const firstPlatine = firstDetail + detailNames.length;
  const material = Object.fromEntries(
    materialNames.map((name, index) => [name, slotsOf(1 + index * TONES_PER_MATERIAL)]),
  ) as Record<M, Material>;
  const detail = Object.fromEntries([
    ...detailNames.map((name, index) => [name, firstDetail + index]),
    ...platineNames.map((name, index) => [name, firstPlatine + index]),
  ]) as Record<D | PlatineSlot, number>;
  const paletteOf = (colorway: Colorway, drawn?: Uint8Array): readonly Rgba[] => {
    const colors: string[] = ['#00000000'];
    for (const name of materialNames) {
      const tones = materials[name];
      colors.push(...(colorway === 'alt' && tones.alt ? tones.alt : tones.main));
    }
    for (const name of detailNames) {
      const color = details[name];
      colors.push(colorway === 'alt' && color.alt ? color.alt : color.main);
    }
    if (!drawn || drawn.some((slot) => slot >= firstPlatine)) {
      colors.push(...platineNames.map((name) => PLATINE[name].main));
    }
    return colors.map(hexToRgba);
  };
  return { material, detail, paletteOf };
}

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

/** A material without its specular highlight (it keeps its back light). */
export function noGloss(material: Material): Material {
  const { outline, deep, shadow, base, light, rim } = material;
  return rim === undefined
    ? { outline, deep, shadow, base, light }
    : { outline, deep, shadow, base, light, rim };
}

function hexToRgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  const alpha = hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) : 255;
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: alpha };
}
