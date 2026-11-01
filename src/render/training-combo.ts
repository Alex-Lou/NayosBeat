import { leavesGround } from '../ai/defense';
import type { MatchConfig } from '../core/config';
import { scaledDamage } from '../core/damage';
import { superGauge } from '../core/fighter/move';
import { finisherLocked, finisherState } from '../core/finisher';
import { has, Input } from '../core/input';
import type { MoveData } from '../core/move-data';
import { BOOST_BAR, BOOST_MAX, COMBO_LIMIT } from '../core/rules';
import {
  FLAG_BOUNCE,
  FLAG_FINISHER,
  FLAG_LIMIT,
  type Contact,
  type FighterState,
  type GameState,
} from '../core/state';

/**
 * Training's « Combo » line (docs/finisher.md §1.12): player 1's last combo on the dummy, its
 * hits and its damage, and, when it played the super or asked for it, whether that was the
 * Finisher or why not. Measured on every tick from the states shown, never written back (D17),
 * like the advantage (advantage-meter.ts). The damage is the plain super's for the Finisher's
 * last blow: on the dummy, it would take all the health but its 1 HP floor (about 1000 on a
 * dummy at 100 %), and the line says what the super does.
 */

/**
 * The super of the combo: the Finisher, or why it was a plain one (or did not come out): the
 * gauge short of three bars (`bars`), the combo begun above 30 % (`start`), no room left in it
 * (`room`), a super that leaves the ground on a body in the air (`air`), a trade on its first
 * contact (`trade`), blocked (`blocked`), its last blow out of reach (`reach`).
 */
export type FinisherNote =
  | { readonly kind: 'finisher' | 'start' | 'room' | 'air' | 'trade' | 'blocked' | 'reach' }
  | { readonly kind: 'bars'; readonly bars: number };

export interface ComboLine {
  /** The dummy's hits in the combo; 0 for a super blocked alone. */
  readonly hits: number;
  readonly damage: number;
  readonly note: FinisherNote | null;
}

export interface ComboMeter {
  /** The line shown, null before player 1's first combo. */
  readonly line: ComboLine | null;
  /** The dummy's health as the combo began. */
  readonly startHealth: number;
  /** What the Finisher's last blow took beyond the plain super's. */
  readonly beyond: number;
  /** Why the super being played was not armed as it started; null if it was. */
  readonly unarmed: FinisherNote | null;
  /** The super being played has made its first contact. */
  readonly touched: boolean;
  /** The line's combo has played its super: back + BOOST pressed again in it asks for nothing. */
  readonly played: boolean;
}

export const NO_COMBO: ComboMeter = {
  line: null,
  startHealth: 0,
  beyond: 0,
  unarmed: null,
  touched: false,
  played: false,
};

/** The meter after the tick from `prev` to `next`: player 1 attacks, the dummy is player 2. */
export function trackCombo(
  meter: ComboMeter,
  prev: GameState,
  next: GameState,
  config: MatchConfig,
): ComboMeter {
  const [attacker, dummy] = next.fighters;
  const before = prev.fighters[1];
  let { line, startHealth, beyond, unarmed, touched, played } = meter;
  if (startsSuper(prev.fighters[0], attacker)) {
    unarmed = lightsNote(prev, config);
    touched = false;
    played = true;
  }
  // A new combo; a dummy hit again on the tick it recovers goes from N straight to 1.
  if (dummy.comboCount > 0 && (before.comboCount === 0 || dummy.comboCount < before.comboCount)) {
    startHealth = before.health;
    beyond = 0;
    line = { hits: 0, damage: 0, note: null };
    // A combo the super opens (from neutral, a reversal) is its own: its first contact comes
    // after it started.
    played = playsSuper(attacker);
  }
  const blow = next.contacts.find((contact) => contact.by === 0 && contact.move === 'super');
  let note = line?.note ?? null;
  if (blow && !touched) {
    touched = true;
    note = firstContactNote(blow, prev, next, unarmed, config);
    if (blow.kind === 'block') {
      startHealth = before.health;
      beyond = 0;
    }
  }
  if (blow?.kind === 'hit' && finisherLocked(next, 0) && isLastBlow(attacker, config)) {
    beyond += blow.damage - plainDamage(blow, dummy, config);
  }
  // Asked for in a combo without the three bars, before its super came out: why nothing does.
  // Once it has, the gauge is short for what was spent: the super's own note stays.
  const asked = asksSuper(prev.fighters[0], attacker, next.fighters[1]);
  if (asked && !played && dummy.comboCount > 0 && superGauge(prev.fighters[0]) < BOOST_MAX) {
    note = { kind: 'bars', bars: Math.floor(superGauge(prev.fighters[0]) / BOOST_BAR) };
  }
  if (dummy.comboCount > 0 || blow?.kind === 'block') {
    const hits = dummy.comboCount;
    line = { hits, damage: startHealth - dummy.health - beyond, note };
  } else if (line && note !== line.note) {
    line = { ...line, note };
  }
  return { line, startHealth, beyond, unarmed, touched, played };
}

