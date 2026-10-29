import type { FighterTemplate, MatchConfig } from './config';
import { moveOf, tierOf } from './moves';
import {
  BOOST_GAIN_BLOCKED,
  BOOST_GAIN_BLOCKING,
  BOOST_GAIN_HIT_DEN,
  BOOST_GAIN_HIT_NUM,
  BOOST_GAIN_HITS,
  BOOST_GAIN_SPECIAL,
  BOOST_GAIN_TAKEN_PERCENT,
  BOOST_MAX,
} from './rules';
import { SEQUENCE_FLAGS, type Contact, type FighterAction, type FighterState } from './state';

/**
 * The Boost gauge (docs/combos-v3.md §1.8, §1.9): filled at the end of each tick from what
 * happened on it, a pure pass over the tick's contacts, and the flash of the moves that freeze
 * the whole game. What the gauge pays for is chosen and paid in `fighter/move.ts`.
 */

/** The opponent is still in the attacker's sequence: reeling, blocking or juggled. */
const IN_SEQUENCE: ReadonlySet<FighterAction> = new Set(['hitstun', 'blockstun', 'airHit']);

/**
 * The fighters with the tick's gains (docs/combos-v3.md §1.8.2): a blow that hits gives its
 * attacker 3/2 of the health it took, on the first BOOST_GAIN_HITS hits of a combo, and the one
 * hit half of what it lost; a blow blocked gives a little to both; a plain special started out
 * of the opponent's combo gives a little; a Boost move gives its user nothing. The attacker's
 * spends of the sequence (the Rewind, the super) are freed once the opponent is out of it, and
 * the Rewind stops the slide of the opponent it hit as it starts. The same pair when nothing
 * changes: a quiet tick allocates nothing.
 */
export function boosted(
  fighters: readonly [FighterState, FighterState],
  contacts: readonly Contact[],
  config: MatchConfig,
): readonly [FighterState, FighterState] {
  const [a, b] = fighters;
  let gainA = specialGain(a, b, config.fighters[0]);
  let gainB = specialGain(b, a, config.fighters[1]);
  for (const contact of contacts) {
    const toAttacker = attackerGain(contact, contact.by === 0 ? b : a, config.fighters[contact.by]);
    const toDefender = defenderGain(contact);
    if (contact.by === 0) {
      gainA += toAttacker;
      gainB += toDefender;
    } else {
      gainB += toAttacker;
      gainA += toDefender;
    }
  }
  const nextA = stopped(withGauge(a, gainA, b), b);
  const nextB = stopped(withGauge(b, gainB, a), a);
  return nextA === a && nextB === b ? fighters : [nextA, nextB];
}

/**
 * The freeze of a move's flash (docs/combos-v3.md §1.9): the whole game stops `ticks` long as
 * the move reaches its frame (the super, the Rewind), the round's timer with it.
 */
export function flashOf(fighter: FighterState, template: FighterTemplate): number {
  if (fighter.action !== 'attack' || !fighter.move) return 0;
  const flash = moveOf(template, fighter.move).flash;
  return flash && fighter.actionFrame === flash.frame ? flash.ticks : 0;
}

/** A plain special started on this tick while the opponent is not in a combo: zoning builds. */
function specialGain(
  fighter: FighterState,
  opponent: FighterState,
  template: FighterTemplate,
): number {
  if (fighter.action !== 'attack' || fighter.actionFrame !== 0 || !fighter.move) return 0;
  if (opponent.action === 'hitstun' || opponent.action === 'airHit') return 0;
  return tierOf(moveOf(template, fighter.move)) === 1 ? BOOST_GAIN_SPECIAL : 0;
}

/** What a contact gives its attacker (`defender`: the opponent as the contact left it). */
function attackerGain(contact: Contact, defender: FighterState, template: FighterTemplate): number {
  if (contact.kind === 'grab' || contact.kind === 'tech') return 0;
  if (moveOf(template, contact.move).boostCost) return 0;
  if (contact.kind === 'block') return BOOST_GAIN_BLOCKED;
  if (defender.comboCount > BOOST_GAIN_HITS) return 0;
  return Math.trunc((contact.damage * BOOST_GAIN_HIT_NUM) / BOOST_GAIN_HIT_DEN);
}

/** What a contact gives the one it touched: a Boost move's too. */
function defenderGain(contact: Contact): number {
  if (contact.kind === 'block') return BOOST_GAIN_BLOCKING;
  if (contact.kind === 'grab' || contact.kind === 'tech') return 0;
  return Math.trunc((contact.damage * BOOST_GAIN_TAKEN_PERCENT) / 100);
}

/** The gauge with `gain` added, its spends freed once the opponent is out of the sequence. */
function withGauge(fighter: FighterState, gain: number, opponent: FighterState): FighterState {
  const boost = Math.min(BOOST_MAX, fighter.boost + gain);
  const flags = IN_SEQUENCE.has(opponent.action) ? fighter.flags : fighter.flags & ~SEQUENCE_FLAGS;
  if (boost === fighter.boost && flags === fighter.flags) return fighter;
  return { ...fighter, boost, flags };
}

/** The Rewind stops the record: as it starts, the opponent it hit stops sliding (§1.8.3). */
function stopped(fighter: FighterState, opponent: FighterState): FighterState {
  const rewinding = opponent.move === 'boostCancel' && opponent.actionFrame === 0;
  if (!rewinding || fighter.action !== 'hitstun' || fighter.vx === 0) return fighter;
  return { ...fighter, vx: 0 };
}
