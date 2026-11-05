/**
 * Koda's head: BlazBlue / Guilty Gear / Street Fighter inspired anime martial-artist.
 * Swept-back and forward-framing emerald-green hair spikes with a long temple lock hanging past
 * the cheek; a dark martial headband with a glowing jade gem; piercing golden-amber eyes (`C`);
 * and a sleek dark-steel & leather lower face mask / acoustic respirator (`P`, `R`, `A`) with a
 * glowing jade resonator slit (`J`) across the cheek and jaw. Zero shared face pixels with Nayo.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, trailRows, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '....kk....kddk.....kddk.........',
  '...dbk..ksllsk...ksgglk.........',
  '..sblk.kdblglbk.ksbgglbk..kdk...',
  '..kdblbksblgglbksbbggllbkksblk..',
  '..ksbllbbllggllbbllgglbskdbllbk.',
  '..kdsbllbbllggllbblllbbsdkbgglbk',
  '..kdsbblllbllgllbblllbbsdkblgglk',
  '..kdsbbbblllbllgllbbllbbsdkbllbk',
  '..dbllllbbllbbgllbblllbblllbbsk.',
  '..kddssbllbllbblllblllgbbbssdk..',
  '..dssbbllblbbllbbllbllbbssdk....',
  '..sbsssbbllbbllgllbbllbbssddk...',
  '..dssbssbbbllbbllbblllbbssddk...',
  '..kddssbbbbllbbllbbllbbbsddk....',
  '...kddssdbbbllbllbbllbbssdk.....',
  '..kddddsddRRRRRRRRRRRRJJkssk....',
  '..ddddsdddRRRRRRRRRRRRJJkdsddk..',
  '..dddddddddkblbsdkdSBBBBkdbbk...',
  '..kdddddddkbllldDkkkkSBBDdbk....',
  '..kkddddddkbllkdkkdBBSDkkSDk....',
  '..kkdddddkbslbSkkSBBkkkKSBDk....',
  '...kdddddkdblkBkkBBBWCKBBBBO....',
  '...dkddddksbkSBSkBLLBCSBBBBO....',
  '....kkdddkdkOBBLBBBBAAAAAPPO....',
  '....skkdkkkOPPPPPPPPAPPPPPPO....',
  '.....kkkkdkkOPPRRRRRJJRRRPPO....',
  '...skkkkkkkDDPPRRRRRJJRRRPPO....',
  '............DDPPPRRRRRRRPPO.....',
  '.............DOPPPAAPPPPPO......',
  '..............DODPPPPPPPO.......',
  '................OOPPPPPO........',
  '..................OPPO..........',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull). */
export const HEAD_CENTER: Point = { x: 14, y: 20 };

/** Rows of the stamp that are hair only, from the top: they trail behind fast moves. */
const LOOSE_HAIR_ROWS = 12;

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const BAND = MATERIAL.leather;
const MASK = MATERIAL.plastic;
const SILVER = MATERIAL.metal;

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
  // Headband and armored acoustic half-mask.
  R: BAND.base,
  P: MASK.base,
  A: SILVER.light,
  // Eye and glowing jade resonator gem/slit.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.irisLight,
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
