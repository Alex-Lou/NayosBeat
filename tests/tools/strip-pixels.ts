import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import type { PixelCanvas } from '../../tools/sprites/raster';

/** Calls `visit` with every opaque pixel of one cell, in world pixels from the feet anchor. */
export function eachPixel(
  canvas: PixelCanvas,
  frame: number,
  visit: (x: number, y: number) => void,
): void {
  for (let row = 0; row < CELL_SIZE; row++) {
    for (let column = 0; column < CELL_SIZE; column++) {
      if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
      visit((column + 1 - ANCHOR.x) / ART_SCALE, (ANCHOR.y - row) / ART_SCALE);
    }
  }
}

/** Opaque extent of one cell, in cell pixels (bottom -1 when the cell is empty). */
export function extent(canvas: PixelCanvas, frame: number) {
  let top = CELL_SIZE;
  let bottom = -1;
  let left = CELL_SIZE;
  let right = -1;
  for (let y = 0; y < CELL_SIZE; y++) {
    for (let x = 0; x < CELL_SIZE; x++) {
      if (canvas.pixels[y * canvas.width + frame * CELL_SIZE + x] === 0) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  return { top, bottom, left, right };
}

/**
 * Farthest opaque pixel toward the opponent (or upward) within a band (of heights, or of
 * distances for `up`), over the layers of one cell, in world pixels.
 */
export function reach(
  layers: readonly PixelCanvas[],
  frame: number,
  band: { from: number; to: number },
  up: boolean,
): number {
  let best = -Infinity;
  for (const canvas of layers) {
    eachPixel(canvas, frame, (x, y) => {
      const across = up ? x : y;
      if (across < band.from || across > band.to) return;
      best = Math.max(best, up ? y : x);
    });
  }
  return best;
}
