import { PHRASE_MOVE_IDS, PHRASE_TWICE_IDS, type MoveId } from './move-data';
import type { FighterState } from './state';

/**
 * The phrase (docs/combos-v3.md §1.2): the moves a fighter cancels one into the next since it
 * last started one from neutral. A cancel never enters a normal the phrase already played, the
 * two lights (the beat) excepted, which may come back once: every string ends, and no loop of
 * cancels can last (the anti-infinite proof, §1.13). A link (a move from neutral) starts a new
 * phrase. Specials have no bit: the cancel ladder bounds them (`tierOf`).
 */

/** The bit of each normal, computed once: a move outside the phrase has none (0). */
const PHRASE_BITS: Readonly<Partial<Record<MoveId, number>>> = Object.fromEntries(
  PHRASE_MOVE_IDS.map((id, index) => [id, 1 << index]),
);

/** The bits of the beat. */
const TWICE = PHRASE_TWICE_IDS.reduce((mask, id) => mask | (PHRASE_BITS[id] ?? 0), 0);

/** Whether a cancel may enter `id`: never a normal already played, a light never a third time. */
export function phraseAllows(fighter: FighterState, id: MoveId): boolean {
  const bit = PHRASE_BITS[id] ?? 0;
  if ((fighter.phrase & bit) === 0) return true;
  return (TWICE & bit) !== 0 && (fighter.phraseTwice & bit) === 0;
}

/**
 * The phrase once `id` starts: on its own from neutral, or grown by a cancel (`cancelled`), the
 * light played again marked twice.
 */
export function phraseWith(
  fighter: FighterState,
  id: MoveId,
  cancelled: boolean,
): Pick<FighterState, 'phrase' | 'phraseTwice'> {
  const bit = PHRASE_BITS[id] ?? 0;
  if (!cancelled) return { phrase: bit, phraseTwice: 0 };
  const again = (fighter.phrase & bit) !== 0 ? bit : 0;
  return { phrase: fighter.phrase | bit, phraseTwice: fighter.phraseTwice | again };
}
