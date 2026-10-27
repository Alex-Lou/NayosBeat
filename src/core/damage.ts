import type { FighterTemplate } from './config';
import type { MoveData } from './move-data';
import { moveOf } from './moves';
import {
  COMBO_SCALING_FLOOR,
  COMBO_SCALING_STEP,
  COUNTER_DAMAGE_PERCENT,
  SPECIAL_CHIP_PERCENT,
} from './rules';
import type { CounterHit, FighterState } from './state';

/**
 * What a blow costs (docs/combat-v2.md §7.4, §7.5, §7.7): one integer formula for every hit,
 * the counter-hit that rewards a read, the chip of a special blocked. Pure: the presentation
 * reads the same answers from the contacts.
 */

/**
 * CONTRE when the blow catches `defender` attacking (a strike, a special or a grab, starting up
 * or out), PUNITION when it catches it recovering from one; null otherwise. A dash is no attack,
 * and a fighter in hitstun is not attacking either: only a combo's first hit can be one.
 */
export function isCounterHit(defender: FighterState, template: FighterTemplate): CounterHit | null {
  const { action, move: id } = defender;
  if (!id || (action !== 'attack' && action !== 'airAttack')) return null;
  const move = moveOf(template, id);
  if (move.kind !== 'normal' && move.kind !== 'special' && move.kind !== 'grab') return null;
  return defender.actionFrame < move.startup + move.active ? 'counter' : 'punish';
}

/**
 * The damage of the `comboCount`-th hit of a combo: 100 %, 90 %, 80 %... down to the floor, 20 %
 * more on a counter-hit, truncated, at least 1. There is no bonus for a motion.
 */
export function scaledDamage(damage: number, comboCount: number, counter = false): number {
  const scaling = Math.max(COMBO_SCALING_FLOOR, 100 - COMBO_SCALING_STEP * (comboCount - 1));
  const bonus = 100 + (counter ? COUNTER_DAMAGE_PERCENT : 0);
  return Math.max(1, Math.trunc((damage * scaling * bonus) / 10000));
}

/** Health a blocked move still takes: a share of a special's damage, nothing for the rest. */
export function chipDamage(move: MoveData): number {
  return move.kind === 'special' ? Math.trunc((move.damage * SPECIAL_CHIP_PERCENT) / 100) : 0;
}
