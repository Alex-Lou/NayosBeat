import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/sahel/colors';
import { STAGE_PROPS } from '../../src/art/sahel/props';
import { FLASH_OUTSIDE_STAGES } from '../../src/render/stage-view';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { readTruecolor } from '../../tools/sprites/truecolor';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';

const installed = async (layer: string) =>
  decodeIndexedPng(await readFile(new URL(`../../src/art/sahel/${layer}.png`, import.meta.url)));

describe('Sahel Sunset (docs/art/decor-sahel.md)', { timeout: 60_000 }, () => {
  it('reads the illustration as an RGB source', async () => {
    const source = await readTruecolor(
      new URL('../../art-src/sahel/source/sahel.png', import.meta.url),
    );
    expect(source.width).toBeGreaterThan(0);
    expect(source.height).toBeGreaterThan(0);
    expect(source.data.length).toBe(source.width * source.height * 4);
    expect(source.data[3]).toBe(255);
  });

  it("keeps the layers contract: an opaque far and floor at the fighters' grain", async () => {
    for (const layer of ['far', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      expect(
        image.pixels.every((slot) => (image.alpha[slot] ?? 255) !== 0),
        layer,
      ).toBe(true);
      // The pixel-art material: one image pixel, 32 colours at most, no 2 × 2 blocks.
      expect(image.colors.length, layer).toBeLessThanOrEqual(32);
      expect(image.colors.length, layer).toBeGreaterThan(24);
    }
    await expect(installed('mid')).rejects.toThrow();
  });

  it('offers the place, in its clear dusk', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear']);
    expect(STAGE_COLORS['dusk-clear']?.length ?? 0).toBeGreaterThan(0);
    expect(FLASH_OUTSIDE_STAGES.has('sahel')).toBe(true);
    const map = STAGE_MAPS.find(({ name }) => name === 'sahel');
    expect(map?.title).toBe('Sahel Sunset');
    expect(map?.description).toBe('La rue du marché, au coucher du soleil');
    expect(map?.ground).toBe('hard');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'floor']);
  });

  it('animates the sun, the laundry, the birds, the lamps and the dust', async () => {
    const names = STAGE_PROPS.map(({ name }) => name);
    expect(names).toEqual([
      'sun-glow',
      'laundry',
      'birds',
      'lamp-awning',
      'lamp-street',
      'lamp-lane',
      'lamp-high',
      'dust',
    ]);
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/sahel/props.png', import.meta.url)),
    );
    for (const prop of STAGE_PROPS) {
      expect(prop.timeline.length, prop.name).toBeGreaterThan(1);
      for (const frame of prop.frames) {
        if (!frame) continue;
        expect(frame.sheetX + frame.width, prop.name).toBeLessThanOrEqual(sheet.width);
        expect(frame.sheetY + frame.height, prop.name).toBeLessThanOrEqual(sheet.height);
      }
    }
  });
});
