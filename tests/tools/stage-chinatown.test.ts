import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/chinatown/colors';
import { STAGE_PROPS } from '../../src/art/chinatown/props';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { readTruecolor } from '../../tools/sprites/truecolor';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';

const installed = async (layer: string) =>
  decodeIndexedPng(
    await readFile(new URL(`../../src/art/chinatown/${layer}.png`, import.meta.url)),
  );

describe('Chinatown (docs/art/decor-chinatown.md)', { timeout: 60_000 }, () => {
  it('reads the illustration as an RGB source, without losing its alpha', async () => {
    const source = await readTruecolor(
      new URL('../../art-src/chinatown/source/chinatown.png', import.meta.url),
    );
    expect(source.width).toBeGreaterThan(0);
    expect(source.height).toBeGreaterThan(0);
    expect(source.data.length).toBe(source.width * source.height * 4);
    expect(source.data[3]).toBe(255);
  });

  it('keeps the layers contract: sizes, an opaque far and floor', async () => {
    for (const layer of ['far', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      const tRNS = image.alpha;
      const slotIsClear = (slot: number) => (tRNS[slot] ?? 255) === 0;
      const clear = image.pixels.every((slot) => slotIsClear(slot));
      expect(clear, layer).toBe(false);
    }
  });

  it('offers the place, in its dusk atmosphere', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear']);
    expect(STAGE_COLORS['dusk-clear']?.length ?? 0).toBeGreaterThan(0);
    const map = STAGE_MAPS.find(({ name }) => name === 'chinatown');
    expect(map?.title).toBe('Chinatown');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'floor']);
  });

  it('animates the waterfall, the lanterns and the fireflies', async () => {
    const names = STAGE_PROPS.map(({ name }) => name);
    expect(names).toContain('waterfall');
    expect(names).toContain('lanterns');
    expect(names).toContain('fireflies');
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/chinatown/props.png', import.meta.url)),
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
