/**
 * Riff's head is the punk girl's of Zen-Tazzer: spiky blue-black hair on top, the near side
 * shaved (a stubble check over the scalp), a long magenta fringe swept over the far side and
 * down along the jaw; a sharp brow angled down toward the nose, a thick lash with a flick, a
 * blue-grey eye looking sideways at the opponent, magenta lipstick, a stud at the top of the
 * ear and a silver stud with a short drop on the lobe. Taken from her idle sprite on its own
 * pixel grid (an upscale of about 7.2 source pixels per art pixel), three rows and three columns
 * taken out where they carried the least (the hair's top edge, the forehead, the cheek under the
 * nose; the back of the hair, the temple, the fringe's tip) so that she stands at the density of
 * her body, then cleaned by hand where the downscale broke it: outlines, strays, the lash's
 * flick, the pout of the lower lip. Facing right; the jaw ends the stamp, the neck is the
 * body's. One character per pixel (legend below). Expressions are patches over it (face.ts);
 * the fringe's loose strands swing behind the motion (swayFringe); the head turns with the
 * skeleton by RotSprite beyond 20 degrees, upright below.
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '.............kkk......................',
  '.........k..kgk.......................',
  '.......kkkkkgdbkkkkkkkkkkkkk..........',
  '.......klksgllglgbllbbtutrk...........',
  '.....kkdlslgbgbggggbruurpkkkkk........',
  '..k.kbldblslbglgbgbgvtqpruvuutkk......',
  '..kkkdblsbsbsblbglguqbtuvvvttutrkk....',
  '..kblbgbbdbsssbblbtrruvvvrrqpkqqkkk...',
  '..kksllgbbkkkddsbbrsuurqtvvvutkk......',
  '.ksglslbss23321kdspqtrquvttvvvtrk.....',
  '.kglbgbd234353432dsprqutpqqrrvvuuk....',
  'kgssgls1446S4S463DOkpqrpruvvvtrruuk...',
  'kkslls143664S5S5SSDSDkskqrttvvvtpquk..',
  'kkllbs33664S565S4DSBBSSDkdqrttvvtdqrk.',
  'kslbs1364364S4S5SSBBBBBSDkkqtuquvtkkkk',
  '.ksss223534633SDOBBBBBBBBSOksqutqruk..',
  '.ksss122353455DDBBBFKKBBBSSkpptutqrk..',
  '.ksbs1223OkkDSDDBBBBBaKBBSDkpprutrrk..',
  '.kkbs123sdLBkDDBBBBBSDaKSSDkppptutkk..',
  '.kksss22kLOOBOOBBBKKKKKKKDkppqpturkk..',
  '..ksss12knSOBODBBBSKJIKKDDkpprptttkk..',
  '..kdsss2kBSODBOBBBBSJIIDSkpqprprtk.k..',
  '...ksss1kBDOBBSSBBLBBOCBBOqqpqqrtk....',
  '....ksssskBDOBBBBBBLBBBBBBdqqrqqtk....',
  '.....ksssskBNBBBBBBBBBBBBBBdrtqktk....',
  '.....kssskkmkDBBBBBBBBBBSDDkrtpkktk...',
  '.....kbssk...OBBBBBBBBBBBSpqrtk..kk...',
  '.....klbsk...OSBBBBBBBBBaakqrrk...k...',
  '....kkkkkk....OSBBBBBBBeeckqtk........',
  '...............OSBBBBBBcck.ktk........',
  '................ODBBBBBSk..krk........',
  '.................OOOSBBSO...kkk.......',
  '...................OOOOO..............',
];

/**
 * Pixel of the stamp on the skeleton's head point: at the brow's height, over the corner of the
 * jaw, so that the skull sits back over the neck and the fringe stays within her pushbox.
 */
