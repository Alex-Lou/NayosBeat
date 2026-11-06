import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_COLORS } from '../../src/art/cyberarena/colors';
import { STAGE_PROPS } from '../../src/art/cyberarena/props';
import { OFFERED_STAGES, STAGE_MAPS } from '../../src/art/stages';
import { FLASH_OUTSIDE_STAGES } from '../../src/render/stage-view';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { readTruecolor } from '../../tools/sprites/truecolor';

/** A truecolor layer as it is on disk (the illustration's own colors, no palette). */
function imageAt(folder: 'art-src' | 'src/art', layer: string) {
  return readTruecolor(new URL(`../../${folder}/cyberarena/${layer}.png`, import.meta.url));
}

const installed = (layer: string) => imageAt('src/art', layer);

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

describe('the hand-drawn Cyber Arena (docs/art/decor-cyberarena.md)', { timeout: 60_000 }, () => {
  it('keeps the developer’s background, untouched, in art-src/carnival/source/', async () => {
    const png = await readFile(
      new URL('../../art-src/cyberarena/source/cyberarena.png', import.meta.url),
    );
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1672, 941]);
  });

  it('is what the game shows: the installed truecolor layers are the drawn ones', async () => {
    for (const layer of ['far', 'floor'] as const) {
      const shown = await installed(layer);
      const source = await imageAt('art-src', layer);
      expect([shown.width, shown.height], layer).toEqual([source.width, source.height]);
      expect(sameBytes(shown.data, source.data), layer).toBe(true);
    }
  });

  it('keeps the layers contract: an opaque far and floor, no middle layer', async () => {
    for (const layer of ['far', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      expect(
        alphas(image).every((value) => value === 255),
        layer,
      ).toBe(true);
    }
    await expect(
      readTruecolor(new URL('../../src/art/cyberarena/mid.png', import.meta.url)),
    ).rejects.toThrow();
  });

  it('offers the place, in its moonlit midnight, and no animation', () => {
    expect(STAGE_PROPS).toEqual([]);
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear']);
    expect(STAGE_COLORS['midnight-clear']?.length ?? 0).toBeGreaterThan(0);
    expect(FLASH_OUTSIDE_STAGES.has('cyberarena')).toBe(true);
    const map = STAGE_MAPS.find(({ name }) => name === 'cyberarena');
    expect(map?.title).toBe('Cyber Arène');
    expect(map?.description).toBe("Le toit de l'arène féline, sous la lune et les néons cyan");
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'floor']);
  });

  it('is the only place the game offers, the others kept and measured', () => {
    expect(OFFERED_STAGES.map(({ name }) => name)).toEqual(['cyberarena']);
    expect(STAGE_MAPS.length).toBeGreaterThan(1);
  });
});
