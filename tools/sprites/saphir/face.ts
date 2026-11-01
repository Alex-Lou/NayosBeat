/**
 * Saphir's expressions (docs/saphir.md §9), as patches over her head (head.ts). The mask does not
 * move: nothing reads on it but the slit of its eye, which her energy lights from inside when she
 * strains (`effort`) and blazes at the peak of a special (`kiai`). Every other face is the mask
 * as drawn: you never know what she feels.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The eye slit: columns 19 to 21, row 12 of the head. */
function slit(row: string): Patch {
  return { x: 19, y: 12, rows: [row] };
}

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: [],
  cool: [],
  smirk: [],
  // A glint of her energy behind the slit.
  effort: [slit('KGK')],
  // The slit blazes.
  kiai: [slit('GgG')],
  hurt: [],
  out: [],
  tired: [],
};

/** The head's rows with the expression of `face` written over them (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
