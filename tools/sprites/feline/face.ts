/**
 * Feline's expressions over her head (head.ts): golden-amber feline eyes narrowing on strikes,
 * a sharp white feline fang (`T`) showing on `effort` and `kiai`, eyes shut when hurt or knocked
 * out (`hurt`, `out`).
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the feline eye: columns 20 to 25, rows 20 to 23 of the head. */
function eye(rows: readonly [string, string, string, string]): Patch {
  return { x: 20, y: 20, rows };
}

/** The feline mouth: columns 22 to 26, rows 28 to 29 of the head. */
function mouth(rows: readonly [string, string]): Patch {
  return { x: 22, y: 28, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [mouth(['BBauu', 'BBLBD'])],
  effort: [eye(['kkSBBD', 'kSBBkk', 'BBBWCK', 'kBLLBC']), mouth(['BMMTB', 'BDOOD'])],
  kiai: [eye(['kkkSBD', 'kSBBkk', 'BWWCCK', 'kBLLCC']), mouth(['OMMTO', 'OMMMD'])],
  hurt: [eye(['kkSBBD', 'kSBBBB', 'BkkkkS', 'kBLLBB']), mouth(['BTTTB', 'BDOOD'])],
  out: [eye(['kkSBBD', 'kSBBBB', 'BSSSSB', 'kkkkkB']), mouth(['BBBBB', 'BDOOD'])],
  tired: [eye(['kkSBBD', 'kSSSSB', 'BkkkKB', 'kBLLCB']), mouth(['BBaBB', 'BBLLD'])],
};

export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
