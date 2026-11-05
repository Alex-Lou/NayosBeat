import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_LAYERS, STAGE_LAYER_NAMES, STAGE_SCALE } from '../../src/art/stage-layers';
import { STAGE_COLORS } from '../../src/art/temple/colors';
import { STAGE_PROPS } from '../../src/art/temple/props';
import { STAGE_COLORS as GYM_COLORS } from '../../src/art/gym/colors';
import { STAGE_COLORS as RUE_COLORS } from '../../src/art/rue/colors';
import { brightestBackdrop } from '../../src/render/luminance';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { liftedLayers, packProps } from '../../tools/sprites/stage-props';
import { FIGHTERS_ROWS, MOST_NOISE, noiseOf } from '../../tools/stage/kit/clean';
import { drawTemple } from '../../tools/stage/temple';
import { TEMPLE_ATMOSPHERES } from '../../tools/stage/temple/atmospheres';
import { GUST_AT, GUST_CYCLE } from '../../tools/stage/temple/mid';
import {
  BLOSSOM,
  MOSS,
  PALETTE,
  SNOW_BLOSSOM,
  SNOW_MOSS,
  SNOW_STONE,
  SNOW_TILE,
  STONE,
  TILE,
} from '../../tools/stage/temple/palette';

/** The colors of an image, pixel by pixel, as 0xRRGGBBAA (0: transparent). */
function colorsOf(image: IndexedImage): number[] {
  return Array.from(image.pixels, (slot) => {
    const { r, g, b, a } = rgbaAt(image, slot);
    return a === 0 ? 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  });
}

function firstDifference(a: IndexedImage, b: IndexedImage): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  const left = colorsOf(a);
  const right = colorsOf(b);
  return left.findIndex((color, index) => color !== right[index]);
}

