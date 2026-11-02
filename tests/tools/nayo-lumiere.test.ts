import { describe, expect, it } from 'vitest';
import { NAYO, NAYO_LIGHTING } from '../../tools/sprites/nayo/index';
import { DETAIL, MATERIAL, paletteOf, type Colorway } from '../../tools/sprites/nayo/palette';
import type { Rgba } from '../../tools/sprites/png';
import { PixelCanvas, type Material } from '../../tools/sprites/raster';
import { drawStrip } from '../../tools/sprites/sheet';

/**
 * Nayo's light (docs/art/nayo-lumiere.md): ramps of real tones in both colorways, a back light
 * and glowing neons painted inside the silhouette, never past it.
 */

const COLORWAYS: readonly Colorway[] = ['main', 'alt'];

const luminance = ({ r, g, b }: Rgba): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("Nayo's ramps", () => {
  /** Every material of his palette, the matte ones too. */
  const RAMPS = Object.entries<Material>(MATERIAL);

  it.each(COLORWAYS)('%s: five tones from the outline to the light, darkest to lightest', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of RAMPS) {
      const tones = [
        material.outline,
        material.deep,
        material.shadow,
        material.base,
        material.light,
      ]
        .map((slot) => palette[slot])
        .map((color) => (color ? luminance(color) : Number.NaN));
      for (let i = 1; i < tones.length; i++) {
        expect(tones[i], `${name}: tone ${i}`).toBeGreaterThan(tones[i - 1] ?? Infinity);
      }
    }
  });

  it.each(COLORWAYS)('%s: no pure black, the dark tones of the cloth lean blue violet', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of RAMPS) {
      for (const slot of [material.outline, material.deep, material.shadow]) {
        const color = palette[slot];
        if (!color) throw new Error(`${name}: no color in slot ${slot}`);
        expect(color.r + color.g + color.b, `${name}: slot ${slot}`).toBeGreaterThan(12);
        if (name !== 'skin') expect(color.b, `${name}: slot ${slot}`).toBeGreaterThan(color.r);
      }
    }
  });
});

describe("Nayo's lighting", () => {
  const lighting = NAYO_LIGHTING;
  /** Nayo as drawn before this light: the default back light only. */
  const { lighting: drawnWith, ...unlit } = NAYO;
  /** The poses of the boards (the guard, a heavy blow, the Vinyle, a jump, the KO, the super). */
  const STRIPS = ['idle', 'standHeavy', 'special', 'jump', 'ko', 'super'] as const;

  it.each(STRIPS)('%s: lights inside the silhouette, never past it', (sheet) => {
    expect(drawnWith).toBe(lighting);
    const lit = drawStrip(NAYO, sheet).pixels;
    const plain = drawStrip(unlit, sheet).pixels;
    let changed = 0;
    const moved: number[] = [];
    lit.forEach((slot, index) => {
      if (slot !== plain[index]) changed++;
      if ((slot === 0) !== (plain[index] === 0)) moved.push(index);
    });
    expect(moved, 'pixels opaque in one and not the other').toEqual([]);
    expect(changed).toBeGreaterThan(0);
  });

  it('puts the back light on the back and the top, by the shape of the pose', () => {
    // A limb seen from the side: the back light (from behind and above) on its back top edge.
    const canvas = new PixelCanvas(40, 40);
    const rim = 7;
    const material: Material = { outline: 1, deep: 2, shadow: 3, base: 4, light: 5, rim };
    canvas.capsule({ x: 10, y: 20 }, { x: 30, y: 20 }, 6, 6, material);
    canvas.finish({ ...lighting, glow: {} });
    const lit: { x: number; y: number }[] = [];
    canvas.pixels.forEach((slot, index) => {
      if (slot === rim) lit.push({ x: index % 40, y: Math.floor(index / 40) });
    });
    expect(lit.length).toBeGreaterThan(0);
    for (const { x, y } of lit) expect(x <= 20 && y <= 20, `${x}, ${y}`).toBe(true);
  });

  it('makes his neons glow: a halo around them, on the cloth', () => {
    const idle = drawStrip(NAYO, 'idle').pixels;
    expect(idle.includes(DETAIL.neonCore)).toBe(true);
    expect(idle.includes(DETAIL.neonHalo)).toBe(true);
    expect(idle.includes(MATERIAL.jacket.rim ?? -1)).toBe(true);
    expect(idle.includes(MATERIAL.hair.rim ?? -1)).toBe(true);
  });
});
