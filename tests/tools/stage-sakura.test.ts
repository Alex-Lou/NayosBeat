import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/sakura/colors';
import { STAGE_PROPS } from '../../src/art/sakura/props';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { luminanceDelta, relativeLuminance } from '../../src/render/luminance';
import { VEIL_DELTA } from '../../src/render/veils';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';

/** The hue of a vivid color (degrees), or undefined for a dull or dark one. */
function vividHue(r: number, g: number, b: number): number | undefined {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (max === 0 || delta / max < 0.45 || max / 255 < 0.45) return undefined;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

async function installed(layer: (typeof STAGE_LAYER_NAMES)[number]) {
  return decodeIndexedPng(
    await readFile(new URL(`../../src/art/sakura/${layer}.png`, import.meta.url)),
  );
}

/** The first pixel where two images show different colors, -1 if none (a fast walk: these images
 * are big, and a deep equality on a million entries is a trap). */
function firstDifference(a: IndexedImage, b: IndexedImage): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  for (let at = 0; at < a.pixels.length; at++) {
    const left = rgbaAt(a, a.pixels[at] ?? 0);
    const right = rgbaAt(b, b.pixels[at] ?? 0);
    if (left.r !== right.r || left.g !== right.g || left.b !== right.b || left.a !== right.a) {
      return at;
    }
  }
  return -1;
}

describe('the hand-drawn Sakura Arena (docs/art/decor-sakura.md)', { timeout: 60_000 }, () => {
  it('is what the game shows: the installed layers are the drawn ones', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const shown = await installed(layer);
      const source = await decodeIndexedPng(
        await readFile(new URL(`../../art-src/sakura/${layer}.png`, import.meta.url)),
      );
      expect(firstDifference(shown, source), layer).toBe(-1);
    }
  });

  it('keeps the layers contract: their sizes, an opaque far layer', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      if (layer === 'far') {
        expect(image.pixels.every((slot) => rgbaAt(image, slot).a !== 0)).toBe(true);
      }
    }
  });

  it('offers the place, in its one atmosphere', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear']);
    const map = STAGE_MAPS.find(({ name }) => name === 'sakura');
    expect(map?.title).toBe('Sakura Arena');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
  });

  it('keeps its large colors in the flash band the effects are tuned for', () => {
    for (const [atmosphere, large] of Object.entries(STAGE_COLORS)) {
      for (const color of large) {
        expect(
          luminanceDelta(0x000000, color, 1),
          `${atmosphere} ${color.toString(16)}`,
        ).toBeLessThanOrEqual(VEIL_DELTA);
        expect(relativeLuminance(color)).toBeGreaterThanOrEqual(relativeLuminance(0x1b1b2f));
      }
    }
  });

  it('animates the petals over the sanctuary', async () => {
    const petals = STAGE_PROPS.find(({ name }) => name === 'petals');
    expect(petals?.layer).toBe('mid');
    expect(petals?.frames.filter((frame) => frame !== null).length).toBeGreaterThan(0);
    expect(petals?.timeline.length).toBeGreaterThan(1);
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/sakura/props.png', import.meta.url)),
    );
    expect(sheet.width).toBeGreaterThan(0);
    for (const frame of petals?.frames ?? []) {
      if (!frame) continue;
      expect(frame.sheetX + frame.width).toBeLessThanOrEqual(sheet.width);
      expect(frame.sheetY + frame.height).toBeLessThanOrEqual(sheet.height);
    }
  });

  it('leaves cyan and magenta to the fighters', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const image = await installed(layer);
      for (const slot of new Set(image.pixels)) {
        const { r, g, b, a } = rgbaAt(image, slot);
        if (a === 0) continue;
        const hue = vividHue(r, g, b);
        if (hue === undefined) continue;
        for (const taken of [185, 325]) {
          const apart = Math.min(Math.abs(hue - taken), 360 - Math.abs(hue - taken));
          expect(apart, `${layer} ${r},${g},${b}`).toBeGreaterThan(25);
        }
      }
    }
  });
});
