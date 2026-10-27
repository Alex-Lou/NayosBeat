import { px } from '../core/constants';
import { Input, type InputBits } from '../core/input';
import type { MoveData } from '../core/move-data';
import type { FighterState, GameState } from '../core/state';
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
