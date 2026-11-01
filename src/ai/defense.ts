import type { MatchConfig } from '../core/config';
import { px } from '../core/constants';
import { finisherReady } from '../core/finisher';
import { Input, type InputBits } from '../core/input';
import type { MoveData } from '../core/move-data';
import { FLAG_FINISHER, type FighterState, type GameState } from '../core/state';
import { projectileThreatens } from '../core/threat';

/**
 * A projectile is worth reacting to (jumping over it, guarding) from this far: farther than a
 * player's proximity guard, the CPU needs time to act on what it sees.
 */
const PROJECTILE_ALERT_RANGE = px(140);

/** An opponent projectile heading toward the player, close enough to worry about. */
export function incomingProjectile(state: GameState, player: 0 | 1): boolean {
  const me = state.fighters[player];
  return projectileThreatens(state.projectiles, player, me.x, PROJECTILE_ALERT_RANGE);
}

/** Holds back, crouching unless the attack must be blocked standing. */
export function guardInput(
  me: FighterState,
  opponent: FighterState,
  move: MoveData | null,
): InputBits {
  const back = opponent.x > me.x ? Input.Left : Input.Right;
  const standing = opponent.y > 0 || move?.guard === 'overhead';
  return standing ? back : back | Input.Down;
}

/**
 * The opponent's Finisher threatens `player` (docs/finisher.md §1.11), as a player sees it: the
 * FINISH plate lit on its gauge, or the super it plays (`seen`, as the CPU saw it) let go armed.
 */
export function finisherMenace(
  state: GameState,
  player: 0 | 1,
  config: MatchConfig,
  seen: FighterState,
): boolean {
  return finisherReady(state, player === 0 ? 1 : 0, config) || armedSuper(seen);
}

/**
 * The super `fighter` plays was let go with its FINISH plate lit: the core marks it so as it
 * starts (FLAG_FINISHER, from the lights of the tick before), which the plate going out shows.
 */
export function armedSuper(fighter: FighterState): boolean {
  return (
    fighter.action === 'attack' && fighter.move === 'super' && (fighter.flags & FLAG_FINISHER) !== 0
  );
}

/** The move lifts its fighter off the ground (its motion has a height): Riff's Slam. */
export function leavesGround(move: MoveData | undefined): boolean {
  return move?.motion?.y?.some((height) => height > 0) ?? false;
}
