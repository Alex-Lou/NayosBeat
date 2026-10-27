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

export interface Palette<M extends string, D extends string> {
  /** Palette slots of every material (slot 0 is transparent). */
  readonly material: Readonly<Record<M, Material>>;
  /** Palette slot of every detail color. */
  readonly detail: Readonly<Record<D, number>>;
  readonly paletteOf: (colorway: Colorway) => readonly Rgba[];
}

const TONES_PER_MATERIAL = 7;

/** Slots in declaration order: transparent, then 7 per material, then 1 per detail. */
export function definePalette<M extends string, D extends string>(
  materials: Readonly<Record<M, MaterialTones>>,
  details: Readonly<Record<D, DetailColor>>,
): Palette<M, D> {
  const materialNames = Object.keys(materials) as M[];
  const detailNames = Object.keys(details) as D[];
  const firstDetail = 1 + materialNames.length * TONES_PER_MATERIAL;
  const material = Object.fromEntries(
    materialNames.map((name, index) => [name, slotsOf(1 + index * TONES_PER_MATERIAL)]),
  ) as Record<M, Material>;
  const detail = Object.fromEntries(
    detailNames.map((name, index) => [name, firstDetail + index]),
  ) as Record<D, number>;
  const paletteOf = (colorway: Colorway): readonly Rgba[] => {
    const colors: string[] = ['#00000000'];
    for (const name of materialNames) {
      const tones = materials[name];
      colors.push(...(colorway === 'alt' && tones.alt ? tones.alt : tones.main));
    }
    for (const name of detailNames) {
      const color = details[name];
      colors.push(colorway === 'alt' && color.alt ? color.alt : color.main);
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
