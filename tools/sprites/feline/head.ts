/**
 * Feline's head (matching `poing_01_garde.png` from Pack_01 & Pack_02):
 * - Two tall, sharp triangular white cat ears rising high above the skull (rows 0..10), separated
 *   by a clear V-gap of sky, each with a dark outline (`K`/`k`), snow-white fur rim (`g`/`l`), and
 *   a large, vivid coral-pink inner triangle (`e`, `E`);
 * - A thick black hair-tie scrunchie (`K`/`R`) at the back-top of the skull behind the near ear,
 *   from which her high ponytail (`drawMane`) bursts up and back;
 * - Long spiky silver-white bangs and cheek-locks framing a delicate feminine anime profile with a
 *   large golden-amber feline eye (`W`, `C`, `K`), two dark feline whisker markings across her
 *   cheek, and a petite nose and chin.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '................KK.......KK.......',
  '...............KglK.....KlgK......',
  '..............KglElK...KlEglK.....',
  '.............KglEEelK.KleEEglK....',
  '............KblEEEeelKleeEEEglK...',
  '...........KblEEEEeeelKeeeEEglK...',
  '......KKKK.KblEEEEeeeKleeeEEglK...',
  '....KKRRRRKKblEEEeeeeKleeeEEglK...',
  '...KRRRRRRRRKblEEeeeKKbllggllbk...',
  '..KRRRRRRRRRKbllgggllblllgglllbk..',
  '..KRRRRRRRRKbblllgggllbbllggllbk..',
  '...KKRRRRRKsbbblllggllbblllggllk..',
  '....KKKKKddsbbbbllggllbbbllggllk..',
  '...kddddssbbbblllggllbbbllggllbk..',
  '..kdddddssbbbbllggllbbbllgglllbk..',
  '.kddddddssbbbllggllbbbllggllllbk..',
  '..kddddddssbbllgllbbbllggllgglbk..',
  '...kddddddssbllgllbSBBllggllgbk...',
  '....kddddddsdbllglkSBBBllgglbk....',
  '.....kdddddddbllglkSBBBBllgbk.....',
  '......kddddddbllgkdkkSBBBDlgk.....',
  '......kkdddddsblkSkkSBBkkkSbk.....',
  '.......kdddddkblkBkkBBBWCKBBO.....',
  '.......dkddddksbkSBSkBLLBCSBBO....',
  '........kkddddkblkOBBLBBBBBBBO....',
  '........skkddkkksbkOBBBBKKBBDO....',
  '.........kkkkdkkkkskOSBBBBBBBO....',
  '.......skkkkkkDDkkkkDBBBKKBBBO....',
  '................DDDDDDBBBauBDO....',
  '.................DODDDBBBLLDO.....',
  '..................DODSSBBBDO......',
  '....................OODBBDO.......',
  '......................OODO........',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull). */
export const HEAD_CENTER: Point = { x: 16, y: 21 };

/** Rows of the stamp that are cat ears at the top: kept crisp (only 2px max trail). */
const LOOSE_HAIR_ROWS = 4;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const EAR = MATERIAL.shirt;
const BAND = MATERIAL.leather;

const LEGEND: Legend = {
  // Skin, darkest to lightest.
  O: SKIN.outline,
  D: SKIN.deep,
  S: SKIN.shadow,
  B: SKIN.base,
  L: SKIN.light,
  H: SKIN.gloss,
  // Silver-white feline hair & outer ears.
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  // Coral-pink inner cat ear triangles.
  e: EAR.base,
  E: EAR.light,
  // Black ponytail scrunchie behind the ears.
  R: BAND.deep,
  // Crisp dark outline, feline eye, whisker markings, lips and fang.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.irisLight,
  J: DETAIL.neonLight,
  a: DETAIL.lip,
  u: DETAIL.lipLight,
  M: DETAIL.mouth,
  T: DETAIL.teeth,
};

export function stampHead(
  canvas: PixelCanvas,
  face: Face,
  center: Point,
  angle: number,
  trail = 0,
): void {
  const rows = trailRows(expressionOf(HEAD, face), Math.round(trail * 0.3), LOOSE_HAIR_ROWS);
  stamp(canvas, headSlots(rows), HEAD_CENTER, center, angle);
}

export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
