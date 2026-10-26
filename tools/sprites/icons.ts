/**
 * Icons of the installed game (PWA), drawn from Nayo's head (Tazz's) inside a neon ring:
 * public/icons/*.png. Run by `npm run sprites`, so they follow the head.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { HEAD_CENTER, headSlots } from './nayo/head.ts';
import { DETAIL, paletteOf } from './nayo/palette.ts';
import { encodeIndexedPng, type Rgba } from './png.ts';

const ICONS = new URL('../../public/icons/', import.meta.url);
const BACKGROUND: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };

interface Icon {
  readonly file: string;
  readonly size: number;
  /** Head pixel size, and the ring's radius, as fractions of the icon. */
  readonly zoom: number;
  readonly ring: number;
}

/** Maskable icons get cropped to a circle of 80%: everything stays inside it. */
const LIST: readonly Icon[] = [
  { file: 'icon-192.png', size: 192, zoom: 4, ring: 0.44 },
  { file: 'icon-512.png', size: 512, zoom: 11, ring: 0.44 },
  { file: 'icon-maskable-512.png', size: 512, zoom: 9, ring: 0.36 },
  { file: 'apple-touch-icon.png', size: 180, zoom: 4, ring: 0.42 },
];

async function drawIcon({ file, size, zoom, ring }: Icon): Promise<void> {
  const palette = [...paletteOf('main'), BACKGROUND];
  const background = palette.length - 1;
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
  await writeFile(new URL(file, ICONS), await encodeIndexedPng(size, size, pixels, palette));
}

export async function drawIcons(): Promise<void> {
  await mkdir(ICONS, { recursive: true });
  for (const icon of LIST) await drawIcon(icon);
}
