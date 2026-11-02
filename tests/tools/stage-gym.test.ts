import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { STAGE_PROPS } from '../../src/art/gym/props';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { liftedLayers, packProps } from '../../tools/sprites/stage-props';
import { drawGym } from '../../tools/stage/gym';
import { TRAIN_CYCLE } from '../../tools/stage/gym/mid';
import { PALETTE } from '../../tools/stage/gym/palette';

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

describe("the code's Viaduct Gym (docs/art/decor-gym.md)", { timeout: 60_000 }, () => {
  const { layers, props } = drawGym();
  const lifted = liftedLayers(props, layers);

  it('is what the game shows: npm run stages installed it, its moving figures lifted off', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/gym/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, lifted[layer]), layer).toBe(-1);
    }
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/gym/props.png', import.meta.url)),
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

  it('lays each frame of its props over the layer installed exactly as the code drew it', () => {
    const { props: packed, sheet } = packProps(props, layers);
    if (!sheet) throw new Error('a sheet');
    for (const prop of packed) {
      const code = props.find(({ name }) => name === prop.name);
      if (!code) throw new Error(prop.name);
      // The layer as the game shows it under this prop: the others laid on it at their first frame.
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

  it('shakes in step with its train: every prop the train moves loops over the same cycle', () => {
    const length = (name: string) =>
      STAGE_PROPS.find((prop) => prop.name === name)?.timeline.reduce(
        (sum, [, steps]) => sum + steps,
        0,
      );
    for (const name of ['train', 'swing0', 'swing1', 'dust0', 'dust1', 'dust2']) {
      expect(length(name), name).toBe(TRAIN_CYCLE);
    }
  });

  it('never flickers faster than 3 times a second: its failing tube holds each state 20 steps', () => {
    const flicker = STAGE_PROPS.find(({ name }) => name === 'flicker');
    expect(
      Math.min(...(flicker?.timeline.map(([, steps]) => steps) ?? [0])),
    ).toBeGreaterThanOrEqual(20);
  });
});
