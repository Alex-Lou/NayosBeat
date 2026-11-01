import type Phaser from 'phaser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import { ART_SCALE, type FighterArt } from '../../src/art/types';
import { opaqueCount } from '../../src/render/dissolve';
import { FxPixels } from '../../src/render/fx-pixels';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { freshPixels, litPixels } from '../../src/render/luminance';
import { cellPixels, savedStrip, type FighterName, type SavedStrip } from './fx-strips';

/** RGBA pixels of a rectangle (an ImageData's shape). */
interface Rgba {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** The image of a saved strip in RGBA, as the browser decodes it. */
function decoded({ image }: SavedStrip): Rgba {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  image.pixels.forEach((slot, i) => {
    const color = image.colors[slot] ?? 0;
    data.set([color >> 16, (color >> 8) & 0xff, color & 0xff, image.alpha[slot] ?? 0], i * 4);
  });
  return { width: image.width, height: image.height, data };
}

/**
 * A scene whose effects textures are the saved strips, their frames as Phaser makes them from
 * the atlas (the cut in the image, its offset in the cell), read through a fake canvas.
 */
function sceneOf(art: FighterArt, strips: ReadonlyMap<string, SavedStrip>): Phaser.Scene {
  const stripOf = (key: string) => strips.get(key.slice(`${art.key}/fx/`.length));
  const images = new Map<SavedStrip, Rgba>();
  let drawn: { image: Rgba; x: number; y: number } = {
    image: { width: 0, height: 0, data: new Uint8ClampedArray() },
    x: 0,
    y: 0,
  };
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({
        canvas: { width: 0, height: 0 },
        drawImage: (image: Rgba, x: number, y: number) => {
          drawn = { image, x, y };
        },
        getImageData: (_x: number, _y: number, width: number, height: number): Rgba => {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let row = 0; row < height; row++) {
            const from = ((drawn.y + row) * drawn.image.width + drawn.x) * 4;
            data.set(drawn.image.data.subarray(from, from + width * 4), row * width * 4);
          }
          return { width, height, data };
        },
      }),
    }),
  });
  return {
    textures: {
      exists: (key: string) => stripOf(key) !== undefined,
      get: (key: string) => {
        const strip = stripOf(key);
        if (!strip) throw new Error(`No texture ${key}`);
        const image = images.get(strip) ?? decoded(strip);
        images.set(strip, image);
        return {
          get: (frame: number) => {
            const cut = strip.atlas.frames[String(frame)];
            if (!cut) throw new Error(`No frame ${frame} in ${key}`);
            const { frame: at, spriteSourceSize: place } = cut;
            return {
              cutX: at.x,
              cutY: at.y,
              cutWidth: at.w,
              cutHeight: at.h,
              x: place.x,
              y: place.y,
            };
          },
          getSourceImage: () => image,
        };
      },
    },
  } as unknown as Phaser.Scene;
}

/** How many of the RGBA values of `a` and `b` differ (a plain loop: big arrays compare fast). */
function differences(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let count = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) count++;
  return count;
}

/** `cut` put back at its place in a cell of `width` by `height`. */
function inCell(cut: { pixels: Rgba; x: number; y: number }, width: number, height: number) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < cut.pixels.height; row++) {
    const from = row * cut.pixels.width * 4;
    const line = cut.pixels.data.subarray(from, from + cut.pixels.width * 4);
    out.set(line, ((cut.y + row) * width + cut.x) * 4);
  }
  return out;
}

const FIGHTERS: readonly [FighterName, FighterArt][] = [
  ['nayo', NAYO],
  ['riff', RIFF],
];
const SAVED = new Map<FighterArt, Map<string, SavedStrip>>();

beforeAll(async () => {
  for (const [fighter, art] of FIGHTERS) {
    const strips = new Map<string, SavedStrip>();
    for (const sheet of Object.keys(art.fx ?? {})) {
      strips.set(sheet, await savedStrip(fighter, 'main', `fx/${sheet}`));
    }
    SAVED.set(art, strips);
  }
});

describe('FxPixels', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(FIGHTERS)(
    '%s: reads each frame of effects as its texture cuts it, the same pixels at the same place',
    (_, art) => {
      const strips = SAVED.get(art) ?? new Map<string, SavedStrip>();
      const pixels = new FxPixels(sceneOf(art, strips), art, GREYBOX_COLORS);
      let [kept, cells] = [0, 0];
      for (const [sheet, strip] of strips) {
        const { width, height } = strip.cell;
        cellPixels(strip).forEach((whole, frame) => {
          const read = pixels.of(sheet, frame);
          if (!read) throw new Error(`${sheet} ${frame} unread`);
          expect(differences(inCell(read, width, height), whole), `${sheet} ${frame}`).toBe(0);
          const cell = { width, height, data: whole };
          expect(read.count).toBe(opaqueCount(cell));
          expect(read.lit).toBe(litPixels(whole, GREYBOX_COLORS) / ART_SCALE ** 2);
          kept += read.pixels.width * read.pixels.height;
          cells += width * height;
        });
      }
      // What it keeps is the cuts, not the mostly empty cells.
      expect(kept / cells).toBeLessThan(0.4);
    },
  );

  it.each(FIGHTERS)(
    '%s: counts what a frame lights anew over the one before as it did on whole cells',
    (_, art) => {
      const strips = SAVED.get(art) ?? new Map<string, SavedStrip>();
      const pixels = new FxPixels(sceneOf(art, strips), art, GREYBOX_COLORS);
      for (const [sheet, strip] of strips) {
        const cells = cellPixels(strip);
        cells.forEach((after, to) => {
          for (const from of [to - 1, to + 1].filter((frame) => cells[frame] !== undefined)) {
            const lit = freshPixels(cells[from], after, GREYBOX_COLORS) / ART_SCALE ** 2;
            expect(pixels.lightsAnew(sheet, from, to), `${sheet} ${from}>${to}`).toBe(lit);
          }
        });
      }
    },
  );
});
