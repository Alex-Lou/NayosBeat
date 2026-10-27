import type { Command } from './commands';
import { has, Input, type InputBits } from './input';
import type { MoveData, MoveId } from './move-data';
import type { Motion } from './motion';
import type { Facing } from './state';

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
 * Ground move for a command, from the direction held and the motion completed when it was
 * pressed (a buffered press keeps what the player meant, even if they let go since).
 * Null for the commands that start no move yet.
 */
export function groundMove(
  command: Command,
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
): MoveId | null {
  if (command === 'grab') return 'grab';
  if (command === 'special') return specialFromDirection(input, facing);
  if (command !== 'light' && command !== 'heavy') return null;

  // Classic motions turn a light or heavy press into a special.
  if (motion === 'dragonPunch') return 'specialAntiAir';
  if (motion === 'quarterCircleForward') return 'special';

  if (has(input, Input.Down)) return command === 'light' ? 'crouchLight' : 'crouchHeavy';
  return command === 'light' ? 'standLight' : 'standHeavy';
}

/** Air move for a command; there are no air specials or air grabs. */
export function airMove(command: Command): MoveId | null {
  if (command === 'light') return 'jumpLight';
  if (command === 'heavy') return 'jumpHeavy';
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
