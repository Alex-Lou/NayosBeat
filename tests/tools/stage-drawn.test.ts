import { describe, expect, it } from 'vitest';
import { STAGE_LAYERS } from '../../src/art/stage-layers';
import { GREYBOX, GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { VIEW_SIZE } from '../../src/render/view';
import { checkDrawn } from '../../tools/sprites/drawn';
import type { IndexedImage, Rgba } from '../../tools/sprites/png';
import {
  colorsModule,
  LARGE_SHARE,
  largeColorsOf,
  loadStageDrawn,
  stageRulesOf,
  stageStart,
} from '../../tools/sprites/stage-drawn';

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
    const { width, height } = STAGE_LAYERS.far;
    const rules = stageRulesOf('far');
    expect(checkDrawn('far', imageOf(width, height, [NONE, SKY], 1), rules, undefined)).toEqual([]);
    const holed = imageOf(width, height, [NONE, SKY], 1, (put) => {
      put(7, 9, 0);
    });
    expect(checkDrawn('far', holed, rules, undefined)).toEqual([
      'far: frame 1, pixel 7,9 is transparent (this one is opaque everywhere)',
    ]);
  });

  it('take whole pixels only, laid over one another', () => {
    const { width, height } = STAGE_LAYERS.floor;
    const glass = { ...RED, a: 128 };
    const floor = imageOf(width, height, [NONE, SKY, glass], 1, (put) => {
      put(3, 2, 2);
    });
    expect(checkDrawn('floor', floor, stageRulesOf('floor'), undefined)).toEqual([
      'floor: frame 1, pixel 3,2: half transparent (only fully opaque or fully transparent pixels)',
    ]);
  });

  it('need the far layer and the floor drawn, the middle one may stay empty', () => {
    expect(stageRulesOf('far').filled).toBe(true);
    expect(stageRulesOf('floor').filled).toBe(true);
    expect(stageRulesOf('mid').filled).toBe(false);
    expect(stageRulesOf('mid')).toMatchObject({ width: 720, height: 270, transparency: 'whole' });
  });

  it('are drawn whole or not at all, and none until something is', async () => {
    await expect(loadStageDrawn(new URL('./fixtures/drawn/', import.meta.url))).rejects.toThrow(
      'art-src/entrepot: the stage needs its far and floor too (or none of it)',
    );
    expect(await loadStageDrawn(new URL('./fixtures/missing/', import.meta.url))).toEqual({});
  });

  it('start from the grey box: its sky far, nothing in the middle, its ground and marks on the floor', () => {
    const far = stageStart('far', undefined);
    expect(new Set(far.pixels)).toEqual(new Set([1]));
    expect(far.palette[1]).toEqual(SKY);
    expect(new Set(stageStart('mid', undefined).pixels)).toEqual(new Set([0]));
    const floor = stageStart('floor', undefined);
    const { width } = STAGE_LAYERS.floor;
    const at = (x: number, y: number) => floor.palette[floor.pixels[y * width + x] ?? 0];
    const mark = GREYBOX.colors.groundMark;
    const rgb = (color: number) => ({
      r: color >> 16,
      g: (color >> 8) & 255,
      b: color & 255,
      a: 255,
    });
    expect(at(0, 0)).toEqual(rgb(GREYBOX.colors.ground));
    expect(at(GREYBOX.markSpacing, GREYBOX.markSize)).toEqual(rgb(mark));
    expect(at(GREYBOX.markSpacing + GREYBOX.markSize, GREYBOX.markSize)).toEqual(
      rgb(GREYBOX.colors.ground),
    );
  });
});

describe('The stage large colors', () => {
  const least = Math.ceil(LARGE_SHARE * VIEW_SIZE.width * VIEW_SIZE.height);

  it('are those a layer covers 1 % of the screen with, the most covering first', () => {
    const palette = [NONE, SKY, RED, { r: 0, g: 0, b: 255, a: 255 }];
    const layer = imageOf(600, 270, palette, 1, (put) => {
      for (let i = 0; i < least; i++) put(i % 600, Math.floor(i / 600), 2);
      for (let i = 0; i < least - 1; i++) put(i % 600, 100 + Math.floor(i / 600), 3);
    });
    expect(largeColorsOf([layer])).toEqual([0x1b1b2f, 0xff0000]);
  });

  it('of the grey box drawn as it is, are its own', () => {
    const layers = (['far', 'floor'] as const).map((name) => {
      const { pixels, palette } = stageStart(name, undefined);
      const { width, height } = STAGE_LAYERS[name];
      return { ...imageOf(width, height, palette, 0), pixels };
    });
    expect(largeColorsOf(layers)).toEqual(GREYBOX_COLORS);
  });

  it('are written as Prettier would, on one line or one per line', () => {
    expect(colorsModule([0x1b1b2f, 0x3a3a5c])).toContain(
      'export const STAGE_COLORS: readonly number[] = [0x1b1b2f, 0x3a3a5c];',
    );
    expect(colorsModule([])).toContain('export const STAGE_COLORS: readonly number[] = [];');
    const many = colorsModule(Array.from({ length: 9 }, (_, index) => index * 0x111111));
    expect(many).toContain('export const STAGE_COLORS: readonly number[] = [\n  0x000000,\n');
    expect(many).toContain('  0x888888,\n];');
  });
});
