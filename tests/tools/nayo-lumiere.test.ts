import { describe, expect, it } from 'vitest';
import { NAYO, NAYO_LIGHTING } from '../../tools/sprites/nayo/index';
import { DETAIL, MATERIAL, paletteOf, type Colorway } from '../../tools/sprites/nayo/palette';
import type { Rgba } from '../../tools/sprites/png';
import { PixelCanvas, type Lighting, type Material } from '../../tools/sprites/raster';
import { drawStrip } from '../../tools/sprites/sheet';

/**
 * Nayo lit by the street (docs/art/nayo-lumiere.md): ramps of real tones in both colorways; the
 * club's violet sign behind him, on the top of his back and head only, never down by his feet;
 * the lower body darkening toward the floor; faint glows around his LEDs. All of it inside the
 * silhouette, never past it.
 */

const COLORWAYS: readonly Colorway[] = ['main', 'alt'];
/** Every material of his palette, the matte ones too. */
const MATERIALS = Object.entries<Material>(MATERIAL);
/** The back light's slots: the rim tone of every material, which only the back light paints. */
const RIM_SLOTS = new Set(MATERIALS.flatMap(([, material]) => material.rim ?? []));

const luminance = ({ r, g, b }: Rgba): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("Nayo's ramps", () => {
  it.each(COLORWAYS)('%s: five tones from the outline to the light, darkest to lightest', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of MATERIALS) {
      const tones = [
        material.outline,
        material.deep,
        material.shadow,
        material.base,
        material.light,
      ].map((slot) => {
        const color = palette[slot];
        return color ? luminance(color) : Number.NaN;
      });
      for (let i = 1; i < tones.length; i++) {
        expect(tones[i], `${name}: tone ${i}`).toBeGreaterThan(tones[i - 1] ?? Infinity);
      }
    }
  });

  it.each(COLORWAYS)('%s: no pure black, the dark tones of the cloth lean blue violet', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of MATERIALS) {
      for (const slot of [material.outline, material.deep, material.shadow]) {
        const color = palette[slot];
        if (!color) throw new Error(`${name}: no color in slot ${slot}`);
        expect(color.r + color.g + color.b, `${name}: slot ${slot}`).toBeGreaterThan(12);
        if (name !== 'skin') expect(color.b, `${name}: slot ${slot}`).toBeGreaterThan(color.r);
      }
    }
  });

  it.each(COLORWAYS)('%s: the back light is the sign’s violet, never a cyan', (way) => {
    const palette = paletteOf(way);
    for (const slot of RIM_SLOTS) {
      const color = palette[slot];
      if (!color) throw new Error(`no color in slot ${slot}`);
      expect(color.r, `slot ${slot}`).toBeGreaterThan(color.g);
      expect(color.b, `slot ${slot}`).toBeGreaterThan(color.g);
    }
  });
});

describe("Nayo's lighting", () => {
  /** Nayo as drawn without it: the default back light only. */
  const { lighting: drawnWith, ...unlit } = NAYO;
  /** The poses of the boards (the guard, a heavy blow, the Vinyle, a jump, the KO, the super). */
  const STRIPS = ['idle', 'standHeavy', 'special', 'jump', 'ko', 'super'] as const;

  it.each(STRIPS)('%s: lights inside the silhouette, never past it', (sheet) => {
    expect(drawnWith).toBe(NAYO_LIGHTING);
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

  it.each(STRIPS)('%s: no back light by the legs nor under the feet', (sheet) => {
    const strip = drawStrip(NAYO, sheet);
    const low: number[] = [];
    strip.pixels.forEach((slot, index) => {
      const height = NAYO_LIGHTING.ground - Math.floor(index / strip.width);
      if (height < NAYO_LIGHTING.rim.fade.none && RIM_SLOTS.has(slot)) low.push(index);
    });
    expect(low).toEqual([]);
  });

  it('makes his LEDs glow, and the sign touch his hair and his back', () => {
    const idle = drawStrip(NAYO, 'idle').pixels;
    expect(idle.includes(DETAIL.neonCore)).toBe(true);
    expect(idle.includes(DETAIL.neonHalo)).toBe(true);
    expect(idle.includes(MATERIAL.hair.rim ?? -1)).toBe(true);
    expect(idle.includes(MATERIAL.jacket.rim ?? -1)).toBe(true);
  });
});

/** A limb lying across a small canvas, drawn with `lighting`: its pixels, row by row. */
function limb(lighting: Lighting): Uint8Array {
  const canvas = new PixelCanvas(40, 40);
  canvas.capsule({ x: 10, y: 20 }, { x: 30, y: 20 }, 6, 6, LIMB);
  canvas.finish(lighting);
  return canvas.pixels;
}

const LIMB: Material = { outline: 1, deep: 2, shadow: 3, base: 4, light: 5, rim: 7 };
/** Nayo's lighting, the limb high above the ground. */
const HIGH: Lighting = { ...NAYO_LIGHTING, ground: 400, glow: {} };

describe('the lighting of the raster', () => {
  it('puts the back light on the top and the back only, by the shape', () => {
    const lit: { x: number; y: number }[] = [];
    limb(HIGH).forEach((slot, index) => {
      if (slot === LIMB.rim) lit.push({ x: index % 40, y: Math.floor(index / 40) });
    });
    expect(lit.length).toBeGreaterThan(0);
    // The top of the limb and its back end: never its underside, never its front end (x > 30).
    for (const { x, y } of lit) expect(y < 20 && x <= 30, `${x}, ${y}`).toBe(true);
  });

  it('fades it out toward the ground: none at all down there', () => {
    const low = limb({ ...HIGH, ground: 25 });
    expect(low.includes(LIMB.rim ?? -1)).toBe(false);
  });

  it('darkens what is near the ground, as the volume turns', () => {
    const count = (pixels: Uint8Array, slot: number): number =>
      pixels.filter((each) => each === slot).length;
    const high = limb(HIGH);
    const low = limb({ ...HIGH, ground: 30 });
    expect(count(low, LIMB.light)).toBeLessThan(count(high, LIMB.light));
    expect(count(low, LIMB.deep)).toBeGreaterThan(count(high, LIMB.deep));
  });
});
