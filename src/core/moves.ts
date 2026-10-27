import type { Command } from './commands';
import type { FighterMoves, FighterTemplate } from './config';
import { has, Input, type InputBits } from './input';
import type { FrameRange, MoveData, MoveId, OptionalMoveId } from './move-data';
import type { Motion } from './motion';
import type { Facing } from './state';

/**
 * A move of the fighter. The moves played are always defined (`groundMove` falls back on the
 * standing normal for an optional move a fighter does not have, and validation checks every
 * `chain`): a missing one is a bug.
 */
export function moveOf(template: FighterTemplate, id: MoveId): MoveData {
  const move = template.moves[id];
  if (!move) throw new Error(`${template.name} has no move ${id}`);
  return move;
}

export function moveDuration(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

export function isActiveFrame(move: MoveData, actionFrame: number): boolean {
  return actionFrame >= move.startup && actionFrame < move.startup + move.active;
}

/**
 * Whether the move cannot be hit on this frame by a blow coming from the air or not
 * (`fromAir`): an invincibility `against: 'air'` only stops attacks from the air.
 */
export function isInvincible(move: MoveData, actionFrame: number, fromAir: boolean): boolean {
  const range = move.invincible;
  if (range?.against === 'air' && !fromAir) return false;
  return inRange(range, actionFrame);
}

/** Grabs whiff on these frames (a backdash), strikes do not. */
export function isThrowInvincible(move: MoveData, actionFrame: number): boolean {
  return inRange(move.throwInvincible, actionFrame);
}

/**
 * Ground move for a command (docs/combat-v2.md §2.8, the first row that applies wins), from the
 * direction held and the motion completed when it was pressed (a buffered press keeps what the
 * player meant, even if they let go since). `chain` is the chain of the move being cancelled,
 * if it has one: L gives it. Null for the jump, which is a state of its own and not a move. A
 * fresh motion comes first, for the special button too: ↓↘→ + S ends holding forward, and still
 * throws the special, not the forward special. An optional move the fighter does not have
 * gives its standing normal.
 */
export function groundMove(
  command: Command,
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
  moves: FighterMoves,
  chain?: MoveId,
): MoveId | null {
  if (command === 'grab') return 'grab';
  if (command === 'dash') return 'dashForward';
  if (command === 'backdash') return 'dashBack';
  if (command !== 'light' && command !== 'heavy' && command !== 'special') return null;

  // Classic motions turn any attack button into a special.
  if (motion === 'dragonPunch') return 'specialAntiAir';
  if (motion === 'quarterCircleForward') return 'special';

  if (command === 'special') return specialFromDirection(input, facing);
  const light = command === 'light';
  if (light && chain) return chain;
  if (has(input, Input.Down)) return light ? 'crouchLight' : 'crouchHeavy';
  // Back + L stays the jab: the quickest reversal out of a guard.
  if (light)
    return has(input, forwardOf(facing))
      ? ownOr(moves, 'forwardLight', 'standLight')
      : 'standLight';
  if (has(input, forwardOf(facing))) return ownOr(moves, 'forwardHeavy', 'standHeavy');
  if (has(input, backOf(facing))) return ownOr(moves, 'backHeavy', 'standHeavy');
  return 'standHeavy';
}

/**
 * What the holder does with a command (docs/combat-v2.md §2.8, §4.1), from the direction held
 * when it was pressed: L pummels; H, S or the grab throw forward, backward with back held. Null
 * for the rest: a hold has no jump nor dash.
 */
export function holdMove(command: Command, input: InputBits, facing: Facing): MoveId | null {
  if (!isHoldChoice(command)) return null;
  if (command === 'light') return 'pummel';
  return has(input, backOf(facing)) ? 'throwBack' : 'throwForward';
}

/** Whether a command chooses a move in the hold: L, H, S or the grab (§2.8). */
export function isHoldChoice(command: Command | null): boolean {
  return command === 'light' || command === 'heavy' || command === 'special' || command === 'grab';
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
  return has(input, forwardOf(facing)) ? 'specialForward' : 'special';
}

/** The fighter's own `optional` move, or the normal it falls back on without one. */
function ownOr(moves: FighterMoves, optional: OptionalMoveId, fallback: MoveId): MoveId {
  return moves[optional] ? optional : fallback;
}

function forwardOf(facing: Facing): InputBits {
  return facing === 1 ? Input.Right : Input.Left;
}

function backOf(facing: Facing): InputBits {
  return facing === 1 ? Input.Left : Input.Right;
}

function inRange(range: FrameRange | undefined, actionFrame: number): boolean {
  return range !== undefined && actionFrame >= range.from && actionFrame < range.to;
}
