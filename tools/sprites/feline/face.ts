/**
 * Feline's expressions over her head (head.ts): her big golden eye under a thick lash narrowing on
 * strikes, a white fang (`T`) on `effort` and `kiai`, the eye shut when hurt or knocked out.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The lash line and the eye: columns 20 to 25, rows 18 to 21 of the head (row 17 lash stays). */
function eye(rows: readonly [string, string, string, string]): Patch {
  return { x: 20, y: 18, rows };
}

/** The mouth: columns 27 to 29, rows 23 to 24 of the head. */
function mouth(rows: readonly [string, string]): Patch {
  return { x: 27, y: 23, rows };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [mouth(['LLL', 'LaM'])],
  effort: [eye(['KKKKKK', 'KKKCCK', 'KWcCCK', 'BKccKB']), mouth(['LLL', 'MTM'])],
  kiai: [eye(['KKKKKK', 'KWCCCK', 'KWcCCK', 'KWccKB']), mouth(['MMM', 'MTM'])],
  hurt: [eye(['KKKKKK', 'BBBBBB', 'KKKKKB', 'BBSSBB']), mouth(['LMM', 'MMD'])],
  out: [eye(['KKKKKK', 'BBBBBB', 'BBBBBB', 'KKKKKB']), mouth(['LLL', 'LLD'])],
  tired: [eye(['KKKKKK', 'KKKKKK', 'KWcCCK', 'BKccKB']), mouth(['LLL', 'LMD'])],
};

export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
