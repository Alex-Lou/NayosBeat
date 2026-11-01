import { check, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import { STAGE_SCALE } from '../../src/art/stage-layers';
import { luminanceDelta, relativeLuminance } from '../../src/render/luminance';
import { VEIL_DELTA } from '../../src/render/veils';
import { VIEW_SIZE } from '../../src/render/view';
import { rgbaAt } from '../../tools/sprites/colors';
import { checkDrawn } from '../../tools/sprites/drawn';
import type { IndexedImage, Rgba } from '../../tools/sprites/png';
import {
  colorsModule,
  installedLayers,
  LARGE_SHARE,
  largeColorsOf,
  loadStageDrawn,
  stageRulesOf,
  stageStart,
} from '../../tools/sprites/stage-drawn';
import { drawRue } from '../../tools/stage/rue';

const NONE: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const SKY: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };

/** An image read back from a file, in `palette`, every pixel `fill` but those `draw` puts. */
function imageOf(
  width: number,
  height: number,
  palette: readonly Rgba[],
  fill: number,
  draw: (put: (x: number, y: number, slot: number) => void) => void = () => undefined,
): IndexedImage {
  const pixels = new Uint8Array(width * height).fill(fill);
  draw((x, y, slot) => {
    pixels[y * width + x] = slot;
  });
  return {
    width,
    height,
    pixels,
    colors: palette.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: palette.map(({ a }) => a),
  };
}

describe('Stage layers drawn', () => {
  it('keep the far layer opaque everywhere', () => {
    const rules = stageRulesOf('far');
    const { width, height } = rules;
    expect(checkDrawn('far', imageOf(width, height, [NONE, SKY], 1), rules, undefined)).toEqual([]);
    const holed = imageOf(width, height, [NONE, SKY], 1, (put) => {
      put(7, 9, 0);
    });
    expect(checkDrawn('far', holed, rules, undefined)).toEqual([
      'far: frame 1, pixel 7,9 is transparent (this one is opaque everywhere)',
    ]);
  });

  it('take whole pixels only, laid over one another', () => {
    const { width, height } = stageRulesOf('floor');
    const glass = { ...RED, a: 128 };
    const floor = imageOf(width, height, [NONE, SKY, glass], 1, (put) => {
      put(3, 2, 2);
    });
    expect(checkDrawn('floor', floor, stageRulesOf('floor'), undefined)).toEqual([
      'floor: frame 1, pixel 3,2: half transparent (only fully opaque or fully transparent pixels)',
    ]);
  });

  it('are drawn as finely as the fighters, the middle one may stay empty', () => {
    expect(stageRulesOf('far').filled).toBe(true);
    expect(stageRulesOf('floor').filled).toBe(true);
    expect(stageRulesOf('mid').filled).toBe(false);
    expect(stageRulesOf('mid')).toMatchObject({
      width: 720 * STAGE_SCALE,
      height: 270 * STAGE_SCALE,
      transparency: 'whole',
    });
  });

  it('refuse a layer at the world resolution of the old pipeline, none until one is drawn', async () => {
    await expect(loadStageDrawn(new URL('./fixtures/drawn/', import.meta.url))).rejects.toThrow(
      'art-src/rue/mid.png: 1x1 px, expected 1440x540',
    );
    expect(await loadStageDrawn(new URL('./fixtures/missing/', import.meta.url))).toEqual({});
  });

  it("replace the code's street layer by layer", () => {
    const code = drawRue().layers;
    const far = imageOf(1200, 540, [NONE, SKY], 1);
    expect(installedLayers({})).toEqual(code);
    expect(installedLayers({ far })).toEqual({ ...code, far });
  });

  it("start from the code's street, slot 0 transparent as in Aseprite", () => {
    for (const layer of ['far', 'mid', 'floor'] as const) {
      const { pixels, palette } = stageStart(layer, undefined);
      const code = drawRue().layers[layer];
      expect(palette[0], layer).toEqual(NONE);
      expect(palette.length, layer).toBeLessThan(256);
      // The same colors, pixel for pixel.
      for (let at = 0; at < pixels.length; at += 97) {
        const { r, g, b, a } = palette[pixels[at] ?? 0] ?? NONE;
        expect({ r, g, b, a }).toEqual(rgbaAt(code, code.pixels[at] ?? 0));
      }
    }
  });
});

describe('The stage large colors', () => {
  // Counted in world pixels: a layer's image has STAGE_SCALE² pixels a world pixel.
  const least = Math.ceil(LARGE_SHARE * VIEW_SIZE.width * VIEW_SIZE.height * STAGE_SCALE ** 2);

  it('are those a layer covers 1 % of the screen with, the most covering first', () => {
    const palette = [NONE, SKY, RED, { r: 0, g: 0, b: 255, a: 255 }];
    const layer = imageOf(1200, 540, palette, 1, (put) => {
      for (let i = 0; i < least; i++) put(i % 1200, Math.floor(i / 1200), 2);
      for (let i = 0; i < least - 1; i++) put(i % 1200, 200 + Math.floor(i / 1200), 3);
    });
    expect(largeColorsOf([layer])).toEqual([0x1b1b2f, 0xff0000]);
  });

  it("of the code's street, stay in the band the flash effects are tuned for", () => {
    const colors = largeColorsOf(Object.values(drawRue().layers));
    // The darkest is the grey box's sky: the sparks and the words light the same over it.
    expect(Math.min(...colors.map(relativeLuminance))).toBe(relativeLuminance(0x1b1b2f));
    // None so light that a black effect over it would change it by more than VEIL_DELTA.
    for (const color of colors) {
      expect(luminanceDelta(0x000000, color, 1), color.toString(16)).toBeLessThanOrEqual(
        VEIL_DELTA,
      );
    }
  });

  it('are written as Prettier writes them', async () => {
    const file = new URL('../../src/art/rue/colors.ts', import.meta.url);
    const options = { ...((await resolveConfig(file)) ?? {}), filepath: file.pathname };
    for (const colors of [
      [],
      [0x1b1b2f, 0x3a3a5c],
      Array.from({ length: 37 }, (_, i) => i * 0x10101),
    ]) {
      const text = await colorsModule(colors, file);
      expect(text).toContain('export const STAGE_COLORS: readonly number[] = [');
      expect(await check(text, options)).toBe(true);
    }
    expect(await colorsModule([0x1b1b2f, 0x3a3a5c], file)).toContain('[0x1b1b2f, 0x3a3a5c]');
  });
});
