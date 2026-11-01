import type { MatchConfig } from '../core/config';
import { isActiveFrame, moveOf } from '../core/moves';
import type { FighterAction, FighterState, GameState } from '../core/state';

/**
 * The frame meter of training (docs/polish/AUDIT-ET-PLAN.md, P19, lot 13): for each fighter, one
 * cell per tick of the last exchange: startup, active, recovery, stun, or free. It shows what the
 * advantage counts, and where a blow can be punished. Frozen ticks do not count, as the frame data
 * does not count them; a stun starts on the tick of its contact. A projection of the state (D17).
 */
export type Cell = 'free' | 'startup' | 'active' | 'recovery' | 'stun';

export const METER_CELLS = 60;
/** Both fighters free this long: the exchange is over, the meter keeps it on screen. */
export const QUIET_TICKS = 20;

export interface FrameMeter {
  readonly cells: readonly [readonly Cell[], readonly Cell[]];
  /** Ticks both fighters have been free in a row. */
  readonly quiet: number;
  /** The last state's freeze: the tick after a frozen state advances nothing. */
  readonly hitstop: number;
}

export const EMPTY_METER: FrameMeter = { cells: [[], []], quiet: QUIET_TICKS, hitstop: 0 };

const FREE_ACTIONS: ReadonlySet<FighterAction> = new Set<FighterAction>([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'guard',
  'air',
]);

const STUN_ACTIONS: ReadonlySet<FighterAction> = new Set<FighterAction>([
  'hitstun',
  'blockstun',
  'airHit',
  'knockdown',
  'held',
  'tech',
  'ko',
]);

/** What `fighter` is doing on this tick, as the meter draws it. */
export function cellOf(fighter: FighterState, config: MatchConfig, player: 0 | 1): Cell {
  if (FREE_ACTIONS.has(fighter.action)) return 'free';
  if (STUN_ACTIONS.has(fighter.action)) return 'stun';
  const attacking = fighter.action === 'attack' || fighter.action === 'airAttack';
  if (!attacking || fighter.move === null) return 'recovery';
  const move = moveOf(config.fighters[player], fighter.move);
  // A dash or a backdash: committed, it cannot act, but it strikes nothing.
  if (move.kind === 'movement') return 'recovery';
  if (fighter.actionFrame < move.startup) return 'startup';
  return isActiveFrame(move, fighter.actionFrame) ? 'active' : 'recovery';
}

/**
 * The meter after the tick `state`. An exchange starts when a fighter stops being free, from the
 * left of the meter; it scrolls once full; once both are free a while, it stays as it ended.
 */
export function trackFrames(meter: FrameMeter, state: GameState, config: MatchConfig): FrameMeter {
  // A tick from a frozen state moves nothing, its last one included (the freeze ends on it); the
  // tick of a contact moves both fighters, it counts.
  const frozen = meter.hitstop > 0;
  const hitstop = state.hitstop;
  if (frozen || state.round.phase !== 'fight') {
    return hitstop === meter.hitstop ? meter : { ...meter, hitstop };
  }
  const now = [0, 1].map((player) =>
    cellOf(state.fighters[player as 0 | 1], config, player as 0 | 1),
  ) as [Cell, Cell];
  const free = now[0] === 'free' && now[1] === 'free';
  if (free && meter.quiet >= QUIET_TICKS) {
    return hitstop === meter.hitstop ? meter : { ...meter, hitstop };
  }
  // A new exchange after a quiet moment: drawn from the left.
  const start = meter.quiet >= QUIET_TICKS;
  const cells = [0, 1].map((player) => {
    const before = start ? [] : meter.cells[player as 0 | 1];
    return [...before, now[player as 0 | 1]].slice(-METER_CELLS);
  }) as [Cell[], Cell[]];
  return { cells, quiet: free ? meter.quiet + 1 : 0, hitstop };
}
