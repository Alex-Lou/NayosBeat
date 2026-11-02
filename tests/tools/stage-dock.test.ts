import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { STAGE_COLORS } from '../../src/art/dock/colors';
import { STAGE_PROPS } from '../../src/art/dock/props';
import { STAGE_COLORS as GYM_COLORS } from '../../src/art/gym/colors';
import { STAGE_COLORS as RUE_COLORS } from '../../src/art/rue/colors';
import { brightestBackdrop } from '../../src/render/luminance';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { liftedLayers, packProps } from '../../tools/sprites/stage-props';
import { drawDock } from '../../tools/stage/dock';
import { BASS_AT, BASS_CYCLE } from '../../tools/stage/dock/mid';
import { PALETTE } from '../../tools/stage/dock/palette';

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

/** The props the club's bass shakes (docs/art/decor-dock.md §5). */
const SHAKEN = [
  'crowd0',
  'crowd1',
  'crowd2',
  'club',
  'sleeper',
  'shutter0',
  'shutter1',
  'ripple',
  'rust',
  'bouncer0',
  'bouncer1',
  'cat',
];

/** The frame a prop shows at `step` of its loop. */
function frameAt(name: string, step: number): number {
  const timeline = STAGE_PROPS.find((prop) => prop.name === name)?.timeline ?? [];
  const total = timeline.reduce((sum, [, steps]) => sum + steps, 0);
  let left = step % total;
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

describe("the code's Loading Dock (docs/art/decor-dock.md)", { timeout: 60_000 }, () => {
  const { layers, props } = drawDock();
  const lifted = liftedLayers(props, layers);

  it('is what the game shows: npm run stages installed it, its moving figures lifted off', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/dock/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, lifted[layer]), layer).toBe(-1);
    }
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/dock/props.png', import.meta.url)),
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

  it('keeps its large colors inside the backdrop the flash tables were measured over', () => {
    // Each channel at its highest among the street's and the gym's large colors: a dock color
    // past it would raise what every effect lights, and move every table (docs/flashs.md §3).
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

  it('shakes in step with the bass: every prop it moves loops over the same cycle', () => {
    for (const name of SHAKEN) {
      const prop = STAGE_PROPS.find((each) => each.name === name);
      expect(prop, name).toBeDefined();
      expect(
        prop?.timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(BASS_CYCLE);
    }
  });

  it('hits them all at once: the bass changes every one of them on its first beat', () => {
    // Each shows, in the bass's first half beat, a frame it shows nowhere in the half beat before.
    for (const name of SHAKEN) {
      const before = new Set(
        Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT - 15 + step)),
      );
      const hit = Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT + step));
      expect(
        hit.some((frame) => !before.has(frame)),
        name,
      ).toBe(true);
    }
  });
});
