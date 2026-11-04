/**
 * Koda's expressions, as patches over his head (head.ts): only the brow, the eye and the mouth
 * change. Calm and focused in his guard (`focus`), tense on strikes (`effort`, `kiai`), eyes
 * shut when hurt or knocked out (`hurt`, `out`), heavy-lidded at time over (`tired`).
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the eye: columns 18 to 23, rows 17 to 21 of the head. */
function eye(rows: readonly [string, string, string, string, string]): Patch {
  return { x: 18, y: 17, rows };
}

/** The mouth: columns 19 to 23, rows 25 to 27 of the head. */
function mouth(rows: readonly [string, string, string]): Patch {
  return { x: 19, y: 25, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [],
  effort: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'BJCKBB', 'LBSSBB']),
    mouth(['BBBBB', 'BDOOD', 'BBSS?']),
  ],
  kiai: [
    eye(['DkkkkS', 'BBSkkk', 'BkkkKS', 'WJCKBB', 'LWCSBB']),
    mouth(['BDOOD', 'BOMMO', 'BDOO?']),
  ],
  hurt: [
    eye(['DkkkSB', 'BBSDBB', 'BkkkkS', 'BBSkkB', 'LBBBBB']),
    mouth(['BBBBB', 'BOTTO', 'BDOO?']),
  ],
  out: [
    eye(['DkkkSB', 'BBSBBB', 'BBSSSB', 'BkkkkB', 'LBBBBB']),
    mouth(['BBBBB', 'BDOD?', 'BBOB?']),
  ],
  tired: [
    eye(['DkkkSB', 'BBSDBB', 'BSSSSB', 'BkkkKB', 'LBCSBB']),
    mouth(['BBBBB', 'BDOD?', 'BBLL?']),
  ],
};

/** The head's rows with the expression of `face` written over them (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
