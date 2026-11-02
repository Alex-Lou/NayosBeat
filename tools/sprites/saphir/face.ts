/**
 * Saphir's expressions (docs/saphir.md §9), as patches over her head (head.ts). The mask does not
 * move: nothing reads on it but the slit of its eye, which her energy lights from inside when she
 * strains (`effort`) and blazes at the peak of a special (`kiai`). At rest a glint lingers deep in
 * both slits; hit or out, they go dark. You never know what she feels.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The eye slit: columns 19 to 21, row 12 of the head. */
function slit(row: string): Patch {
  return { x: 19, y: 12, rows: [row] };
}

/**
 * At rest, both slits glow from deep inside, the front face's and the back one's (columns 6 to 8): her
 * presence, which the game lets shine (src/render/presence.ts). Gone when she is hit or out.
 */
const GLINT: readonly Patch[] = [slit('LLL'), { x: 6, y: 12, rows: ['LLL'] }];

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  focus: GLINT,
  cool: GLINT,
  smirk: GLINT,
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
