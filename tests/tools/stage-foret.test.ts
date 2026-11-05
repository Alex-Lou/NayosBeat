import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/foret/colors';
import { STAGE_PROPS } from '../../src/art/foret/props';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { relativeLuminance } from '../../src/render/luminance';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { readTruecolor } from '../../tools/sprites/truecolor';

/** A truecolor layer as it is on disk (the illustration's own colors, no palette). */
function imageAt(folder: 'art-src' | 'src/art', layer: string) {
  return readTruecolor(new URL(`../../${folder}/foret/${layer}.png`, import.meta.url));
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

describe(
  'the hand-drawn Dancing Forest (docs/art/decor-forest-dance.md)',
  { timeout: 60_000 },
  () => {
    it('keeps the developer’s background, untouched, in art-src/foret/source/', async () => {
      const png = await readFile(
        new URL('../../art-src/foret/source/foret-bg.png', import.meta.url),
      );
      const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
      expect([view.getUint32(16), view.getUint32(20)]).toEqual([1677, 938]);
    });

    it('is what the game shows: the installed truecolor layers are the drawn ones', async () => {
      for (const layer of STAGE_LAYER_NAMES) {
        const shown = await installed(layer);
        const source = await imageAt('art-src', layer);
        expect([shown.width, shown.height], layer).toEqual([source.width, source.height]);
        expect(sameBytes(shown.data, source.data), layer).toBe(true);
      }
    });

    it('keeps the layers contract: their sizes, an opaque far, a clear mid, an opaque floor', async () => {
      for (const layer of STAGE_LAYER_NAMES) {
        const image = await installed(layer);
        const { width, height } = stageRulesOf(layer);
        expect([image.width, image.height], layer).toEqual([width, height]);
        const alpha = alphas(image);
        if (layer === 'mid') {
          // The middle layer is clear: the leaves are laid over the illustration, with no seam.
          expect(
            alpha.every((value) => value === 0),
            layer,
          ).toBe(true);
        } else {
          // The far layer is the whole scene; the floor is the dirt path under the fighters' feet.
          expect(
            alpha.every((value) => value === 255),
            layer,
          ).toBe(true);
        }
      }
    });

    it('offers the place, in its one atmosphere', () => {
      expect(Object.keys(STAGE_COLORS)).toEqual(['dawn-clear']);
      expect(STAGE_COLORS['dawn-clear']?.length ?? 0).toBeGreaterThan(0);
      const map = STAGE_MAPS.find(({ name }) => name === 'foret');
      expect(map?.title).toBe('Dancing Forest');
      expect(map?.description).toBe('Le sanctuaire dans la forêt, entre les feuilles qui dansent');
      expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dawn', weather: 'clear' });
    });

    it('is a day stage: its bright colors live outside the midnight flash envelope', () => {
      // The developer's image stays as it is: no exposure, no desaturation. The flash tables are
      // measured over the midnight stages; Dancing Forest is excluded from their envelope
      // (stage-view.ts FIGHT_STAGE_COLORS), like Sakura (docs/art/decor-forest-dance.md §3).
      const large = STAGE_COLORS['dawn-clear'] ?? [];
      expect(large.length).toBeGreaterThan(0);
      expect(Math.max(...large.map((color) => relativeLuminance(color)))).toBeGreaterThan(0.078);
    });

    it('animates the falling leaves over the clearing', async () => {
      expect(STAGE_PROPS.map(({ name }) => name)).toEqual(['leaves']);
      const leaves = STAGE_PROPS[0];
      expect(leaves?.layer).toBe('mid');
      expect(leaves?.frames[0]).toBeNull();
      expect(leaves?.frames.filter((frame) => frame !== null).length).toBe(6);
      const total = leaves?.timeline.reduce((sum, [, steps]) => sum + steps, 0);
      expect(total).toBe(300);
      const drift = leaves?.drift;
      expect(drift).toEqual({ from: -830, to: 830, start: 0, steps: 280 });
      const sheet = await decodeIndexedPng(
        await readFile(new URL('../../src/art/foret/props.png', import.meta.url)),
      );
      expect(sheet.width).toBeGreaterThan(0);
      for (const frame of leaves?.frames ?? []) {
        if (!frame) continue;
        expect(frame.sheetX + frame.width).toBeLessThanOrEqual(sheet.width);
        expect(frame.sheetY + frame.height).toBeLessThanOrEqual(sheet.height);
      }
    });
  },
);
