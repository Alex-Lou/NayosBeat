import { readdir, readFile } from 'node:fs/promises';
import { NAYO_CELLS } from '../../src/art/nayo/cells';
import { RIFF_CELLS } from '../../src/art/riff/cells';
import { ART_SCALE, type Atlas, type Cell } from '../../src/art/types';
import { cellReader } from '../../tools/sprites/atlas';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';

export type FighterName = 'nayo' | 'riff';
export type ColorwayName = 'main' | 'alt';

/** A strip as `npm run sprites` saves it: its image, its atlas and its cropped cell. */
export interface SavedStrip {
  readonly image: IndexedImage;
  readonly atlas: Atlas;
  readonly cell: Cell;
}

/** Strip `strip` ('idle', 'fx/idle') of a fighter's colorway, read from src/art. */
export async function savedStrip(
  fighter: FighterName,
  colorway: ColorwayName,
  strip: string,
): Promise<SavedStrip> {
  const cells: Readonly<Record<string, Cell>> = fighter === 'nayo' ? NAYO_CELLS : RIFF_CELLS;
  const cell = cells[strip];
  if (!cell) throw new Error(`${fighter} has no cell ${strip}`);
  const file = new URL(`../../src/art/${fighter}/${colorway}/${strip}`, import.meta.url).href;
  const image = await decodeIndexedPng(await readFile(new URL(`${file}.png`)));
  const atlas = JSON.parse(await readFile(new URL(`${file}.json`), 'utf8')) as Atlas;
  return { image, atlas, cell };
}

/**
 * Every frame of a saved strip in its whole cell, as the game draws it: its RGBA pixels (an
 * ImageData's), put back in the cell through its atlas.
 */
export function cellPixels({ image, atlas, cell }: SavedStrip): Uint8ClampedArray[] {
  const slot = cellReader(image, atlas);
  return Object.keys(atlas.frames).map((_, frame) => {
    const rgba = new Uint8ClampedArray(cell.width * cell.height * 4);
    for (let y = 0; y < cell.height; y++) {
      for (let x = 0; x < cell.width; x++) {
        const at = slot(frame, x, y);
        const color = image.colors[at] ?? 0;
        const i = (y * cell.width + x) * 4;
        rgba.set([color >> 16, (color >> 8) & 0xff, color & 0xff, image.alpha[at] ?? 0], i);
      }
    }
    return rgba;
  });
}

/**
 * Every strip of front effects of a fighter's colorway, as the game draws them: each frame's
 * RGBA pixels in its cell, read from the generated image and its atlas.
 */
export async function fxStrips(
  fighter: FighterName,
  colorway: ColorwayName,
): Promise<Map<string, Uint8ClampedArray[]>> {
  const folder = new URL(`../../src/art/${fighter}/${colorway}/fx/`, import.meta.url);
  const strips = new Map<string, Uint8ClampedArray[]>();
  for (const file of await readdir(folder)) {
    if (!file.endsWith('.png')) continue;
    const sheet = file.replace(/\.png$/, '');
    strips.set(sheet, cellPixels(await savedStrip(fighter, colorway, `fx/${sheet}`)));
  }
  return strips;
}

/**
 * The planche pixels the 1 px outline of each frame of a body strip covers (sprite-fighter-view.ts:
 * the body, filled, drawn a world pixel each way, under it): the body moved ART_SCALE planche
 * pixels up, down, left and right, less the body itself. Each as x, y from the strip's anchor, in
 * turn (its area: half its length, over ART_SCALE²).
 */
export async function outlineRings(
  fighter: FighterName,
  colorway: ColorwayName,
  sheet: string,
): Promise<Int16Array[]> {
  const strip = await savedStrip(fighter, colorway, sheet);
  const { width, height, anchor } = strip.cell;
  return cellPixels(strip).map((rgba) => {
    const body = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < width && y < height && (rgba[(y * width + x) * 4 + 3] ?? 0) > 0;
    const ring: number[] = [];
    for (let y = -ART_SCALE; y < height + ART_SCALE; y++) {
      for (let x = -ART_SCALE; x < width + ART_SCALE; x++) {
        if (body(x, y)) continue;
        const near =
          body(x - ART_SCALE, y) ||
          body(x + ART_SCALE, y) ||
          body(x, y - ART_SCALE) ||
          body(x, y + ART_SCALE);
        if (near) ring.push(x - anchor.x, y - anchor.y);
      }
    }
    return Int16Array.from(ring);
  });
}
