import type { MoveData, MoveId } from './config';
import { has, Input, type InputBits } from './input';
import type { Motion } from './motion';
import type { AttackButton, Facing } from './state';

export function moveDuration(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

export function isActiveFrame(move: MoveData, actionFrame: number): boolean {
  return actionFrame >= move.startup && actionFrame < move.startup + move.active;
}

export function isInvincible(move: MoveData, actionFrame: number): boolean {
  const range = move.invincible;
  return range !== undefined && actionFrame >= range.from && actionFrame < range.to;
}

/**
 * Ground move for a button, from the direction held and the motion completed when it was
 * pressed (a buffered press keeps what the player meant, even if they let go since).
 */
export function groundMove(
  button: AttackButton,
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
): MoveId {
  if (button === 'throw') return 'throw';
  if (button === 'special') return specialFromDirection(input, facing);

  // Classic motions turn a light or heavy press into a special.
  if (motion === 'dragonPunch') return 'specialAntiAir';
  if (motion === 'quarterCircleForward') return 'special';

  if (has(input, Input.Down)) return button === 'light' ? 'crouchLight' : 'crouchHeavy';
  return button === 'light' ? 'standLight' : 'standHeavy';
}

/** Air move for a button; there are no air specials or air throws. */
export function airMove(button: AttackButton): MoveId | null {
  if (button === 'light') return 'jumpLight';
  if (button === 'heavy') return 'jumpHeavy';
  return null;
}

export function isCrouchingMove(move: MoveId): boolean {
  return move === 'crouchLight' || move === 'crouchHeavy';
}

/** Simplified specials: special alone, forward + special, down + special. */
function specialFromDirection(input: InputBits, facing: Facing): MoveId {
  if (has(input, Input.Down)) return 'specialAntiAir';
  const forward = facing === 1 ? Input.Right : Input.Left;
  return has(input, forward) ? 'specialForward' : 'special';
}
