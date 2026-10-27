/**
 * Nayo's expressions, as patches over Tazz's head (head.ts): only the brow, the eye and the
 * mouth change. He stays calm and focused, eyes open, never smiling for nothing: `focus` is the
 * head as drawn; the others tense it on blows (`effort`, `kiai`), close it when hurt or out.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the eye: columns 18 to 23, rows 17 to 21 of the head. */
function eye(rows: readonly [string, string, string, string, string]): Patch {
  return { x: 18, y: 17, rows };
}

/** The mouth: columns 19 to 23, rows 25 to 27 of the head (the jaw's edge is at 23 on row 27). */
function mouth(rows: readonly [string, string, string]): Patch {
  return { x: 19, y: 25, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  // As drawn, Tazz's own eye: short, a thick lash, the iris right under it, open on the opponent.
  focus: [],
  cool: [],
  smirk: [],
  // Brow down toward the nose, lower lid up, jaw set.
  effort: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'BJCKBB', 'LBSSBB']),
    mouth(['BBBBB', 'BDOOD', 'BBSS?']),
  ],
  // A short shout at the peak of a special: brow down, the eye wide open, mouth open.
  kiai: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'WJCKBB', 'LWCSBB']),
    mouth(['BDOOD', 'BOMMO', 'BDOO?']),
  ],
  // Eye squeezed shut (two lines closing in), teeth clenched.
  hurt: [
    eye(['DkkkSB', 'BBSDBB', 'BkkkkS', 'BBSkkB', 'LBBBBB']),
    mouth(['BBBBB', 'BOTTO', 'BDOO?']),
  ],
  // Knocked out: eye closed, mouth slack.
  out: [
    eye(['DkkkSB', 'BBSBBB', 'BBSSSB', 'BkkkkB', 'LBBBBB']),
    mouth(['BBBBB', 'BDOD?', 'BBOB?']),
  ],
  // Out of breath at the end of time: heavy lid over the iris, mouth ajar.
  tired: [
    eye(['DkkkSB', 'BBSDBB', 'BSSSSB', 'BkkkKB', 'LBCSBB']),
    mouth(['BBBBB', 'BDOD?', 'BBLL?']),
  ],
};

/** The head's rows with the expression of `face` written over them (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