/** The hue of a vivid color (degrees), or undefined for a dull or dark one. */
function vividHue(r: number, g: number, b: number): number | undefined {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (max === 0 || delta / max < 0.45 || max / 255 < 0.45) return undefined;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

function totalOf(timeline: readonly (readonly [number, number])[]): number {
  return timeline.reduce((sum, [, steps]) => sum + steps, 0);
}

function frameAt(name: string, step: number): number {
  const { timeline } = propNamed(name);
  let left = step % totalOf(timeline);
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

/** What the gust shakes (docs/art/decor-temple.md §5). */
const GUSTED = ['string', 'hall', 'shide', 'chime', 'incense', 'petals0', 'petals1', 'petals2'];

describe("the code's Temple Courtyard (docs/art/decor-temple.md)", { timeout: 60_000 }, () => {
  const { layers, props } = drawTemple();
  const lifted = liftedLayers(props, layers);

  it('is what the game shows: npm run stages installed it', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/temple/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, lifted[layer]), layer).toBe(-1);
    }
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/temple/props.png', import.meta.url)),
    );
    const packed = packProps(props, layers).sheet;
    if (!packed) throw new Error('props');
    expect(firstDifference(sheet, packed)).toBe(-1);
  });

  it('keeps the layers contract: their sizes, an opaque far layer, one palette', () => {
    expect(PALETTE.length).toBeLessThanOrEqual(256);
    expect(PALETTE.slice(1).every(({ a }) => a === 255)).toBe(true);
    for (const layer of STAGE_LAYER_NAMES) {
      const { width, height } = stageRulesOf(layer);
      expect([lifted[layer].width, lifted[layer].height], layer).toEqual([width, height]);
    }
    expect(lifted.far.pixels.every((slot) => slot !== 0)).toBe(true);
  });

  it('offers dawn, dusk and night, the rain at dusk and the snow at night: no full day', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([
      'dawn-clear',
      'dusk-clear',
      'dusk-rain',
      'midnight-clear',
      'midnight-snow',
    ]);
  });

  it('keeps its large colors inside the backdrop the flash tables were measured over', () => {
    const before = brightestBackdrop(
      [RUE_COLORS, GYM_COLORS].flatMap((colors) => Object.values(colors).flat()),
    );
    for (const [atmosphere, colors] of Object.entries(STAGE_COLORS)) {
      for (const color of colors) {
        for (const shift of [16, 8, 0]) {
          expect(
            (color >> shift) & 0xff,
            `${atmosphere} ${color.toString(16)}`,
          ).toBeLessThanOrEqual((before >> shift) & 0xff);
        }
      }
    }
  });

  it('hides its snow but under the snow: dry, it is what it covers, tone for tone', () => {
    const hidden: [readonly number[], readonly number[]][] = [
      [SNOW_TILE, TILE],
      [SNOW_STONE, STONE],
      [SNOW_MOSS, MOSS],
      [SNOW_BLOSSOM, BLOSSOM],
    ];
    for (const { atmosphere, palette } of TEMPLE_ATMOSPHERES) {
      const name = `${atmosphere.moment}-${atmosphere.weather}`;
      for (const [snow, dry] of hidden) {
        const same = snow.every((slot, step) => {
          const [a, b] = [palette[slot], palette[dry[step] ?? 0]];
          return a?.r === b?.r && a?.g === b?.g && a?.b === b?.b;
        });
        expect(same, name).toBe(atmosphere.weather !== 'snow');
      }
    }
  });

  it('leaves cyan and magenta to the fighters: none of its vivid colors comes near them', () => {
    for (const { r, g, b } of PALETTE.slice(1)) {
      const hue = vividHue(r, g, b);
      if (hue === undefined) continue;
      for (const taken of [185, 325]) {
        const apart = Math.min(Math.abs(hue - taken), 360 - Math.abs(hue - taken));
        expect(apart, `${r},${g},${b}`).toBeGreaterThan(25);
      }
    }
  });

  it('stays clean where the fighters stand: little noise in each layer (docs/art/proprete.md)', () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const [from, to] = FIGHTERS_ROWS[layer];
      expect(noiseOf(lifted[layer], from, to), layer).toBeLessThanOrEqual(MOST_NOISE[layer]);
    }
  });

  it('lays each frame of its props over the layer installed exactly as the code drew it', () => {
    const { props: packed, sheet } = packProps(props, layers);
    if (!sheet) throw new Error('a sheet');
    for (const prop of packed) {
      const code = props.find(({ name }) => name === prop.name);
      if (!code) throw new Error(prop.name);
      const layer = { ...lifted[prop.layer], pixels: Uint8Array.from(lifted[prop.layer].pixels) };
      for (const other of packed) {
        const first = other.frames[0];
        if (other === prop || other.layer !== prop.layer || !first) continue;
        for (let y = 0; y < first.height; y++) {
          for (let x = 0; x < first.width; x++) {
            const slot = sheet.pixels[(first.sheetY + y) * sheet.width + first.sheetX + x] ?? 0;
            if (slot !== 0) layer.pixels[(first.y + y) * layer.width + first.x + x] = slot;
          }
        }
      }
      prop.frames.forEach((frame, index) => {
        const drawn = code.frames[index];
        if (!drawn) throw new Error(`${prop.name} ${index}`);
        const shown = Array.from({ length: code.rect.width * code.rect.height }, (_, at) => {
          const x = code.rect.x + (at % code.rect.width);
          const y = code.rect.y + Math.floor(at / code.rect.width);
          if (
            frame &&
            x >= frame.x &&
            y >= frame.y &&
            x < frame.x + frame.width &&
            y < frame.y + frame.height
          ) {
            const slot =
              sheet.pixels[
                (frame.sheetY + y - frame.y) * sheet.width + frame.sheetX + x - frame.x
              ] ?? 0;
            if (slot !== 0) return slot;
          }
          return layer.pixels[y * layer.width + x] ?? 0;
        });
        expect(shown, `${prop.name} frame ${index}`).toEqual(Array.from(drawn.pixels));
      });
    }
  }, 60_000);

  it('shakes all it moves in step with the gust: one cycle, all changed as it rises', () => {
    for (const name of GUSTED) {
      expect(totalOf(propNamed(name).timeline), name).toBe(GUST_CYCLE);
      const before = new Set(
        Array.from({ length: 60 }, (_, step) => frameAt(name, GUST_AT - 60 + step)),
      );
      const blown = Array.from({ length: 30 }, (_, step) => frameAt(name, GUST_AT + step));
      expect(
        blown.some((frame) => !before.has(frame)),
        name,
      ).toBe(true);
    }
  });

  it('never flickers: its fires and the moon on the sea hold each state 20 steps at least', () => {
    for (const name of ['flame0', 'flame1', 'glitter']) {
      for (const [, steps] of propNamed(name).timeline)
        expect(steps, name).toBeGreaterThanOrEqual(20);
    }
  });

  it('sails its boat in and out past both ends of the far layer', () => {
    const width = STAGE_LAYERS.far.width * STAGE_SCALE;
    const { frames, drift } = propNamed('boat');
    if (!drift) throw new Error('boat');
    const shown = frames.filter((frame) => frame !== null);
    const left = Math.min(...shown.map(({ x }) => x));
    const right = Math.max(...shown.map(({ x, width: w }) => x + w));
    expect(left + drift.to).toBeGreaterThanOrEqual(width);
    expect(right + drift.from).toBeLessThanOrEqual(0);
  });
});
