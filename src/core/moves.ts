import type { Command } from './commands';
import { has, Input, type InputBits } from './input';
import type { FrameRange, MoveData, MoveId } from './move-data';
import type { Motion } from './motion';
import type { Facing } from './state';

export function moveDuration(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

export function isActiveFrame(move: MoveData, actionFrame: number): boolean {
  return actionFrame >= move.startup && actionFrame < move.startup + move.active;
}

export function isInvincible(move: MoveData, actionFrame: number): boolean {
  return inRange(move.invincible, actionFrame);
}

/** Grabs whiff on these frames (a backdash), strikes do not. */
export function isThrowInvincible(move: MoveData, actionFrame: number): boolean {
  return inRange(move.throwInvincible, actionFrame);
}

/**
 * Ground move for a command, from the direction held and the motion completed when it was
 * pressed (a buffered press keeps what the player meant, even if they let go since).
 * Null for the jump, which is a state of its own and not a move. A fresh motion comes first,
 * for the special button too (docs/combat-v2.md §2.8): ↓↘→ + S ends holding forward, and still
 * throws the special, not the forward special.
 */
export function groundMove(
  command: Command,
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
): MoveId | null {
  if (command === 'grab') return 'grab';
  if (command === 'dash') return 'dashForward';
  if (command === 'backdash') return 'dashBack';
  if (command !== 'light' && command !== 'heavy' && command !== 'special') return null;

  // Classic motions turn any attack button into a special.
  if (motion === 'dragonPunch') return 'specialAntiAir';
  if (motion === 'quarterCircleForward') return 'special';

  if (command === 'special') return specialFromDirection(input, facing);
  if (has(input, Input.Down)) return command === 'light' ? 'crouchLight' : 'crouchHeavy';
  return command === 'light' ? 'standLight' : 'standHeavy';
}

/** Air move for a command; there are no air specials, air grabs nor air dashes. */
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

function inRange(range: FrameRange | undefined, actionFrame: number): boolean {
  return range !== undefined && actionFrame >= range.from && actionFrame < range.to;
}
