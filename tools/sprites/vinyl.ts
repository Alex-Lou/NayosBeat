/**
 * The vinyl that stands for the O of NAYOSBEAT on the title screen (Nayo's record, the game's
 * sound): src/ui/title-vinyl.png, drawn by `npm run sprites` (with Nayo's strips).
 *
 * Pixel art at twice the title font's resolution (18 cells across 9 of the font's pixels: a
 * round letter a little taller than the square ones, so it reads as big), the resolution of the
 * fighters' detail: an orange rim, the titles' edge; the black disc and its
 * grooves; a sheen that stays put; the label in the title's yellow and orange, with its spindle
 * hole. A strip of VINYL_FRAMES frames in which only the label's cyan mark turns: the record spins
 * frame by frame (a whole pixel disc turned by CSS would break its pixels). A vinyl drawn by hand
 * (art-src/ui/vinyl.png, see ui-drawn.ts) takes its place, in the same format.
 */

import { writeFile } from 'node:fs/promises';
import { compactImage } from './colors.ts';
import { encodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';

/** Cells across the disc, and frames of one turn. */
export const VINYL_CELLS = 18;
export const VINYL_FRAMES = 8;

/** The palette, its first entry transparent (outside the disc and in its hole). */
const PALETTE = {
  none: { r: 0, g: 0, b: 0, a: 0 },
  /** The titles' orange edge (src/styles.css). */
  rim: { r: 0xe0, g: 0x7a, b: 0x22, a: 255 },
  disc: { r: 0x18, g: 0x18, b: 0x1f, a: 255 },
  groove: { r: 0x30, g: 0x30, b: 0x3c, a: 255 },
  sheen: { r: 0x6c, g: 0x6c, b: 0x84, a: 255 },
  /** The title's yellow. */
  label: { r: 0xf0, g: 0xc9, b: 0x4a, a: 255 },
  /** Nayo's neon. */
  mark: { r: 0x00, g: 0xb8, b: 0xd0, a: 255 },
} as const satisfies Record<string, Rgba>;

type Ink = keyof typeof PALETTE;
const INKS = Object.keys(PALETTE) as Ink[];

const PNG = new URL('../../src/ui/title-vinyl.png', import.meta.url);

/** The disc's own cells, its hole aside: those within its radius. */
const RADIUS = VINYL_CELLS / 2 - 0.05;
/** The label, its turning mark and its orange ring, around the spindle hole. */
export const LABEL_RADIUS = 3.35;
const LABEL_YELLOW = 2.3;
const MARK_FROM = 1.9;
const HOLE = 0.95;

function inDisc(x: number, y: number): boolean {
  const center = (VINYL_CELLS - 1) / 2;
  return (
    x >= 0 &&
    y >= 0 &&
    x < VINYL_CELLS &&
    y < VINYL_CELLS &&
    Math.hypot(x - center, y - center) <= RADIUS
  );
}

/** The ink of cell (x, y) on `frame`. */
export function vinylCell(x: number, y: number, frame: number): Ink {
  const center = (VINYL_CELLS - 1) / 2;
  const distance = Math.hypot(x - center, y - center);
  const angle = (Math.atan2(y - center, x - center) * 180) / Math.PI;
  if (!inDisc(x, y) || distance < HOLE) return 'none';
  // The rim: every cell of the disc on its edge, a closed outline.
  if (!inDisc(x + 1, y) || !inDisc(x - 1, y) || !inDisc(x, y + 1) || !inDisc(x, y - 1)) {
    return 'rim';
  }
  if (distance <= LABEL_RADIUS) {
    // The mark goes round the label, one eighth of a turn a frame, from the top.
    const mark = (frame * 360) / VINYL_FRAMES - 90;
    const off = ((angle - mark + 540) % 360) - 180;
    if (distance > MARK_FROM && Math.abs(off) < 26) return 'mark';
    return distance <= LABEL_YELLOW ? 'label' : 'rim';
  }
  // The sheen: two arcs of light that stay where the light is.
  const lit = (angle > -150 && angle < -112) || (angle > 30 && angle < 68);
  if (lit && distance > 4.25 && distance < 7.45) return 'sheen';
  if (Math.abs(distance - 5.5) < 0.35 || Math.abs(distance - 7) < 0.3) return 'groove';
  return 'disc';
}

/** The strip the code draws, its frames side by side (one pixel per cell), and its palette. */
export function vinylPixels(): { pixels: Uint8Array; palette: readonly Rgba[] } {
  const width = VINYL_CELLS * VINYL_FRAMES;
  const pixels = new Uint8Array(width * VINYL_CELLS);
  for (let frame = 0; frame < VINYL_FRAMES; frame++) {
    for (let y = 0; y < VINYL_CELLS; y++) {
      for (let x = 0; x < VINYL_CELLS; x++) {
        pixels[y * width + frame * VINYL_CELLS + x] = INKS.indexOf(vinylCell(x, y, frame));
      }
    }
  }
  return { pixels, palette: Object.values(PALETTE) };
}

/** The code's strip as an indexed PNG. */
export async function vinylPng(): Promise<Uint8Array> {
  const { pixels, palette } = vinylPixels();
  return encodeIndexedPng(VINYL_CELLS * VINYL_FRAMES, VINYL_CELLS, pixels, palette);
}

/**
 * The title's vinyl as `npm run sprites` writes it: the one drawn by hand when there is one, in
 * the smallest palette that holds its colors, the code's otherwise.
 */
export async function titleVinylPng(drawn?: IndexedImage): Promise<Uint8Array> {
  if (!drawn) return vinylPng();
  const { pixels, palette } = compactImage(drawn);
  return encodeIndexedPng(drawn.width, drawn.height, pixels, palette);
}

export async function drawVinyl(drawn?: IndexedImage): Promise<void> {
  await writeFile(PNG, await titleVinylPng(drawn));
}
