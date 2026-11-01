/**
 * Saphir's head, drawn from scratch (docs/art/perso-3.md §2.4: no source): a full-head mask in
 * sapphire lacquer. At the front, a face sculpted in planes, a brow ridge, a slit for the eye,
 * closed lips, a tear painted from the slit down the cheek; at the back, another face painted
 * on it, an open eye and a smile, looking the other way. A seam runs between the two from the
 * crown to the jaw. A black ponytail falls out of the crown, behind the painted face. One
 * character per pixel (legend below). The mask is rigid: it turns with the head and never
 * swings. Expressions are patches over it (face.ts); the head turns with the skeleton by
 * RotSprite beyond 20 degrees, upright below.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '........kdbblk................',
  '.....kdblbbyxk................',
  '...kdbblbbx0777777............',
  '..kdbblk...79900xx7...........',
  '.kdbbk..78990800xxxx7.........',
  '.kdbk..7899908000xxxxx7.......',
  'kdbk..7899900800xxxxxx7.......',
  'kdk..789999008000xxxxxx7......',
  'kdk..789999008000xxxxxx7......',
  '....799999000800xxxxxxx7......',
  '...7y899990008000xxxyyyy7.....',
  '....799999900800xx999997......',
  '....79KKK9000800xxxKKK77......',
  '....799W99000800xxxxxWx7......',
  '...7x89W990008000xxyyWxx7.....',
  '..7y88899990080000xxxWxxxx....',
  '..7x898899990800000xxxx9x07...',
  '....7888999908000xxxxxx87.....',
  '...7x889999008000xxxx8887.....',
  '.....7989999080000xxxxxx7.....',
  '......79888998900xxxxxx7......',
  '.......79888989900xxxxx7......',
  '..........78899900xxxx7.......',
  '.............78990xx7.........',
  '...............OBBBO..........',
  '...............OBBBO..........',
];

/** Pixel of the stamp on the skeleton's head point: the middle of the skull. */
export const HEAD_CENTER: Point = { x: 15, y: 14 };

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const MASK = MATERIAL.mask;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Legend = {
  // The neck under the jaw.
  O: SKIN.outline,
  B: SKIN.base,
  // The ponytail.
  k: HAIR.outline,
  d: HAIR.deep,
  b: HAIR.base,
  l: HAIR.light,
  // The mask, darkest to lightest.
  '7': MASK.outline,
  '8': MASK.deep,
  '9': MASK.shadow,
  '0': MASK.base,
  x: MASK.light,
  y: MASK.gloss,
  // The slit and the paint.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  I: DETAIL.irisDeep,
  // The slit lit by her energy (face.ts).
  G: DETAIL.sound,
  g: DETAIL.soundLight,
};

/**
 * Draws the head with the expression of `face`, its center pixel at `center` (cell pixels),
 * turned `angle` degrees clockwise on screen.
 */
export function stampHead(canvas: PixelCanvas, face: Face, center: Point, angle: number): void {
  stamp(canvas, headSlots(expressionOf(HEAD, face)), HEAD_CENTER, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
