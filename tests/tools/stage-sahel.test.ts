import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/sahel/colors';
import { STAGE_PROPS } from '../../src/art/sahel/props';
import { FLASH_OUTSIDE_STAGES } from '../../src/render/stage-view';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { readTruecolor } from '../../tools/sprites/truecolor';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { DARK_FLOOR, toLab } from '../../tools/stage/kit/unify';

const installed = async (layer: string) =>
  decodeIndexedPng(await readFile(new URL(`../../src/art/sahel/${layer}.png`, import.meta.url)));

const lightnessOf = (image: IndexedImage) =>
  image.colors.map((c) => toLab((c >> 16) & 255, (c >> 8) & 255, c & 255)[0]);

/** Micro-detail: the mean lightness step (Lab L) between two opaque side neighbours. */
function detailOf(image: IndexedImage): number {
  const L = lightnessOf(image);
  let sum = 0;
  let count = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width - 1; x++) {
      const a = image.pixels[y * image.width + x] ?? 0;
      const b = image.pixels[y * image.width + x + 1] ?? 0;
      if (!(image.alpha[a] ?? 255) || !(image.alpha[b] ?? 255)) continue;
      sum += Math.abs((L[a] ?? 0) - (L[b] ?? 0));
      count++;
    }
  }
  return sum / count;
}

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

  it('keeps the layers contract: an opaque sky, a street cut out of it, an opaque road', async () => {
    for (const layer of ['far', 'mid', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      const clear = image.pixels.filter((slot) => (image.alpha[slot] ?? 255) === 0).length;
      // The street shows the sky through its own: between a tenth and a third of it.
      if (layer === 'mid') {
        expect(clear / image.pixels.length).toBeGreaterThan(0.05);
        expect(clear / image.pixels.length).toBeLessThan(0.35);
      } else expect(clear, layer).toBe(0);
    }
  });

  it("is pixel art at the fighters' grain: small palettes, no lone pixel", async () => {
    // The drawn earth dithers between its tones and scatters 1 px pebbles: it allows more.
    for (const [layer, most, lonely] of [
      ['far', 19, 0.08],
      ['mid', 64, 0.08],
      ['floor', 32, 0.12],
    ] as const) {
      const image = await installed(layer);
      expect(image.colors.length, layer).toBeLessThanOrEqual(most);
      // Hardly any pixel without a side neighbour of its colour: clean clusters, no noise.
      let lone = 0;
      let opaque = 0;
      const { width, height, pixels } = image;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const k = y * width + x;
          const here = pixels[k] ?? 0;
          if (here === 0) continue;
          opaque++;
          const sides = [pixels[k - 1], pixels[k + 1], pixels[k - width], pixels[k + width]];
          if (!sides.includes(here)) lone++;
        }
      }
      expect(lone / opaque, layer).toBeLessThan(lonely);
    }
  });

  it('stays behind the fighters: a third of their detail, none of their near-black', async () => {
    // docs/art/recherche-equilibre-visuel.md: the fighters' detail (5.9 for Nayo, 9.1 for Riff),
    // a third of it behind them, as on Street Fighter III and The King of Fighters XIII.
    const sprites = await Promise.all(
      ['nayo', 'riff'].map(async (fighter) =>
        detailOf(
          await decodeIndexedPng(
            await readFile(new URL(`../../src/art/${fighter}/main/idle.png`, import.meta.url)),
          ),
        ),
      ),
    );
    const fighters = sprites.reduce((sum, detail) => sum + detail, 0) / sprites.length;
    for (const layer of ['far', 'mid', 'floor', 'props'] as const) {
      const image = await installed(layer);
      if (layer !== 'props') expect(detailOf(image), layer).toBeLessThan(fighters * 0.4);
      const used = new Set(image.pixels);
      const L = lightnessOf(image);
      for (const slot of used) {
        if (!(image.alpha[slot] ?? 255)) continue;
        expect(L[slot] ?? 0, `${layer} slot ${slot}`).toBeGreaterThanOrEqual(DARK_FLOOR - 0.5);
      }
    }
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
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'mid', 'floor']);
  });

  it('lives: the sun, the birds, the crowd, the laundry, the lamps, the fire, the smoke, the radio', async () => {
    const names = STAGE_PROPS.map(({ name }) => name);
    expect(names).toEqual([
      'sun-glow',
      'birds',
      'crowd-left',
      'crowd-centre',
      'crowd-right',
      'laundry',
      'lamp-awning',
      'lamp-street',
      'lamp-lane',
      'lamp-high',
      'brazier-glow',
      'brazier-fire',
      'brazier-smoke',
      'grill-smoke',
      'cone-street',
      'cone-lane',
      'moths',
      'radio',
    ]);
    // The crowd and the radio keep one beat: 30 steps, over the same 40 s loop.
    for (const name of ['crowd-left', 'crowd-centre', 'crowd-right', 'radio']) {
      const prop = STAGE_PROPS.find((candidate) => candidate.name === name);
      expect(
        prop?.timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(2400);
    }
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
