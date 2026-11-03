/**
 * How the bust of the select screen is framed (drawn.ts `portraitRules`): the square around the
 * head, enlarged twice, the start of a portrait drawn by hand (aseprite-template.ts).
 */

import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import { PORTRAIT_SIZE } from './drawn.ts';
import type { Point } from './raster.ts';

/**
 * The square of the cell a portrait shows, in sprite pixels, enlarged twice: about the framing of
 * the select tiles' squares (56 and 58 px), at twice their detail.
 */
const SOURCE = PORTRAIT_SIZE / 2;

/**
 * The portrait's square of the first cell of a strip's pixels (`width` wide, CELL_SIZE high):
 * centred on `head` (world pixels from the feet anchor), the head a little above the middle, each
 * pixel enlarged twice. What falls outside the cell stays empty.
 */
export function bustOf(pixels: Uint8Array, width: number, head: Point): Uint8Array {
  const left = Math.round(ANCHOR.x + head.x * ART_SCALE - SOURCE / 2);
  const top = Math.round(ANCHOR.y - head.y * ART_SCALE - SOURCE * 0.45);
  const zoom = PORTRAIT_SIZE / SOURCE;
  const bust = new Uint8Array(PORTRAIT_SIZE * PORTRAIT_SIZE);
  for (let y = 0; y < PORTRAIT_SIZE; y++) {
    for (let x = 0; x < PORTRAIT_SIZE; x++) {
      const cx = left + Math.floor(x / zoom);
      const cy = top + Math.floor(y / zoom);
      if (cx < 0 || cy < 0 || cx >= CELL_SIZE || cy >= CELL_SIZE) continue;
      bust[y * PORTRAIT_SIZE + x] = pixels[cy * width + cx] ?? 0;
    }
  }
  return bust;
}
