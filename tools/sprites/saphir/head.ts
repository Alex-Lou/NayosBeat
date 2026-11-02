/**
 * Saphir's head, drawn from scratch (docs/art/perso-3.md §2.4: no source): a full-head Janus
 * mask in sapphire lacquer. At the front, a face sculpted in planes, lit by the key light: a
 * brow ridge, a slit for the eye, closed lips, a tear painted from the slit down the cheek. At
 * the back, its twin looking the other way, in shade but caught by a cool rim light from
 * behind: its brow, the deep socket and slit, the nose, the lips, the chin, each with its glint,
 * and its own painted tear. A groove engraved from the crown to the jaw joins the two faces. A
 * high black ponytail falls out of the crown, clear of the back face. One character per pixel
 * (legend below). The mask is rigid: it turns with the head and never
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
  '..kdbblk...7xx00xx7...........',
  '.kdbbk..7x098700xxxx7.........',
  '.kdbk..7x09987000xxxxx7.......',
  'kdbk..7x09988700xxxxxx7.......',
  'kdk..7x0999887000xxxxxx7......',
  'kdk..7x0999887000xxxxxx7......',
  '....7x0999988700xxxxxxx7......',
  '...7yx09998887000xxxyyyy7.....',
  '....7x8889988700xx999997......',
  '....7xKKK8988700xxxKKK77......',
  '....7x0W09988700xxxxxWx7......',
  '...7xx0W099887000xxyyWxx7.....',
  '..7yx00W9998870000xxxWxxxx....',
  '..7x809999988700000xxxx9x07...',
  '....7988999887000xxxxxx87.....',
  '...7yx99999887000xxxx8887.....',
  '.....7x89998870000xxxxxx7.....',
  '......7x099887900xxxxxx7......',
  '.......7x098879900xxxxx7......',
  '..........7x879900xxxx7.......',
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
 * turned `angle` degrees clockwise on screen; mirrored when her body is turned round
 * (Skeleton.turned): the Janus mask still shows a face to the opponent, the ponytail swings to
 * the other side.
 */
export function stampHead(
  canvas: PixelCanvas,
  face: Face,
  center: Point,
  angle: number,
  turned = false,
): void {
  const slots = headSlots(expressionOf(HEAD, face));
  if (!turned) {
    stamp(canvas, slots, HEAD_CENTER, center, angle);
    return;
  }
  const width = Math.max(...slots.map((row) => row.length));
  const mirrored = slots.map((row) =>
    [...row, ...Array<number>(width - row.length).fill(0)].reverse(),
  );
  stamp(canvas, mirrored, { x: width - 1 - HEAD_CENTER.x, y: HEAD_CENTER.y }, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