/** What the HUD writes of the line's note (8 px a character, Press Start 2P). */
export function noteText(note: FinisherNote): string {
  switch (note.kind) {
    case 'finisher':
      return 'FINISHER';
    case 'bars':
      return note.bars > 1 ? `${note.bars} barres` : `${note.bars} barre`;
    case 'start':
      return 'début > 30 %';
    case 'room':
      return 'plus de place';
    case 'air':
      return "en l'air";
    case 'trade':
      return 'échange';
    case 'blocked':
      return 'paré';
    case 'reach':
      return 'hors de portée';
  }
}

/**
 * Why player 1's super, let go on the tick after `state`, would not be armed (its lights, read
 * as the core reads them: docs/finisher.md §1.1); null when it would, or when training plays it
 * as a plain super (« Finisher : désactivé »). In training, the match point is played as reached.
 */
export function lightsNote(state: GameState, config: MatchConfig): FinisherNote | null {
  const lights = finisherState(state, 0, config);
  if (lights === 'ready' || config.trainingFinisher === 'off') return null;
  const [attacker, victim] = state.fighters;
  const gauge = superGauge(attacker);
  if (gauge < BOOST_MAX) return { kind: 'bars', bars: Math.floor(gauge / BOOST_BAR) };
  // Three bars and the match point: only the danger turns them off.
  if (lights === 'off') return { kind: 'start' };
  const move = config.fighters[0].moves.super;
  return move && roomless(victim, move) ? { kind: 'room' } : { kind: 'air' };
}

/**
 * The note of the super's first contact (`blow`): blocked, the Finisher locked, traded (player 1
 * hit on the same tick), or, armed as it started, what its first contact read again (§1.6): a
 * body gone up for a super that leaves the ground, else the guarantee (its last blow would not
 * reach). Not armed: why not, as it started.
 */
function firstContactNote(
  blow: Contact,
  prev: GameState,
  next: GameState,
  unarmed: FinisherNote | null,
  config: MatchConfig,
): FinisherNote | null {
  if (blow.kind === 'block') return { kind: 'blocked' };
  if (finisherLocked(next, 0)) return { kind: 'finisher' };
  if (config.trainingFinisher === 'off') return null;
  if (next.contacts.some((contact) => contact.by === 1 && contact.kind === 'hit')) {
    return { kind: 'trade' };
  }
  if ((prev.fighters[0].flags & FLAG_FINISHER) === 0) return unarmed;
  const victim = prev.fighters[1];
  const up = victim.y > 0 || victim.action === 'airHit';
  return up && leavesGround(config.fighters[0].moves.super) ? { kind: 'air' } : { kind: 'reach' };
}

/** No room left in the victim's combo for every blow of `move` (light 4, §1.1). */
function roomless(victim: FighterState, move: MoveData): boolean {
  const blows = 1 + (move.pulses?.length ?? 0);
  return (
    (victim.flags & (FLAG_LIMIT | FLAG_BOUNCE)) !== 0 || victim.comboCount + blows > COMBO_LIMIT
  );
}

/** Player 1's super has reached its last blow (its last pulse, or its only blow). */
function isLastBlow(attacker: FighterState, config: MatchConfig): boolean {
  const last = config.fighters[0].moves.super?.pulses?.at(-1)?.frame ?? 0;
  return attacker.actionFrame >= last;
}

/**
 * What the Finisher's last blow would have taken from the dummy as a plain super's: its damage,
 * scaled by the combo, never past the 1 HP floor (all the blow took, `blow.damage`). The blows
 * before it are a plain super's already: on the dummy, the 1 HP floor is its own.
 */
function plainDamage(blow: Contact, dummy: FighterState, config: MatchConfig): number {
  const move = config.fighters[0].moves.super;
  const last = move?.pulses?.at(-1)?.hit ?? move;
  if (!last) return blow.damage;
  const scaled = scaledDamage(last.damage, dummy.comboCount, blow.counter !== null);
  return Math.min(scaled, blow.damage);
}

/** Player 1's super starts on this tick. */
function startsSuper(before: FighterState, after: FighterState): boolean {
  return playsSuper(after) && !playsSuper(before);
}

/** The fighter is playing its super. */
function playsSuper(fighter: FighterState): boolean {
  return fighter.action === 'attack' && fighter.move === 'super';
}

/**
 * Back + BOOST pressed on this tick, down not held: the super asked for (docs/finisher.md
 * §1.3). Back is away from `opponent`.
 */
function asksSuper(before: FighterState, after: FighterState, opponent: FighterState): boolean {
  const back = opponent.x > after.x ? Input.Left : Input.Right;
  const pressed = has(after.input, Input.Boost) && !has(before.input, Input.Boost);
  return pressed && has(after.input, back) && !has(after.input, Input.Down);
}
