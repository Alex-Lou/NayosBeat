/**
 * Koda's head: anime-fighter / Guilty Gear / BlazBlue style high-resolution pixel art. Long,
 * dramatic emerald-green spikes swept back and upward in layered locks, a dark martial headband
 * across the brow with a glowing jade gem, sculpted three-quarter face, piercing cyan-ice eyes.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '..kk.....kddk.....kddk.........',
  '..dbk...ksllsk...ksgglk........',
  '..sblk.kdblglbk.ksbgglbk.......',
  '..kdblbksblgglbksbbggllbk......',
  '..ksbllbbllggllbbllgglbsk......',
  '..kdsbllbbllggllbblllbbsdk.....',
  '..kdsbblllbllgllbblllbbsdk.....',
  '..kdsbbbblllbllgllbbllbbsdk....',
  '..dbllllbbllbbgllbblllbblllbbsk',
  '..kddssbllbllbblllblllgbbbssdk.',
  '..dssbbllblbbllbbllbllbbssdk...',
  '..sbsssbbllbbllgllbbllbbssdd...',
  '..dssbssbbbllbbllbblllbbssddk..',
  '..kddssbbbbllbbllbbllbbbsddk...',
  '...kddssdbbbllbllbbllbbssdk....',
  '..kddddsddRRRRRRRRRRRRJJkssk...',
  '..ddddsdddRRRRRRRRRRRRJJkdsddk.',
  '..dddddddddkdkdsdkdSBBBBkdkk...',
  '..kdddddddkkkdddddDkkkSBBDdk...',
  '..kkddddddkBSkdkkdBBSDkkSDkk...',
  '..kkdddddkBDOSkkSBBkkkKSBDk....',
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
const LOOSE_HAIR_ROWS = 12;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const BAND = MATERIAL.leather;

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
  // Headband across the brow.
  R: BAND.base,
  // Eye, mouth and headband gem.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.iris,
  J: DETAIL.neonLight,
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
