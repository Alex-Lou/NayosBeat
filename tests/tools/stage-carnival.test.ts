import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/carnival/colors';
import { STAGE_PROPS } from '../../src/art/carnival/props';
import { FLASH_OUTSIDE_STAGES } from '../../src/render/stage-view';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { readTruecolor } from '../../tools/sprites/truecolor';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';

const installed = async (layer: string) =>
  decodeIndexedPng(await readFile(new URL(`../../src/art/carnival/${layer}.png`, import.meta.url)));

describe('Rust Carnival (docs/art/decor-carnival.md)', { timeout: 60_000 }, () => {
  it('reads the illustration as an RGB source', async () => {
    const source = await readTruecolor(
      new URL('../../art-src/carnival/source/carnival.png', import.meta.url),
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

  it('offers the place, in its stormy midnight', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear']);
    expect(STAGE_COLORS['midnight-clear']?.length ?? 0).toBeGreaterThan(0);
    expect(FLASH_OUTSIDE_STAGES.has('carnival')).toBe(true);
    const map = STAGE_MAPS.find(({ name }) => name === 'carnival');
    expect(map?.title).toBe('Rust Carnival');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'floor']);
  });

  it('animates the Ferris wheel, the storm, the carousel and the puddles', async () => {
    const names = STAGE_PROPS.map(({ name }) => name);
    expect(names).toEqual(['ferris-lights', 'storm', 'carousel', 'puddles']);
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/carnival/props.png', import.meta.url)),
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
