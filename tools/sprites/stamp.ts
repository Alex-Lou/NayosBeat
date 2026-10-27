/**
 * Hand-drawn pixel grids stamped into a frame: the fighters' heads (and Riff's braids). A grid
 * holds one character per pixel, mapped to palette slots by a legend; expressions are patches
 * written over it. A grid turns with the skeleton by RotSprite, so a tilted head stays clean
 * pixel art; below a small tilt it is drawn as is.
 */

import type { PixelCanvas, Point } from './raster.ts';

/** Rows written over a grid from (x, y); '?' keeps the grid's pixel. */
export interface Patch {
  readonly x: number;
  readonly y: number;
  readonly rows: readonly string[];
}

/** Palette slot of each grid character; '.' (or any character not listed) is empty. */
export type Legend = Readonly<Record<string, number | undefined>>;

/** Below this tilt (degrees), a grid is drawn upright. */
export const UPRIGHT_TOLERANCE = 20;

/** The rows of a grid with `patches` written over them. */
export function patched(rows: readonly string[], patches: readonly Patch[]): readonly string[] {
  if (patches.length === 0) return rows;
  const chars = rows.map((row) => Array.from({ length: row.length }, (_, x) => row.charAt(x)));
  for (const { x, y, rows: patch } of patches) {
    patch.forEach((line, dy) => {
      const row = chars[y + dy];
      if (!row) return;
      for (let dx = 0; dx < line.length; dx++) {
        const char = line.charAt(dx);
        if (char !== '?') row[x + dx] = char;
      }
    });
  }
  return chars.map((row) => row.join(''));
}

/** Palette slots of a grid's pixels (0: empty). */
export function slotsOf(rows: readonly string[], legend: Legend): number[][] {
  return rows.map((row) =>
    Array.from({ length: row.length }, (_, x) => legend[row.charAt(x)] ?? 0),
  );
}

/**
 * Shifts the first `loose` rows sideways, the top row by `trail`, fading toward the last loose
 * row: hair trailing behind a fast move.
 */
export function trailRows(
  rows: readonly string[],
  trail: number,
  loose: number,
): readonly string[] {
  if (trail === 0) return rows;
  return rows.map((row, y) => {
    if (y >= loose) return row;
    const shift = Math.round((trail * (loose - y)) / loose);
    if (shift === 0) return row;
    return shift > 0
      ? '.'.repeat(shift) + row.slice(0, row.length - shift)
      : row.slice(-shift) + '.'.repeat(-shift);
  });
}

/**
 * Stamps a grid of palette slots: its pixel `origin` lands on `center` (cell pixels), the
 * whole grid turned `angle` degrees clockwise on screen around it.
 */
export function stamp(
  canvas: PixelCanvas,
  grid: readonly (readonly number[])[],
  origin: Point,
  center: Point,
  angle: number,
  tolerance = UPRIGHT_TOLERANCE,
): void {
  const width = Math.max(...grid.map((row) => row.length));
  const height = grid.length;
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  // A small tilt is not worth turning the pixels: turned, the face's few pixels (the eye above
  // all) lose their shape. The grid is drawn as is; only big angles (falls, flips) turn it.
  if (Math.abs(angle) < tolerance) {
    grid.forEach((row, y) => {
      row.forEach((slot, x) => {
        if (slot !== 0) canvas.dot(cx + x - origin.x, cy + y - origin.y, slot);
      });
    });
    return;
  }
  // RotSprite: scale the grid 8 times with Scale2x (which smooths its diagonals the way a pixel
  // artist would), then sample it, turned, at the center of every destination pixel.
  const fine = scale2x(scale2x(scale2x(grid)));
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const reach = Math.ceil(Math.hypot(width, height));
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      // Back to the grid: turn the offset the other way.
      const u = origin.x + 0.5 + dx * cos + dy * sin;
      const v = origin.y + 0.5 - dx * sin + dy * cos;
      const slot = fine[Math.floor(v * 8)]?.[Math.floor(u * 8)] ?? 0;
      if (slot !== 0) canvas.dot(cx + dx, cy + dy, slot);
    }
  }
}

/** Scale2x (EPX): doubles a grid, rounding its diagonal steps instead of blurring them. */
function scale2x(grid: readonly (readonly number[])[]): number[][] {
  const width = Math.max(...grid.map((row) => row.length));
  const height = grid.length;
  const at = (x: number, y: number): number => grid[y]?.[x] ?? 0;
  const out: number[][] = Array.from({ length: height * 2 }, () => new Array<number>(width * 2));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);
      const top = out[y * 2];
      const bottom = out[y * 2 + 1];
      if (!top || !bottom) continue;
      top[x * 2] = c === a && c !== d && a !== b ? a : p;
      top[x * 2 + 1] = a === b && a !== c && b !== d ? b : p;
      bottom[x * 2] = d === c && d !== b && c !== a ? c : p;
      bottom[x * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }
  return out;
}
