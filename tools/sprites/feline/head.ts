/**
 * Feline's head, downsampled and hand-cleaned directly from `poing_01_garde.png` (Pack_01 & Pack_02):
 * - Two tall, pointed white cat ears on the crown (rows 0..10), the near one showing its large
 *   coral-pink inner triangle (`E`, `e`), the far one peeking out on the right with its own pink
 *   inside;
 * - A black headband (`R`, rows 9..10) across the crown at the foot of the ears, the mane
 *   (look.ts `drawMane`) bursting back from under it;
 * - Voluminous snow-white anime hair (`g`, `l`, `b`): two feathered side-locks flaring out to the
 *   left below the headband, a long pointed white cheek-lock (cols 13..18, rows 18..30) hanging
 *   down past her jaw in front of the neck, and long curved white bangs sweeping over her forehead
 *   and framing the right side of her face;
 * - A petite, delicate feminine anime face (rows 18..28) in pale porcelain skin (`H`, `L`, `B`),
 *   with a large golden-amber feline eye (`W`, `C`, `K`), two fine whisker marks on the cheek, and
 *   a small pointed chin.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '.................KK...............',
  '................KggK......KK......',
  '...............KgglEK....KglK.....',
  '..............KgglEEeK..KglEeK....',
  '.............KgglEEEeeKKglEEeK....',
  '............KbglEEEEeeeKlEEEeK....',
  '.......kkkk.kbglEEEEeeeKlEEEeK....',
  '.....kkblbbkkbglEEEeeeeKllEEbK....',
  '....kbblbblbbKblEEeeeKKbgglllbK...',
  '....kRRRRRRRRRRRRRRRRRRRRRRRRRRK..',
  '....kRRRRRRRRRRRRRRRRRRRRRRRRRRRK.',
  '.....kkkkkkssbbllgggggggggggglllbK',
  '......ksbbbllbbllgggggggggggggllbK',
  '....ksbllgggggllggggggggggggggllbK',
  '...kbbllgggggglgggggsLggggggggllbK',
  '..ksbllbbblllggggggslLlbggggggllbK',
  '...kkkkssbbllgggggsLLllgggggggllK.',
  '.....ksblllggggggslLLlgggggggglbK.',
  '....ksbllgggggglbKKKKKLLgggggllbK.',
  '.....kkkssbbllglbKWWCCKLgggglllbK.',
  '........kssbllglbKWCCCKLLLggllbk..',
  '.........ksbllglbsKKLLKLLLLgllk...',
  '.........ksbllgllBKKLLLLLLLLbk....',
  '..........ksbllglBLLLLLLLLLBk.....',
  '..........ksbllglBKKLLLLtauBk.....',
  '...........ksblglBSLLLLLLLBDO.....',
  '...........kssbllkOSBBLLBBDO......',
  '............kssblk.OODBBBDO.......',
  '.............ksblk...OODDO........',
  '..............ksk.................',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull). */
export const HEAD_CENTER: Point = { x: 17, y: 19 };

/** Rows of the stamp that are cat ears at the top: kept crisp. */
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
  // Snow-white feline hair & outer ears.
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  // Coral-pink inner cat ear triangles.
  e: EAR.base,
  E: EAR.light,
  // Black headband across the crown.
  R: BAND.deep,
  // Crisp dark outline, feline eye, whisker markings, lips and fang.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.irisLight,
  J: DETAIL.neonLight,
  a: DETAIL.lip,
  u: DETAIL.lipLight,
  t: SKIN.shadow,
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
  const rows = trailRows(expressionOf(HEAD, face), Math.round(trail * 0.25), LOOSE_HAIR_ROWS);
  stamp(canvas, headSlots(rows), HEAD_CENTER, center, angle);
}

export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
