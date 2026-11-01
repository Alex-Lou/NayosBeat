import { INTRO_FRAMES, MATCH_END_FRAMES } from '../core/rules';
import { matchWinner } from '../core/round';
import type { RoundState } from '../core/state';

/**
 * What the HUD writes, as pure functions of the state: every string it can show is known here,
 * and tests/render/glyphs.test.ts checks the pixel font has each of its letters (it has no
 * capital accented one: "EGALITE", "Echap").
 */

/** The timer in training, where time does not run out. */
export const NO_TIMER = '--';

/** The announcement over the fight: the round, its start, how it ended, the winner. */
export function announcementOf(round: RoundState, names: readonly [string, string]): string {
  switch (round.phase) {
    case 'intro':
      return round.phaseFrame < INTRO_FRAMES / 2 ? `ROUND ${round.number}` : 'COMBAT !';
    case 'fight':
      return '';
    case 'roundEnd': {
      const result = round.result;
      if (!result) return '';
      if (result.reason === 'timeout') return result.winner === null ? 'EGALITE' : 'TEMPS !';
      return result.winner === null ? 'DOUBLE K.O.' : 'K.O.';
    }
    case 'matchEnd': {
      // Once the results screen shows, it announces the winner instead.
      const winner = round.phaseFrame < MATCH_END_FRAMES ? matchWinner(round) : null;
      return winner === null ? '' : `${names[winner]} GAGNE`;
    }
  }
}

/**
 * Training: the hits and damage of player 1's last combo on the dummy, and what its super was
 * (`note`: « FINISHER », or why not, training-combo.ts).
 */
export function comboText(hits: number, damage: number, note?: string): string {
  const line = `Combo : ${hits > 1 ? `${hits} coups` : `${hits} coup`} · ${damage} dégâts`;
  return note ? `${line} · ${note}` : line;
}

/**
 * The reminder of the hold, in training (docs/combat-v2.md §4.5): what the holder's buttons do.
 * The pixel font has no ←: a space keeps its place, and its ↑, turned, is drawn there.
 */
export const HOLD_PROMPT = 'L frapper · H lancer ·   H derrière';
