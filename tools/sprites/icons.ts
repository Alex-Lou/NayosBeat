/**
 * Icons of the installed game (PWA): public/icons/*.png. Drawn from Nayo's head (Tazz's) inside a
 * neon ring, or from a master drawn by hand (art-src/ui/icon.png, see ui-drawn.ts), enlarged a
 * whole number of times so its pixels stay sharp. Run by `npm run sprites`, so they follow the
 * head or the drawing.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { paletteBuilder, rgbaAt } from './colors.ts';
import { HEAD_CENTER, headSlots } from './nayo/head.ts';
import { DETAIL, paletteOf } from './nayo/palette.ts';
import { encodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';

const ICONS = new URL('../../public/icons/', import.meta.url);
const BACKGROUND: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };

/** Pixels across the master drawn by hand. */
export const ICON_MASTER = 64;

/** The code's drawing in the master's size, as a start for the hand: the maskable proportions. */
export const MASTER_START = { size: ICON_MASTER, zoom: 1, ring: 0.36 } as const;

interface Icon {
  readonly file: string;
  readonly size: number;
  /** Head pixel size, and the ring's radius, as fractions of the icon (the code's drawing). */
  readonly zoom: number;
  readonly ring: number;
  /** Times the master is enlarged: as many as fit, whole. */
  readonly masterZoom: number;
}

/**
 * Maskable icons get cropped to a circle of 80%: everything stays inside it (the master, 256 px
 * across at ×4, has a 362 px diagonal, inside the 410 px circle).
 */
export const ICONS_LIST: readonly Icon[] = [
  { file: 'icon-192.png', size: 192, zoom: 4, ring: 0.44, masterZoom: 3 },
  { file: 'icon-512.png', size: 512, zoom: 11, ring: 0.44, masterZoom: 8 },
  { file: 'icon-maskable-512.png', size: 512, zoom: 9, ring: 0.36, masterZoom: 4 },
  { file: 'apple-touch-icon.png', size: 180, zoom: 4, ring: 0.42, masterZoom: 2 },
];

/** The palette of the code's icons: Nayo's, then the background. */
export function iconPalette(): readonly Rgba[] {
  return [...paletteOf('main'), BACKGROUND];
}

/** An icon as the code draws it, in `iconPalette()`. */
export function codeIconPixels(size: number, zoom: number, ring: number): Uint8Array {
  const background = iconPalette().length - 1;
  const pixels = new Uint8Array(size * size).fill(background);
  const center = size / 2;
  // Neon ring: bright core, deeper edges.
  const radius = size * ring;
  const width = size * 0.018;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const off = Math.abs(Math.hypot(x + 0.5 - center, y + 0.5 - center) - radius);
      if (off < width * 0.5) pixels[y * size + x] = DETAIL.neonLight;
      else if (off < width) pixels[y * size + x] = DETAIL.neon;
      else if (off < width * 1.6) pixels[y * size + x] = DETAIL.neonDeep;
    }
  }
  // The head, its center a little above the icon's, on whole pixels.
  const head = headSlots();
  const left = Math.round(center - (HEAD_CENTER.x + 0.5) * zoom);
  const top = Math.round(center - (HEAD_CENTER.y - 4) * zoom);
  head.forEach((row, hy) => {
    row.forEach((slot, hx) => {
      if (slot === 0) return;
      for (let dy = 0; dy < zoom; dy++) {
        for (let dx = 0; dx < zoom; dx++) {
          const x = left + hx * zoom + dx;
          const y = top + hy * zoom + dy;
          if (x >= 0 && y >= 0 && x < size && y < size) pixels[y * size + x] = slot;
        }
      }
    });
  });
  return pixels;
}

/**
 * An icon from the master drawn by hand: the background, and the master enlarged `zoom` times in
 * the middle, the background showing through its transparent pixels.
 */
export function masterIcon(
  master: IndexedImage,
  size: number,
  zoom: number,
): { pixels: Uint8Array; palette: readonly Rgba[] } {
  const { palette, slotOf } = paletteBuilder([BACKGROUND]);
  const pixels = new Uint8Array(size * size);
  const offset = Math.floor((size - master.width * zoom) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mx = Math.floor((x - offset) / zoom);
      const my = Math.floor((y - offset) / zoom);
      const inside = mx >= 0 && my >= 0 && mx < master.width && my < master.height;
      const color = inside
        ? rgbaAt(master, master.pixels[my * master.width + mx] ?? 0)
        : BACKGROUND;
      pixels[y * size + x] = slotOf(color.a === 0 ? BACKGROUND : color);
    }
  }
  return { pixels, palette };
}

export async function drawIcons(master?: IndexedImage): Promise<void> {
  await mkdir(ICONS, { recursive: true });
  for (const { file, size, zoom, ring, masterZoom } of ICONS_LIST) {
    const { pixels, palette } = master
      ? masterIcon(master, size, masterZoom)
      : { pixels: codeIconPixels(size, zoom, ring), palette: iconPalette() };
    await writeFile(new URL(file, ICONS), await encodeIndexedPng(size, size, pixels, palette));
  }
}
