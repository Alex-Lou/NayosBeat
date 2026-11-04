import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/sakura/colors';
import { STAGE_PROPS } from '../../src/art/sakura/props';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { luminanceDelta, relativeLuminance } from '../../src/render/luminance';
import { VEIL_DELTA } from '../../src/render/veils';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { readTruecolor } from '../../tools/sprites/truecolor';

/** A truecolor layer as it is on disk (the illustration's own colors, no palette). */
function imageAt(folder: 'art-src' | 'src/art', layer: string) {
  return readTruecolor(new URL(`../../${folder}/sakura/${layer}.png`, import.meta.url));
}

const installed = (layer: string) => imageAt('src/art', layer);

/** The alpha of a truecolor image, pixel by pixel. */
/** Whether two RGBA buffers hold the same bytes (no Node Buffer: the lint's types may not know it). */
function sameBytes(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let at = 0; at < a.length; at++) if (a[at] !== b[at]) return false;
  return true;
}

function alphas(image: Awaited<ReturnType<typeof imageAt>>): Uint8Array {
  const out = new Uint8Array(image.width * image.height);
  for (let at = 0; at < out.length; at++) out[at] = image.data[at * 4 + 3] ?? 0;
  return out;
}

describe('the hand-drawn Sakura Arena (docs/art/decor-sakura.md)', { timeout: 60_000 }, () => {
  it('is what the game shows: the installed truecolor layers are the drawn ones', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const shown = await installed(layer);
      const source = await imageAt('art-src', layer);
      expect([shown.width, shown.height], layer).toEqual([source.width, source.height]);
      expect(sameBytes(shown.data, source.data), layer).toBe(true);
    }
  });

  it('keeps the layers contract: their sizes, an opaque far layer, whole alpha elsewhere', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      const alpha = alphas(image);
      if (layer === 'far') {
        expect(
          alpha.every((value) => value === 255),
          layer,
        ).toBe(true);
      } else {
        expect(
          alpha.every((value) => value === 0 || value === 255),
          layer,
        ).toBe(true);
      }
    }
  });

  it('offers the place, in its one atmosphere', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear']);
    expect(STAGE_COLORS['dusk-clear']?.length ?? 0).toBeGreaterThan(0);
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
});
