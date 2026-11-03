/**
 * The checks every stage the code draws must pass (docs/art/passation-decors.md §4), shared by the
 * stages' contract tests from the club on: what the game shows is what the code drew, the layers'
 * contract, the flashes' envelope, the fighters' hues, the cleanliness (docs/art/proprete.md), each
 * prop's frames laid back exactly. Each stage's own test adds what is its own.
 */

import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { STAGE_COLORS as GYM_COLORS } from '../../src/art/gym/colors';
import { STAGE_COLORS as RUE_COLORS } from '../../src/art/rue/colors';
import { brightestBackdrop } from '../../src/render/luminance';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage, type Rgba } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { liftedLayers, packProps } from '../../tools/sprites/stage-props';
import { FIGHTERS_ROWS, MOST_NOISE, noiseOf } from '../../tools/stage/kit/clean';
import type { CodeStage } from '../../tools/stage/kit/stage';

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

/** A stage as its contract test sees it. */
export interface StageUnderTest {
  /** Its folder: src/art/<name>/. */
  readonly name: string;
  readonly drawn: CodeStage;
  readonly palette: readonly Rgba[];
  /** Its large colors, atmosphere by atmosphere (src/art/<name>/colors.ts). */
  readonly colors: Readonly<Record<string, readonly number[]>>;
}

/** Declares the shared checks of `stage`, inside its test's `describe`. */
export function stageContract({ name, drawn, palette, colors }: StageUnderTest): void {
  const { layers, props } = drawn;
  const lifted = liftedLayers(props, layers);

  it('is what the game shows: npm run stages installed it', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/${name}/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, lifted[layer]), layer).toBe(-1);
    }
    const packed = packProps(props, layers).sheet;
    if (!packed) return;
    const sheet = await decodeIndexedPng(
      await readFile(new URL(`../../src/art/${name}/props.png`, import.meta.url)),
    );
    expect(firstDifference(sheet, packed)).toBe(-1);
    // No prop left out: the layers are the code's own.
    expect(packProps(props, layers).dropped).toEqual([]);
  });

  it('keeps the layers contract: their sizes, an opaque far layer, one palette', () => {
    expect(palette.length).toBeLessThanOrEqual(256);
    expect(palette.slice(1).every(({ a }) => a === 255)).toBe(true);
    for (const layer of STAGE_LAYER_NAMES) {
      const { width, height } = stageRulesOf(layer);
      expect([lifted[layer].width, lifted[layer].height], layer).toEqual([width, height]);
    }
    expect(lifted.far.pixels.every((slot) => slot !== 0)).toBe(true);
  });

  it('keeps its large colors inside the backdrop the flash tables were measured over', () => {
    const before = brightestBackdrop(
      [RUE_COLORS, GYM_COLORS].flatMap((each) => Object.values(each).flat()),
    );
    for (const [atmosphere, large] of Object.entries(colors)) {
      for (const color of large) {
        for (const shift of [16, 8, 0]) {
          expect(
            (color >> shift) & 0xff,
            `${atmosphere} ${color.toString(16)}`,
          ).toBeLessThanOrEqual((before >> shift) & 0xff);
        }
      }
    }
  });

  it('leaves cyan and magenta to the fighters: none of its vivid colors comes near them', () => {
    for (const { r, g, b } of palette.slice(1)) {
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
    if (!sheet) return;
    for (const prop of packed) {
      const code = props.find((each) => each.name === prop.name);
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
        const drawnFrame = code.frames[index];
        if (!drawnFrame) throw new Error(`${prop.name} ${index}`);
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
        expect(shown, `${prop.name} frame ${index}`).toEqual(Array.from(drawnFrame.pixels));
      });
    }
  }, 60_000);
}
