import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/sunset/colors';
import { STAGE_PROPS } from '../../src/art/sunset/props';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { readTruecolor } from '../../tools/sprites/truecolor';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';

const installed = async (layer: string) =>
  decodeIndexedPng(await readFile(new URL(`../../src/art/sunset/${layer}.png`, import.meta.url)));

describe('Sunset Beam (docs/art/decor-sunset.md)', { timeout: 60_000 }, () => {
  it('reads the illustration as an RGB source', async () => {
    const source = await readTruecolor(
      new URL('../../art-src/sunset/source/sunset.png', import.meta.url),
    );
    expect(source.width).toBeGreaterThan(0);
    expect(source.height).toBeGreaterThan(0);
    expect(source.data.length).toBe(source.width * source.height * 4);
    expect(source.data[3]).toBe(255);
  });

  it('keeps the layers contract: an opaque far and floor, no middle layer', async () => {
    for (const layer of ['far', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      expect(
        image.pixels.every((slot) => (image.alpha[slot] ?? 255) !== 0),
        layer,
      ).toBe(true);
    }
    await expect(installed('mid')).rejects.toThrow();
  });

  it('offers the place, in its dusk atmosphere', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear']);
    expect(STAGE_COLORS['dusk-clear']?.length ?? 0).toBeGreaterThan(0);
    const map = STAGE_MAPS.find(({ name }) => name === 'sunset');
    expect(map?.title).toBe('Sunset Beam');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'floor']);
  });

  it('animates the string lights, the torches, the equalizer and the sun', async () => {
    const names = STAGE_PROPS.map(({ name }) => name);
    expect(names).toEqual(['string-lights', 'torches', 'equalizer', 'sun-shimmer']);
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/sunset/props.png', import.meta.url)),
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
