import { readdir, readFile } from 'node:fs/promises';
import { NAYO_CELLS } from '../../src/art/nayo/cells';
import { RIFF_CELLS } from '../../src/art/riff/cells';
import { ART_SCALE, type Cell } from '../../src/art/types';
import { decodeIndexedPng } from '../../tools/sprites/png';

type Fighter = 'nayo' | 'riff';
type Colorway = 'main' | 'alt';

function cellsOf(fighter: Fighter): Readonly<Record<string, Cell>> {
  return fighter === 'nayo' ? NAYO_CELLS : RIFF_CELLS;
}

/** Each frame of the strip in `file`, cut by `cell`: its RGBA pixels (an ImageData's). */
async function framesOf(file: URL, cell: Cell): Promise<Uint8ClampedArray[]> {
  const image = await decodeIndexedPng(new Uint8Array(await readFile(file)));
  const frames = Math.round(image.width / cell.width);
  return Array.from({ length: frames }, (_, frame) => {
    const rgba = new Uint8ClampedArray(cell.width * cell.height * 4);
    for (let y = 0; y < cell.height; y++) {
      for (let x = 0; x < cell.width; x++) {
        const slot = image.pixels[y * image.width + frame * cell.width + x] ?? 0;
        const color = image.colors[slot] ?? 0;
        const i = (y * cell.width + x) * 4;
        rgba.set([color >> 16, (color >> 8) & 0xff, color & 0xff, image.alpha[slot] ?? 0], i);
      }
    }
    return rgba;
  });
}

/**
 * Every strip of front effects of a fighter's colorway, as the game draws them: each frame's
 * RGBA pixels (an ImageData's), read from the generated PNG.
 */
export async function fxStrips(
  fighter: Fighter,
  colorway: Colorway,
): Promise<Map<string, Uint8ClampedArray[]>> {
  const cells = cellsOf(fighter);
  const folder = new URL(`../../src/art/${fighter}/${colorway}/fx/`, import.meta.url);
  const strips = new Map<string, Uint8ClampedArray[]>();
  for (const file of await readdir(folder)) {
    const sheet = file.replace(/\.png$/, '');
    const cell = cells[`fx/${sheet}`];
    if (!cell) continue;
    strips.set(sheet, await framesOf(new URL(file, folder), cell));
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
  fighter: Fighter,
  colorway: Colorway,
  sheet: string,
): Promise<Int16Array[]> {
  const cell = cellsOf(fighter)[sheet];
  if (!cell) throw new Error(`No cell for ${fighter}/${sheet}`);
  const file = new URL(`../../src/art/${fighter}/${colorway}/${sheet}.png`, import.meta.url);
  const { width, height, anchor } = cell;
  return (await framesOf(file, cell)).map((rgba) => {
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