export const HEAD_CENTER: Point = { x: 19, y: 17 };

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const STUBBLE = MATERIAL.stubble;
const FRINGE = MATERIAL.magenta;
const METAL = MATERIAL.metal;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Legend = {
  // Skin, darkest to lightest.
  O: SKIN.outline,
  D: SKIN.deep,
  S: SKIN.shadow,
  B: SKIN.base,
  L: SKIN.light,
  H: SKIN.gloss,
  // Black hair.
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  // The undercut's stubble, darkest to lightest.
  '1': STUBBLE.outline,
  '2': STUBBLE.deep,
  '3': STUBBLE.shadow,
  '4': STUBBLE.base,
  '5': STUBBLE.light,
  '6': STUBBLE.gloss,
  // The magenta fringe, darkest to lightest.
  p: FRINGE.outline,
  q: FRINGE.deep,
  r: FRINGE.shadow,
  t: FRINGE.base,
  u: FRINGE.light,
  v: FRINGE.gloss,
  // Silver earrings.
  m: METAL.deep,
  n: METAL.base,
  N: METAL.light,
  // Brow, eye, lips (and the mouth and the white of the eye for the expressions).
  K: DETAIL.ink,
  F: DETAIL.brow,
  W: DETAIL.eyeWhite,
  C: DETAIL.iris,
  J: DETAIL.irisLight,
  I: DETAIL.irisDeep,
  a: DETAIL.lipDeep,
  c: DETAIL.lip,
  e: DETAIL.lipLight,
  M: DETAIL.mouth,
  T: DETAIL.teeth,
};

/** Characters of the face (skin, eye, brow, lips): the fringe's loose strands start past them. */
const FACE = new Set('ODSBLHKFWCJIaceMT');

/** Rows of the fringe's loose strands, hanging past the face: their tips swing the most. */
const LOOSE_TOP = 14;
const LOOSE_BOTTOM = 31;
/** How far the tips may swing, in sprite pixels (a windmill or a spin swings them hard). */
const MAX_SWAY = 4;

/**
 * The fringe swung `sway` sprite pixels at its tips (positive: forward, toward the face's
 * side), its loose strands sheared row by row from none at the brow to all at the tips. A strand
 * swinging forward widens at its root (no gap opens between the fringe and the face); swinging
 * back, it slides behind the face's outline.
 */
export function swayFringe(rows: readonly string[], sway: number): readonly string[] {
  const tip = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, sway));
  if (Math.round(tip) === 0) return rows;
  return rows.map((row, y) => {
    if (y <= LOOSE_TOP || y > LOOSE_BOTTOM) return row;
    // The shear grows faster than the distance from the brow: the roots stay put, the tips (the
    // last rows, 26 to 31) swing the most, like hair rather than a block.
    const shift = Math.round(tip * ((y - LOOSE_TOP) / (LOOSE_BOTTOM - LOOSE_TOP)) ** 1.6);
    if (shift === 0) return row;
    let face = -1;
    for (let x = 0; x < row.length; x++) if (FACE.has(row.charAt(x))) face = x;
    if (face < 0) return row;
    // The fringe starts past the face and its outline.
    const root = row.charAt(face + 1) === 'k' ? face + 2 : face + 1;
    const strands = row.slice(root);
    if (!/[pqrtuv]/.test(strands)) return row;
    const moved =
      shift > 0
        ? strands.charAt(0).repeat(shift) + strands
        : strands.slice(-shift) + '.'.repeat(-shift);
    return row.slice(0, root) + moved;
  });
}

/**
 * Draws the head with the expression of `face`, its center pixel at `center` (cell pixels),
 * turned `angle` degrees clockwise on screen, the fringe's tips swung `sway` sprite pixels.
 */
export function stampHead(
  canvas: PixelCanvas,
  face: Face,
  center: Point,
  angle: number,
  sway = 0,
): void {
  stamp(canvas, headSlots(swayFringe(expressionOf(HEAD, face), sway)), HEAD_CENTER, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
