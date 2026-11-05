import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_COLORS } from '../../src/art/helipad/colors';
import { STAGE_PROPS } from '../../src/art/helipad/props';
import { STAGE_MAPS } from '../../src/art/stages';
import { FLASH_OUTSIDE_STAGES } from '../../src/render/stage-view';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { readTruecolor } from '../../tools/sprites/truecolor';

/** A truecolor layer as it is on disk (the illustration's own colors, no palette). */
function imageAt(folder: 'art-src' | 'src/art', layer: string) {
  return readTruecolor(new URL(`../../${folder}/helipad/${layer}.png`, import.meta.url));
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

describe('the hand-drawn H-02 Helipad (docs/art/decor-helipad.md)', { timeout: 60_000 }, () => {
  it('keeps the developer’s GIF and its extracted frame in art-src/helipad/source/', async () => {
    const gif = await readFile(
      new URL('../../art-src/helipad/source/helipad.gif', import.meta.url),
    );
    expect(String.fromCharCode(...gif.subarray(0, 6))).toMatch(/^GIF8[79]a$/);
    const header = new DataView(gif.buffer, gif.byteOffset, gif.byteLength);
    expect(header.getUint16(6, true)).toBe(836);
    expect(header.getUint16(8, true)).toBe(470);
    const png = await readFile(
      new URL('../../art-src/helipad/source/helipad.png', import.meta.url),
    );
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([836, 470]);
  });

  it('is what the game shows: the installed truecolor layers are the drawn ones', async () => {
    for (const layer of ['far', 'mid', 'floor'] as const) {
      const shown = await installed(layer);
      const source = await imageAt('art-src', layer);
      expect([shown.width, shown.height], layer).toEqual([source.width, source.height]);
      expect(sameBytes(shown.data, source.data), layer).toBe(true);
    }
  });

  it('keeps the layers contract: an opaque far and floor, a cut-out tower in the mid', async () => {
    for (const layer of ['far', 'floor'] as const) {
      const image = await installed(layer);
      const { width, height } = stageRulesOf(layer);
      expect([image.width, image.height], layer).toEqual([width, height]);
      expect(
        alphas(image).every((value) => value === 255),
        layer,
      ).toBe(true);
    }
    const mid = await installed('mid');
    expect([mid.width, mid.height]).toEqual([
      stageRulesOf('mid').width,
      stageRulesOf('mid').height,
    ]);
    const alpha = alphas(mid);
    expect(alpha.some((value) => value === 0)).toBe(true);
    expect(alpha.some((value) => value === 255)).toBe(true);
  });

  it('offers the place, in its moonlit midnight', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear']);
    expect(STAGE_COLORS['midnight-clear']?.length ?? 0).toBeGreaterThan(0);
    expect(FLASH_OUTSIDE_STAGES.has('helipad')).toBe(true);
    const map = STAGE_MAPS.find(({ name }) => name === 'helipad');
    expect(map?.title).toBe('H-02 Helipad');
    expect(map?.description).toBe('Le toit de la tour H-02, sous la lune et les néons');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
    expect(map?.variants[0]?.art.layers.map(({ name }) => name)).toEqual(['far', 'mid', 'floor']);
  });

  it('replays the GIF’s helicopter, smokes and beacons, cut to the changed pixels', async () => {
    expect(STAGE_PROPS.map(({ name }) => name)).toEqual([
      'helicopter',
      'smoke-right',
      'smoke-left',
      'beacon-tower',
      'beacon-right',
    ]);
    const sheet = await readTruecolor(new URL('../../src/art/helipad/props.png', import.meta.url));
    expect([sheet.width, sheet.height]).toEqual([998, 704]);
    for (const prop of STAGE_PROPS) {
      expect(prop.frames[0], prop.name).toBeNull();
      expect(
        prop.timeline.reduce((sum, [, steps]) => sum + steps, 0),
        prop.name,
      ).toBe(192);
      expect(
        prop.frames.filter((frame) => frame !== null).length,
        prop.name,
      ).toBeGreaterThanOrEqual(14);
      for (const frame of prop.frames) {
        if (!frame) continue;
        expect(frame.sheetX + frame.width, prop.name).toBeLessThanOrEqual(sheet.width);
        expect(frame.sheetY + frame.height, prop.name).toBeLessThanOrEqual(sheet.height);
      }
    }
    expect(STAGE_PROPS.filter(({ layer }) => layer === 'mid').map(({ name }) => name)).toEqual([
      'smoke-left',
      'beacon-tower',
    ]);
  });
});
