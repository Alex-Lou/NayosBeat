/**
 * Feline's expressions over her head (head.ts): golden-amber feline eyes narrowing on strikes,
 * a sharp white feline fang (`T`) showing on `effort` and `kiai`, eyes shut when hurt or knocked
 * out (`hurt`, `out`).
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the feline eye: columns 20 to 25, rows 19 to 22 of the head. */
function eye(rows: readonly [string, string, string, string]): Patch {
  return { x: 20, y: 19, rows };
}

/** The feline mouth: columns 21 to 25, rows 27 to 28 of the head. */
function mouth(rows: readonly [string, string]): Patch {
  return { x: 21, y: 27, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [mouth(['BBauu', 'BBLBB'])],
  effort: [eye(['kkSBBD', 'kSBBkk', 'BBBWCK', 'kBLLBC']), mouth(['BMMTB', 'BDOOB'])],
  kiai: [eye(['kkkSBD', 'kSBBkk', 'BWWCCK', 'kBLLCC']), mouth(['OMMTO', 'OMMMO'])],
  hurt: [eye(['kkSBBD', 'kSBBBB', 'BkkkkS', 'kBLLBB']), mouth(['BTTTB', 'BDOOB'])],
  out: [eye(['kkSBBD', 'kSBBBB', 'BSSSSB', 'kkkkkB']), mouth(['BBBBB', 'BDOOB'])],
  tired: [eye(['kkSBBD', 'kSSSSB', 'BkkkKB', 'kBLLCB']), mouth(['BBaBB', 'BBLLB'])],
};

export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
