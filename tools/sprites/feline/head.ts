/**
 * Feline's head (issue #155 comment 6660565057: Apercu_Pack_02_Feline_CORRIGE.png):
 * Large, sharp triangular white cat ears with coral-pink inner triangles (`e`, `E`); a black
 * hair-tie ribbon (`R`) at the crown where her huge silver-white mane bursts out; long spiky
 * silver-white bangs framing her forehead and cheek; a delicate feminine anime profile with a large
 * golden-amber feline eye (`C`, `W`, `K`) and two feline whisker markings on the cheek.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '.............kk......kk.........',
  '............kglk....kggk........',
  '...........kblglk..klgglk.......',
  '..........ksblgelkklegllbk......',
  '......kk..kdsbleEkkeEEllbsk.....',
  '....kdbllkkdsbleEkkeeEllgbsk....',
  '...ksbllgglkRRReEkkeeEelgglbk...',
  '..kdsblllgglRRRRbllggllgglllbk..',
  '..kddssbbllggllbblllggllgglllbk.',
  '..kdssbbblllggllbblllggllggllbk.',
  '..kddssbbbbllggllbblllggllggllk.',
  '..kdddssbbbbllggllbblllggllgllk.',
  '...kdddssbbbbllggllbblllggllllk.',
  '...kddddssbbbbllggllbblllggllbk.',
  '....kddddssbbbbllgllbbbllggllbk.',
  '...kddddddssbbbllgllbbbllgllbsk.',
  '..kddddddddsdbbllgllbSBBllgllbk.',
  '..dddddddddddbllgllkSBBBllgglbk.',
  '..kddddddddddbllglkkSBBBBllgbk..',
  '..kkdddddddddbllgkdkkSBBBDlgk...',
  '..kkdddddddddsblkSkkSBBkkkSbk...',
  '...kdddddddddkblkBkkBBBWCKBBBO..',
  '...dkddddddddksbkSBSkBLLBCSBBO..',
  '....kkdddddddkblkOBBLBBBBBBBBSO.',
  '....skkddddkkksbkOBBBBBKKBBBBDO.',
  '.....kkkkddkkkkskOSBBBBBBBBBBBO.',
  '...skkkkkkkkDDkkkkDBBBBKKBBBBBO.',
  '............DDDDDDDBBBBBauBBBBO.',
  '.............DODDDBBBBLLBBBBBDO.',
  '..............DODSSBBBBBBBBDO...',
  '................OODBBBBBBDO.....',
  '..................OOOSBDO.......',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull). */
export const HEAD_CENTER: Point = { x: 15, y: 20 };

const LOOSE_HAIR_ROWS = 10;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const EAR = MATERIAL.shirt;
const BAND = MATERIAL.leather;

const LEGEND: Legend = {
  O: SKIN.outline,
  D: SKIN.deep,
  S: SKIN.shadow,
  B: SKIN.base,
  L: SKIN.light,
  H: SKIN.gloss,
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  e: EAR.base,
  E: EAR.light,
  R: BAND.base,
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
  const rows = trailRows(expressionOf(HEAD, face), Math.round(trail), LOOSE_HAIR_ROWS);
  stamp(canvas, headSlots(rows), HEAD_CENTER, center, angle);
}

export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
