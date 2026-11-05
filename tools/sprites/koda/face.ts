/**
 * Koda's expressions over his masked head (head.ts): his golden-amber eyes narrow or flare above
 * his armored acoustic half-mask, and on heavy strikes (`effort`, `kiai`) the jade resonator vent
 * on his mask flares bright (`J`/`C`).
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the eye: columns 18 to 23, rows 17 to 21 of the head. */
function eye(rows: readonly [string, string, string, string, string]): Patch {
  return { x: 18, y: 17, rows };
}

/** The acoustic mask vent: columns 19 to 23, rows 25 to 27 of the head. */
function maskVent(rows: readonly [string, string, string]): Patch {
  return { x: 19, y: 25, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [],
  effort: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'BWCKBB', 'LBSSBB']),
    maskVent(['RJJJR', 'RJJJR', 'RRRRR']),
  ],
  kiai: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'WWCKBB', 'LWCSBB']),
    maskVent(['JJJJJ', 'JCCCJ', 'RJJJR']),
  ],
  hurt: [
    eye(['DkkkSB', 'BBSDBB', 'BkkkkS', 'BBSkkB', 'LBBBBB']),
    maskVent(['RRRRR', 'RPPPR', 'RRRRR']),
  ],
  out: [
    eye(['DkkkSB', 'BBSBBB', 'BBSSSB', 'BkkkkB', 'LBBBBB']),
    maskVent(['PPPP?', 'PPPP?', 'PPPP?']),
  ],
  tired: [
    eye(['DkkkSB', 'BBSDBB', 'BSSSSB', 'BkkkKB', 'LBCSBB']),
    maskVent(['RRRRR', 'RJRJR', 'RRRRR']),
  ],
};

/** The head's rows with the expression of `face` written over them (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
