/**
 * Nayo's head is Tazz's, the hero of Zen-Tazzer: spiky black hair, three-quarter face, cyan eye,
 * taken from his idle sprite on its own pixel grid and cleaned by hand, facing right. One
 * character per pixel (legend below). Expressions are patches over it (face.ts); the head turns
 * with the skeleton by RotSprite, so a tilted head stays clean pixel art.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '.................dd............',
  '.......k......ddssd............',
  '.......kbds.kdsbld.kkd.........',
  '........dbsksbsbsdbbbkkkkd.....',
  '........ksbdbbsbsbbbkdbbk......',
  '.....kkkksssssbbbbssbbsdk......',
  '.dsddkssbsdsdbbbbblllbssbbk....',
  '..dsbbbbbbbbblbbbbbbbbbbsbskkdd',
  '..kkdsbllbsbbbbbbbsblllbbskssd.',
  '...kdsblbblbllblbbbdbbgsbbbds..',
  '..ddbbbbblblbllblllbsbblbsbbd..',
  '.ksbsbssbbbblbbgblblssbblbsddsk',
  'dssdssdbbbsbbbblbbbbbkdsbbbbkkd',
  'kdkdsdsbsdbbdbbsbbdbbkkdsbsssk.',
  '..kdddsbddbskbssbsdsdDSSkssdsk.',
  '.kddddsdddsddskssdkskBBSkdskdsd',
  '.dddddddddddkdkdsdkdSBBBBkdkkds',
  '..kdddddddkkkdddddDkkkSBBDdkk..',
  '..kkddddddkBSkdkkdBBSDkkSDkk...',
  '.kkkdddddkBDOSkkSBBkkkKSBDk....',
  '...kdddddkSDOBkkBBBJCKBBBBO....',
  '...dkddddkSDSBSkBLLBCSBBBBO....',
  '....kkdddkdSOBBLBBBBBBBBBSO....',
  '....skkdkkkDBBBBBBBBBBBBDO.....',
  '.....kkkkdkkOSBBBBBBBBBBBO.....',
  '...skkkkkkkDDDBBBBBBBBBBO......',
  '............DDDBBBBBDDDBO......',
  '.............DODBBBBLLBO.......',
  '..............DODSBBBBDO.......',
  '................OODBBBDO.......',
  '..................OSDO.........',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull). */
export const HEAD_CENTER: Point = { x: 14, y: 20 };

/** Below this tilt (degrees), the head is drawn upright. */
const UPRIGHT_TOLERANCE = 20;

/** Rows of the stamp that are hair only, from the top: they trail behind fast moves. */
const LOOSE_HAIR_ROWS = 10;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Readonly<Record<string, number | undefined>> = {
  // Skin, darkest to lightest.
  O: SKIN.outline,
  D: SKIN.deep,
  S: SKIN.shadow,
  B: SKIN.base,
  L: SKIN.light,
  H: SKIN.gloss,
  // Hair.
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  // Eye and mouth.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.iris,
  J: DETAIL.irisLight,
  M: DETAIL.mouth,
  T: DETAIL.teeth,
};

/**
 * Draws the head: the stamp with the expression, its center pixel at `center` (cell pixels),
 * turned `angle` degrees clockwise on screen. `trail` (pixels, + to the right) shifts the
 * loose hair at the top, most at the tips, for follow-through on fast moves.
 */
export function stampHead(
  canvas: PixelCanvas,
  face: Face,
  center: Point,
  angle: number,
  trail = 0,
): void {
  const grid = headSlots(trailHair(expressionOf(HEAD, face), Math.round(trail)));
  const width = Math.max(...grid.map((row) => row.length));
  const height = grid.length;
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  // A small tilt is not worth turning the pixels: turned, the face's few pixels (the eye above
  // all) lose their shape. The head is drawn as is; only big angles (falls, flips) turn it.
  if (Math.abs(angle) < UPRIGHT_TOLERANCE) {
    grid.forEach((row, y) => {
      row.forEach((slot, x) => {
        if (slot !== 0) canvas.dot(cx + x - HEAD_CENTER.x, cy + y - HEAD_CENTER.y, slot);
      });
    });
    return;
  }
  // RotSprite: scale the stamp 8 times with Scale2x (which smooths its diagonals the way a pixel
  // artist would), then sample it, turned, at the center of every destination pixel.
  const fine = scale2x(scale2x(scale2x(grid)));
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const reach = Math.ceil(Math.hypot(width, height));
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      // Back to the stamp: turn the offset the other way.
      const u = HEAD_CENTER.x + 0.5 + dx * cos + dy * sin;
      const v = HEAD_CENTER.y + 0.5 - dx * sin + dy * cos;
      const slot = fine[Math.floor(v * 8)]?.[Math.floor(u * 8)] ?? 0;
      if (slot !== 0) canvas.dot(cx + dx, cy + dy, slot);
    }
  }
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return rows.map((row) =>
    Array.from({ length: row.length }, (_, x) => LEGEND[row.charAt(x)] ?? 0),
  );
}

/** Shifts the loose hair rows sideways, the top row by `trail`, fading toward the forehead. */
function trailHair(rows: readonly string[], trail: number): readonly string[] {
  if (trail === 0) return rows;
  return rows.map((row, y) => {
    if (y >= LOOSE_HAIR_ROWS) return row;
    const shift = Math.round((trail * (LOOSE_HAIR_ROWS - y)) / LOOSE_HAIR_ROWS);
    if (shift === 0) return row;
    return shift > 0
      ? '.'.repeat(shift) + row.slice(0, row.length - shift)
      : row.slice(-shift) + '.'.repeat(-shift);
  });
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
