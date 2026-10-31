import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compactImage, rgbaAt } from '../../tools/sprites/colors';
import {
  codeIconPixels,
  iconPalette,
  ICONS_LIST,
  ICON_MASTER,
  masterIcon,
} from '../../tools/sprites/icons';
import {
  decodeIndexedPng,
  encodeIndexedPng,
  type IndexedImage,
  type Rgba,
} from '../../tools/sprites/png';
import { checkUiDrawn, loadUiDrawn } from '../../tools/sprites/ui-drawn';
import { titleVinylPng, VINYL_CELLS, VINYL_FRAMES } from '../../tools/sprites/vinyl';

const NONE: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: Rgba = { r: 0, g: 0, b: 255, a: 255 };

/** An indexed image as read back from a file, in `palette`. */
function imageOf(
  width: number,
  height: number,
  palette: readonly Rgba[],
  draw: (put: (x: number, y: number, slot: number) => void) => void = () => undefined,
): IndexedImage {
  const pixels = new Uint8Array(width * height);
  draw((x, y, slot) => {
    pixels[y * width + x] = slot;
  });
  return {
    width,
    height,
    pixels,
    colors: palette.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: palette.map(({ a }) => a),
  };
}

/** A vinyl with something drawn in every frame. */
function vinylOf(palette: readonly Rgba[], slot: number): IndexedImage {
  return imageOf(VINYL_CELLS * VINYL_FRAMES, VINYL_CELLS, palette, (put) => {
    for (let frame = 0; frame < VINYL_FRAMES; frame++) put(frame * VINYL_CELLS + 9, 9, slot);
  });
}

describe('Free palettes', () => {
  it('keep each color once, every transparent one first as the same one', () => {
    // A palette as an editor may save it: a color twice, two transparent slots.
    const image = imageOf(4, 1, [RED, NONE, RED, { ...BLUE, a: 0 }, BLUE], (put) => {
      put(0, 0, 0);
      put(1, 0, 2);
      put(2, 0, 3);
      put(3, 0, 4);
    });
    const { pixels, palette } = compactImage(image);
    expect(palette).toEqual([NONE, RED, BLUE]);
    expect([...pixels]).toEqual([1, 1, 0, 2]);
  });

  it('have no transparent color when nothing is transparent', () => {
    const { palette } = compactImage(imageOf(1, 1, [RED]));
    expect(palette).toEqual([RED]);
  });
});

describe('UI images drawn', () => {
  it('keep the title vinyl format: 8 frames of 18 px, each drawn', () => {
    expect(checkUiDrawn('vinyl', imageOf(18, 18, [NONE, RED]), 'vinyl')).toEqual([
      'vinyl: 18x18 px, expected 144x18 (8 cells of 18 px in a row)',
    ]);
    const blank = imageOf(144, 18, [NONE, RED], (put) => {
      put(9, 9, 1);
    });
    expect(checkUiDrawn('vinyl', blank, 'vinyl')).toContain('vinyl: frame 2 is empty');
    expect(checkUiDrawn('vinyl', vinylOf([NONE, RED], 1), 'vinyl')).toEqual([]);
  });

  it('take any color, the transparent ones by their alpha', () => {
    // Slot 0 opaque, slot 1 transparent: the editor's palette decides, not the slot.
    const vinyl = vinylOf([BLUE, NONE], 0);
    vinyl.pixels.fill(1);
    for (let frame = 0; frame < VINYL_FRAMES; frame++) {
      vinyl.pixels[9 * vinyl.width + frame * VINYL_CELLS + 9] = 0;
    }
    expect(checkUiDrawn('vinyl', vinyl, 'vinyl')).toEqual([]);
  });

  it('keep the icons master opaque where it is drawn, the vinyl may be half transparent', () => {
    const glass = { ...RED, a: 128 };
    const master = imageOf(ICON_MASTER, ICON_MASTER, [NONE, glass], (put) => {
      put(3, 5, 1);
    });
    expect(checkUiDrawn('icon', master, 'icon')).toEqual([
      'icon: pixel 3,5 is half transparent (only fully opaque or fully transparent)',
    ]);
    expect(checkUiDrawn('vinyl', vinylOf([NONE, glass], 1), 'vinyl')).toEqual([]);
  });

  it('refuse a file that is none of them, and find none where nothing is drawn', async () => {
    await expect(loadUiDrawn(new URL('./fixtures/drawn/', import.meta.url))).rejects.toThrow(
      'art-src/ui/sticker.png: no such image (vinyl, icon)',
    );
    expect(await loadUiDrawn(new URL('./fixtures/missing/', import.meta.url))).toEqual({});
  });

  it('give the title its vinyl in the colors drawn', async () => {
    const drawn = vinylOf([NONE, RED, RED, BLUE], 2);
    const written = await decodeIndexedPng(await titleVinylPng(drawn));
    expect(written.width).toBe(drawn.width);
    written.pixels.forEach((slot, index) => {
      expect(rgbaAt(written, slot)).toEqual(rgbaAt(drawn, drawn.pixels[index] ?? 0));
    });
  });
});

describe('Icons', () => {
  const background = iconPalette().at(-1);

  it('enlarge the master a whole number of times, centered on the background', () => {
    const master = imageOf(ICON_MASTER, ICON_MASTER, [NONE, RED, BLUE], (put) => {
      put(0, 0, 1);
      put(63, 63, 2);
    });
    for (const { size, masterZoom } of ICONS_LIST) {
      const { pixels, palette } = masterIcon(master, size, masterZoom);
      const at = (x: number, y: number) => palette[pixels[y * size + x] ?? 0];
      const offset = Math.floor((size - ICON_MASTER * masterZoom) / 2);
      // The master's corners, each a square of masterZoom pixels; the rest is the background.
      expect(at(offset, offset), `${size}`).toEqual(RED);
      expect(at(offset + masterZoom - 1, offset + masterZoom - 1)).toEqual(RED);
      expect(at(offset + masterZoom, offset)).toEqual(background);
      const far = offset + ICON_MASTER * masterZoom - 1;
      expect(at(far, far)).toEqual(BLUE);
      if (offset > 0) expect(at(offset - 1, offset)).toEqual(background);
    }
  });

  it('keep the maskable one inside the circle of 80% that launchers keep', () => {
    const maskable = ICONS_LIST.find(({ file }) => file.includes('maskable'));
    if (!maskable) throw new Error('a maskable icon');
    const half = (ICON_MASTER * maskable.masterZoom) / 2;
    expect(Math.hypot(half, half)).toBeLessThanOrEqual(0.4 * maskable.size);
  });

  it.each(ICONS_LIST.map(({ file }) => file))(
    '%s is the drawing the generator makes (npm run sprites)',
    async (file) => {
      const icon = ICONS_LIST.find((each) => each.file === file);
      if (!icon) throw new Error(file);
      const committed = readFileSync(new URL(`../../public/icons/${file}`, import.meta.url));
      const { icon: master } = await loadUiDrawn();
      const { pixels, palette } = master
        ? masterIcon(master, icon.size, icon.masterZoom)
        : { pixels: codeIconPixels(icon.size, icon.zoom, icon.ring), palette: iconPalette() };
      const generated = await encodeIndexedPng(icon.size, icon.size, pixels, palette);
      expect([...generated]).toEqual([...committed]);
    },
  );
});
