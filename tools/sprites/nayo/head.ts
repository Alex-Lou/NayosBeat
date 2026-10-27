/**
 * Nayo's head is Tazz's, the hero of Zen-Tazzer: spiky black hair, three-quarter face, cyan eye,
 * taken from his idle sprite on its own pixel grid and cleaned by hand, facing right. One
 * character per pixel (legend below). Expressions are patches over it (face.ts); the head turns
 * with the skeleton by RotSprite, so a tilted head stays clean pixel art.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
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

/** Rows of the stamp that are hair only, from the top: they trail behind fast moves. */
const LOOSE_HAIR_ROWS = 10;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Legend = {
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
  const rows = trailRows(expressionOf(HEAD, face), Math.round(trail), LOOSE_HAIR_ROWS);
  stamp(canvas, headSlots(rows), HEAD_CENTER, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
