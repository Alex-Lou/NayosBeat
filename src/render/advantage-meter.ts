import type { FighterAction, FighterState, GameState } from '../core/state';

/**
 * The advantage of an exchange, for training (docs/combat-v2.md, phase 3; docs/polish/
 * AUDIT-ET-PLAN.md, P19): once both fighters can act again after a blow lands or is blocked,
 * how many ticks player 1 could act before player 2. « Avantage : -23 » after a blocked Uppercut
 * says what the frame data says, and what punishing is. Read from the state shown, never written
 * back: a projection of the game (D17).
 */
export interface Advantage {
  /** A blow landed or was blocked, and both fighters have not both acted again yet. */
  readonly open: boolean;
  /** The tick (`GameState.frame`) each fighter could act again in the open exchange. */
  readonly free: readonly [number | null, number | null];
  /** The last exchange's advantage for player 1, in ticks: positive, they could act first. */
  readonly last: number | null;
}

export const NO_ADVANTAGE: Advantage = { open: false, free: [null, null], last: null };

/** Actions in which a fighter does nothing it has to finish: it could start anything. */
const FREE_ACTIONS: ReadonlySet<FighterAction> = new Set<FighterAction>([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'guard',
]);

/**
 * The fighter could act on this tick: it stands free, or starts something new right away (a
 * blow or a jump pressed ahead, buffered, comes out the first tick it can).
 */
function actsAgain(fighter: FighterState): boolean {
  if (FREE_ACTIONS.has(fighter.action)) return true;
  return fighter.actionFrame === 0 && (fighter.action === 'attack' || fighter.action === 'preJump');
}

/**
 * The meter after the tick `state`. Each new contact (re)opens the exchange: a string or a combo
 * counts from its last blow. Outside the fight, nothing is measured.
 */
export function trackAdvantage(meter: Advantage, state: GameState): Advantage {
  if (state.round.phase !== 'fight')
    return meter.open ? { ...NO_ADVANTAGE, last: meter.last } : meter;
  if (state.contacts.length > 0) return { open: true, free: [null, null], last: meter.last };
  if (!meter.open) return meter;
  const freeAt = (player: 0 | 1): number | null =>
    meter.free[player] ?? (actsAgain(state.fighters[player]) ? state.frame : null);
  const free = [freeAt(0), freeAt(1)] as const;
  if (free[0] === null || free[1] === null) return { ...meter, free };
  return { open: false, free: [null, null], last: free[1] - free[0] };
}

/**
 * How the advantage reads: its sign always written, so it never rests on its color alone. The
 * minus is the hyphen: the pixel font has no « − » (tests/render/glyphs.test.ts).
 */
export function advantageText(ticks: number): string {
  if (ticks === 0) return 'Avantage : ±0';
  return `Avantage : ${ticks > 0 ? '+' : '-'}${Math.abs(ticks)}`;
}
