/**
 * Feline's expressions over her head (head.ts): golden-amber feline eyes narrowing on strikes,
 * a sharp white feline fang (`T`) showing on `effort` and `kiai`, eyes shut when hurt or knocked
 * out (`hurt`, `out`).
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the feline eye: columns 17 to 22, rows 18 to 21 of the head. */
function eye(rows: readonly [string, string, string, string]): Patch {
  return { x: 17, y: 18, rows };
}

/** The feline mouth: columns 23 to 26, rows 24 to 25 of the head. */
function mouth(rows: readonly [string, string]): Patch {
  return { x: 23, y: 24, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [mouth(['Lauu', 'LLLB'])],
  effort: [eye(['KKKKKL', 'KWWCCK', 'KWCCCK', 'sKKLLK']), mouth(['MMTB', 'LLLB'])],
  kiai: [eye(['KKKKKL', 'KWWCCK', 'KCCCCK', 'sKKLLK']), mouth(['MMTO', 'MMMB'])],
  hurt: [eye(['KKKKKL', 'KLLLLK', 'KKKKKK', 'sLLLLK']), mouth(['TTTB', 'DOOB'])],
  out: [eye(['KKKKKL', 'KSSSSK', 'KKKKKK', 'sLLLLK']), mouth(['BBBB', 'LLLB'])],
  tired: [eye(['KKKKKL', 'KSSSSK', 'KKKKKK', 'sLLCCK']), mouth(['LaBB', 'LLLB'])],
};

export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
