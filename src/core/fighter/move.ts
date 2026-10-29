import type { FighterTemplate } from '../config';
import type { MoveData, MoveId } from '../move-data';
import { branchMove, groundMove, moveDuration, moveOf, tierOf } from '../moves';
import { signed } from '../numbers';
import { phraseAllows, phraseWith } from '../phrase';
import { DASH_MOMENTUM_PERCENT, PUSHBACK_FRICTION, THROW_CONVERSION_FRAMES } from '../rules';
import { FLAG_MOVE_HIT, type FighterAction, type FighterState } from '../state';
import { enter, nextFrame } from './action';

/**
 * One tick of a ground move: a cancel into another move, or its next frame. Null once the move
 * is over: the fighter is back in neutral.
 */
export function updateMove(fighter: FighterState, template: FighterTemplate): FighterState | null {
  const move = fighter.move ? moveOf(template, fighter.move) : null;
  if (!move) return null;
  const cancel = cancelMove(fighter, move, template);
  if (cancel) {
    return startGroundMove({ ...fighter, vx: momentumOf(fighter, move) }, cancel, template, true);
  }
  return fighter.actionFrame + 1 < moveDuration(move)
    ? applyMotion(nextFrame(fighter), move)
    : null;
}

/**
 * Starts a ground move, from neutral or as a cancel of the one playing (`cancelled`): a move
 * from neutral starts a new phrase, a cancel grows it (docs/combos-v3.md §1.2).
 */
export function startGroundMove(
  fighter: FighterState,
  moveId: MoveId,
  template: FighterTemplate,
  cancelled = false,
): FighterState {
  const move = moveOf(template, moveId);
  const started = {
    ...startAttack(fighter, 'attack', moveId),
    crouching: move.crouching === true,
    ...phraseWith(fighter, moveId, cancelled),
  };
  return applyMotion(started, move);
}

/** Starts a move of any kind: it has neither connected nor hit anything yet. */
export function startAttack(
  fighter: FighterState,
  action: FighterAction,
  move: MoveId,
): FighterState {
  return {
    ...enter(fighter, action),
    move,
    moveConnected: false,
    flags: fighter.flags & ~FLAG_MOVE_HIT,
    bufferedCommand: null,
    bufferFrames: 0,
  };
}

/**
 * The move that interrupts the current one, if any (docs/combos-v3.md §1.2-1.4): a normal turned
 * into a grab when the second button came a little late; a special that hit, into a higher rung
 * of the ladder only; else, once the move has hit or been blocked, the string of the button and
 * direction pressed (a fresh motion asks for a special first), or the move the command gives if
 * `cancelInto` allows its kind; or, from its `freeCancelFrom` frame on, a cancel without contact
 * (Riff's dash, into any normal). Never a normal the phrase already played. The cancel replaces
 * the frame the move would play next.
 */
function cancelMove(
  fighter: FighterState,
  move: MoveData,
  template: FighterTemplate,
): MoveId | null {
  const command = fighter.bufferedCommand;
  if (!command) return null;

  if (command === 'grab' && move.kind === 'normal') {
    const early = fighter.actionFrame < THROW_CONVERSION_FRAMES && !fighter.moveConnected;
    return early ? 'grab' : null;
  }
  const free = move.freeCancelFrom !== undefined && fighter.actionFrame + 1 >= move.freeCancelFrom;
  if (!(fighter.moveConnected || free)) return null;

  const { bufferedInput: input, bufferedMotion: motion, bufferedFacing: facing } = fighter;
  const tier = tierOf(move);
  if (tier > 0) {
    // The ladder never goes down, and only a blow that hit climbs it (blocked, a special stays
    // punishable); a projectile never does: its thrower has not touched anything.
    const hit = (fighter.flags & FLAG_MOVE_HIT) !== 0;
    if (!hit || move.projectile) return null;
    const next = groundMove(command, input, motion, facing, template.moves);
    return next && tierOf(moveOf(template, next)) > tier ? next : null;
  }

  // A string passes over `cancelInto`, never over the phrase.
  const branch =
    fighter.moveConnected && motion === null ? branchMove(command, input, facing, move) : null;
  if (branch) return phraseAllows(fighter, branch) ? branch : null;

  const next = groundMove(command, input, motion, facing, template.moves);
  if (!next || !move.cancelInto?.includes(moveOf(template, next).kind)) return null;
  return phraseAllows(fighter, next) ? next : null;
}

/**
 * Speed a move hands over to the one it is cancelled into: part of a dash's speed on the frame
 * it is cancelled (the dash-jab glides on), nothing for a move that stands still.
 */
function momentumOf(fighter: FighterState, move: MoveData): number {
  if (move.kind !== 'movement') return 0;
  const dx = move.motion?.dx[fighter.actionFrame + 1] ?? 0;
  return signed(fighter.facing, Math.trunc((dx * DASH_MOMENTUM_PERCENT) / 100));
}

/**
 * Carries the fighter by the move's motion on its current frame, up to its height on that frame
 * for a leap (the Saut de l'ange really leaves the ground). On the frames without motion the
 * fighter stops, unless it glides on a cancelled dash's momentum, which friction slows down
 * (the rule of the pushback slide). A move stops dead where its own motion ends.
 */
function applyMotion(moving: FighterState, move: MoveData): FighterState {
  const height = move.motion?.y?.[moving.actionFrame];
  const fighter = height === undefined || height === moving.y ? moving : { ...moving, y: height };
  const dx = move.motion?.dx[fighter.actionFrame] ?? 0;
  if (dx !== 0) {
    const vx = signed(fighter.facing, dx);
    return { ...fighter, vx, x: fighter.x + vx };
  }
  const ownMotion = (move.motion?.dx[fighter.actionFrame - 1] ?? 0) !== 0;
  if (fighter.vx === 0 || ownMotion) return fighter.vx === 0 ? fighter : { ...fighter, vx: 0 };
  const speed = Math.max(0, Math.abs(fighter.vx) - PUSHBACK_FRICTION);
  return { ...fighter, x: fighter.x + fighter.vx, vx: signed(fighter.vx > 0 ? 1 : -1, speed) };
}
