import { readdir, readFile } from 'node:fs/promises';
import { NAYO_CELLS } from '../../src/art/nayo/cells';
import { RIFF_CELLS } from '../../src/art/riff/cells';
import type { Cell } from '../../src/art/types';
import { decodeIndexedPng } from '../../tools/sprites/png';

/**
 * Every strip of front effects of a fighter's colorway, as the game draws them: each frame's
 * RGBA pixels (an ImageData's), read from the generated PNG.
 */
export async function fxStrips(
  fighter: 'nayo' | 'riff',
  colorway: 'main' | 'alt',
): Promise<Map<string, Uint8ClampedArray[]>> {
  const cells: Readonly<Record<string, Cell>> = fighter === 'nayo' ? NAYO_CELLS : RIFF_CELLS;
  const folder = new URL(`../../src/art/${fighter}/${colorway}/fx/`, import.meta.url);
  const strips = new Map<string, Uint8ClampedArray[]>();
  for (const file of await readdir(folder)) {
    const sheet = file.replace(/\.png$/, '');
    const cell = cells[`fx/${sheet}`];
    if (!cell) continue;
    const image = await decodeIndexedPng(new Uint8Array(await readFile(new URL(file, folder))));
    const frames = Math.round(image.width / cell.width);
    strips.set(
      sheet,
      Array.from({ length: frames }, (_, frame) => {
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
      }),
    );
  }
  return strips;
}
