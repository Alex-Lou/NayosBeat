import type { Command } from './commands';
import type { FighterMoves, FighterTemplate } from './config';
import { has, Input, type InputBits } from './input';
import type { BranchDir, FrameRange, MoveData, MoveId, OptionalMoveId } from './move-data';
import type { Motion } from './motion';
import { BOOST_BAR, BOOST_MAX } from './rules';
import type { Facing } from './state';

/**
 * A move of the fighter. The moves played are always defined (`groundMove` falls back on the
 * standing normal for an optional move a fighter does not have, and validation checks every
 * branch): a missing one is a bug.
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
 * player meant, even if they let go since). Null for the jump, which is a state of its own and
 * not a move. A fresh motion comes first, for the special button too: ↓↘→ + S ends holding
 * forward, and still throws the special, not the forward special. An optional move the fighter
 * does not have gives its standing normal. The strings of a move being cancelled are read
 * before this table (`branchMove`). BOOST reads the gauge (`boost`) and whether the fighter's
 * projectile still flies (`discOut`): see `boostMove`.
 */
export function groundMove(
  command: Command,
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
  moves: FighterMoves,
  boost = 0,
  discOut = false,
): MoveId | null {
  if (command === 'grab') return 'grab';
  if (command === 'dash' || command === 'boostDash') return 'dashForward';
  if (command === 'backdash') return 'dashBack';
  if (command === 'boost') return boostMove(input, motion, facing, moves, boost, discOut);
  if (command !== 'light' && command !== 'heavy' && command !== 'special') return null;

  // Classic motions turn any attack button into a special.
  if (motion === 'dragonPunch') return 'specialAntiAir';
  if (motion === 'quarterCircleForward') return 'special';

  if (command === 'special') return specialFromDirection(input, facing);
  const light = command === 'light';
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

/**
 * The rung of the cancel ladder (docs/combos-v3.md §1.3): 0 a normal or a movement, 1 a special,
 * 2 a Remix, 3 the super. A move climbs it, never down: a special or a Remix that hit cancels
 * into the super only.
 */
export function tierOf(move: MoveData): number {
  return move.kind === 'special' ? (move.tier ?? 1) : 0;
}

/**
 * BOOST (docs/combos-v3.md §1.1) reads like S, a fresh motion first: down (diagonals included)
 * or →↓↘ gives the Remix of the anti-air, forward the Remix of the forward special, neither the
 * Remix of the special (one bar each); back alone, without down nor motion, the super (three
 * bars). Nothing it cannot pay for, nor a Remix that would fire a second projectile (`discOut`):
 * BOOST never gives another move than the one asked for, and never spends for nothing.
 */
function boostMove(
  input: InputBits,
  motion: Motion | null,
  facing: Facing,
  moves: FighterMoves,
  boost: number,
  discOut: boolean,
): MoveId | null {
  const special =
    motion === 'dragonPunch'
      ? 'specialAntiAir'
      : motion === 'quarterCircleForward'
        ? 'special'
        : specialFromDirection(input, facing);
  if (special === 'special' && motion === null && has(input, backOf(facing))) {
    return boost >= BOOST_MAX && moves.super ? 'super' : null;
  }
  if (boost < BOOST_BAR) return null;
  const remix: OptionalMoveId =
    special === 'specialAntiAir'
      ? 'specialAntiAirBoost'
      : special === 'specialForward'
        ? 'specialForwardBoost'
        : 'specialBoost';
  const move = moves[remix];
  return move && !(discOut && move.projectile) ? remix : null;
}

/**
 * The direction of a string, read from what was held when the button was pressed, relative to
 * the side then faced (docs/combos-v3.md §1.1): down (diagonals too), then forward, then back.
 * Up never chooses: it jumps.
 */
export function branchDirOf(input: InputBits, facing: Facing): BranchDir {
  if (has(input, Input.Down)) return 'down';
  if (has(input, forwardOf(facing))) return 'forward';
  return has(input, backOf(facing)) ? 'back' : 'neutral';
}

/**
 * The string a command opens during `move` (docs/combos-v3.md §1.4): the first branch of its
 * button whose directions include the one held, else its branch for any direction. The branches
 * are data loaded once: the loop allocates nothing.
 */
export function branchMove(
  command: Command,
  input: InputBits,
  facing: Facing,
  move: MoveData,
): MoveId | null {
  const { branches } = move;
  if (!branches || (command !== 'light' && command !== 'heavy')) return null;
  const dir = branchDirOf(input, facing);
  let anyDirection: MoveId | null = null;
  for (const branch of branches) {
    if (branch.button !== command) continue;
    if (!branch.dirs) anyDirection ??= branch.move;
    else if (branch.dirs.includes(dir)) return branch.move;
  }
  return anyDirection;
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
