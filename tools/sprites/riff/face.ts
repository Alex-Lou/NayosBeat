/**
 * Riff's expressions, as patches over her head (head.ts): only the brow, the eye and the mouth
 * change. `focus` is the head as drawn: eye wide open on the opponent, brow up, mouth closed,
 * no grin. The mischief lives in `smirk` (a cocky brow, a smug lower lid, one mouth corner up:
 * her taunts) and `cool` (the victory wink); the others tense or close the eye on blows.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** The brow and the eye: columns 23 to 28, rows 10 (under the cap) to 15 (lower lid). */
function eye(rows: readonly [string, string, string, string, string, string]): Patch {
  return { x: 23, y: 10, rows };
}

/** The mouth: columns 26 to 30, rows 18 to 20 (21 for an open mouth, the chin's edge at 30). */
function mouth(rows: readonly string[]): Patch {
  return { x: 26, y: 18, rows };
}

const SMIRK_MOUTH = mouth(['BDBSB', 'BBDDB', 'BBLBO']);

const EXPRESSIONS: Readonly<Record<Face, readonly Patch[]>> = {
  // As drawn: the lid arched over a round green iris, a catchlight, white toward the ear.
  focus: [],
  // Taunt: the brow arched higher, the lower lid up over the iris, the near mouth corner up.
  smirk: [eye(['SSsddB', 'SsBBBs', 'BBBBBB', 'KKKKBB', 'KWIXKB', 'BSSSSB']), SMIRK_MOUTH],
  // Victory wink: the eye closed in a happy arch, the smirk.
  cool: [eye(['??????', '??????', 'BBBBBB', 'BKKKBB', 'KBBBKB', 'BBBBSB']), SMIRK_MOUTH],
  // Brow down toward the nose, lids narrowed, mouth set.
  effort: [
    eye(['??????', 'SBBsdB', 'BBBBdd', 'KKKKKB', 'BWIXKB', 'BSCSSB']),
    mouth(['BBBSB', 'BDDDB', 'BBSBO']),
  ],
  // A short shout at the peak of a special: brow down, eye open, mouth open.
  kiai: [
    eye(['??????', 'SBBsdB', 'BBBBdd', 'KKKKBB', 'KWIXKB', 'BWCJSB']),
    mouth(['BBBSB', 'BDOOB', 'BOMMO', 'BDOO?']),
  ],
  // Eye squeezed shut, brow pinched up, teeth clenched.
  hurt: [
    eye(['??????', 'SBBBds', 'BsddBB', 'BBBBBB', 'KKKKBB', 'BBSKKB']),
    mouth(['BBBSB', 'BOTTO', 'BDOOO']),
  ],
  // Knocked out: eye closed low, mouth slack.
  out: [
    eye(['??????', 'SBsdds', 'BBBBBB', 'BBBBBB', 'BSSSSB', 'BKKKKB']),
    mouth(['BBBSB', 'BSDOB', 'BBDLO']),
  ],
  // Out of breath: a skin-shadow lid heavy over the lowered lash, mouth ajar.
  tired: [
    eye(['??????', 'SBsdds', 'BBBBBB', 'SSSSBB', 'KKKKKB', 'BWCJSB']),
    mouth(['BBBSB', 'BSDOB', 'BBDLO']),
  ],
};

/** The head's rows with the expression of `face` written over them (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  return patched(head, EXPRESSIONS[face]);
}
