import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { packProps } from '../../tools/sprites/stage-props';
import { drawRue } from '../../tools/stage/rue';
import { drawMid } from '../../tools/stage/rue/mid';
import { PALETTE } from '../../tools/stage/rue/palette';

/** The colors of an image, pixel by pixel, as 0xRRGGBBAA. */
function colorsOf(image: IndexedImage): number[] {
  return Array.from(image.pixels, (slot) => {
    const { r, g, b, a } = rgbaAt(image, slot);
    return a === 0 ? 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  });
}

/** The first pixel where two images show different colors, -1 if none. */
function firstDifference(a: IndexedImage, b: IndexedImage): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  const left = colorsOf(a);
  const right = colorsOf(b);
  return left.findIndex((color, index) => color !== right[index]);
}

/** Hue (degrees), saturation and value (0 to 1) of a color. */
function hsv(r: number, g: number, b: number): { hue: number; saturation: number; value: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return { hue: (hue * 60 + 360) % 360, saturation: max === 0 ? 0 : delta / max, value: max / 255 };
}

describe("the code's street (docs/art/decor-rue.md)", () => {
  const { layers, props } = drawRue();

  it('is what the game shows: npm run sprites installed it', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/rue/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, layers[layer]), layer).toBe(-1);
    }
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/rue/props.png', import.meta.url)),
    );
    const packed = packProps(props, layers).sheet;
    if (!packed) throw new Error('props');
    expect(firstDifference(sheet, packed)).toBe(-1);
  });

  it('draws the same street on every run, pixel for pixel', () => {
    const again = drawMid(1440, 540).pixels;
    expect(layers.mid.pixels.every((slot, index) => slot === again[index])).toBe(true);
  });

  it('keeps the layers contract: their sizes, whole pixels, an opaque far layer, one palette', () => {
    expect(PALETTE.length).toBeLessThanOrEqual(256);
    expect(PALETTE.slice(1).every(({ a }) => a === 255)).toBe(true);
    for (const layer of STAGE_LAYER_NAMES) {
      const { width, height } = stageRulesOf(layer);
      expect([layers[layer].width, layers[layer].height], layer).toEqual([width, height]);
    }
    expect(layers.far.pixels.every((slot) => slot !== 0)).toBe(true);
  });

  it('leaves cyan and magenta to the fighters: none of its vivid colors comes near them', () => {
    // Nayo's neon #2ce8f8 and Riff's #e04a9e, by hue.
    const owned = [185, 325];
    for (const { r, g, b } of PALETTE.slice(1)) {
      const { hue, saturation, value } = hsv(r, g, b);
      if (saturation < 0.45 || value < 0.45) continue;
      for (const taken of owned) {
        const apart = Math.min(Math.abs(hue - taken), 360 - Math.abs(hue - taken));
        expect(
          apart,
          `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`,
        ).toBeGreaterThan(25);
      }
    }
  });

  it('animates its props over its still layer: frame 0 is the layer, no frame clears a pixel', () => {
    expect(props.map(({ name }) => name)).toEqual([
      'queue',
      'bouncer',
      'smoker',
      'balcony',
      'leaner',
      'curtain',
      'cat',
      'steam',
      'neon',
    ]);
    for (const { name, rect, frames } of props) {
      const [still] = frames;
      if (!still) throw new Error(name);
      const crop = still.pixels.map(
        (_, at) =>
          layers.mid.pixels[
            (rect.y + Math.floor(at / rect.width)) * layers.mid.width + rect.x + (at % rect.width)
          ] ?? 0,
      );
      expect(still.pixels, name).toEqual(crop);
    }
    // packProps throws on a frame that would have to clear the still layer.
    expect(packProps(props, layers).props).toHaveLength(props.length);
  });

  it('lays each prop frame back over the layer exactly as the code drew it', () => {
    const { props: packed, sheet } = packProps(props, layers);
    if (!sheet) throw new Error('a sheet');
    for (const prop of packed) {
      const code = props.find(({ name }) => name === prop.name);
      if (!code) throw new Error(prop.name);
      prop.frames.forEach((frame, index) => {
        const drawn = code.frames[index];
        if (!drawn) throw new Error(`${prop.name} ${index}`);
        // The still layer with the cut-out on top.
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
          return layers.mid.pixels[y * layers.mid.width + x] ?? 0;
        });
        expect(shown, `${prop.name} frame ${index}`).toEqual(Array.from(drawn.pixels));
      });
    }
  });

  it('leaves out a prop the hand drew over, and says so', () => {
    const queue = props.find(({ name }) => name === 'queue');
    if (!queue) throw new Error('queue');
    const [still, moved] = queue.frames;
    if (!still || !moved) throw new Error('queue frames');
    // A retouch of one pixel where the queue moves: another color under it.
    const inRect = moved.pixels.findIndex((slot, index) => slot !== still.pixels[index]);
    const x = queue.rect.x + (inRect % queue.rect.width);
    const y = queue.rect.y + Math.floor(inRect / queue.rect.width);
    const pixels = Uint8Array.from(layers.mid.pixels);
    const at = y * layers.mid.width + x;
    pixels[at] = pixels[at] === 1 ? 2 : 1;
    const { props: kept, dropped } = packProps(props, {
      ...layers,
      mid: { ...layers.mid, pixels },
    });
    expect(kept.map(({ name }) => name)).not.toContain('queue');
    expect(dropped).toEqual(['queue: the mid layer drawn by hand differs under it']);
  });
});
