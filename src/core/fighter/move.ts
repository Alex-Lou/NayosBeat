import type { FighterTemplate } from '../config';
import type { MoveData, MoveId } from '../move-data';
import { groundMove, isCrouchingMove, moveDuration } from '../moves';
import { signed } from '../numbers';
import { DASH_MOMENTUM_PERCENT, PUSHBACK_FRICTION, THROW_CONVERSION_FRAMES } from '../rules';
import type { FighterAction, FighterState } from '../state';
import { enter, nextFrame } from './action';

/**
 * One tick of a ground move: a cancel into another move, or its next frame. Null once the move
 * is over: the fighter is back in neutral.
 */
export function updateMove(fighter: FighterState, template: FighterTemplate): FighterState | null {
  const move = fighter.move ? template.moves[fighter.move] : null;
  if (!move) return null;
  const cancel = cancelMove(fighter, move, template);
  if (cancel) {
    return startGroundMove({ ...fighter, vx: momentumOf(fighter, move) }, cancel, template);
  }
  return fighter.actionFrame + 1 < moveDuration(move)
    ? applyMotion(nextFrame(fighter), move)
    : null;
}

export function startGroundMove(
  fighter: FighterState,
  moveId: MoveId,
  template: FighterTemplate,
): FighterState {
  const started = { ...startAttack(fighter, 'attack', moveId), crouching: isCrouchingMove(moveId) };
  return applyMotion(started, template.moves[moveId]);
}

export function startAttack(
  fighter: FighterState,
  action: FighterAction,
  move: MoveId,
): FighterState {
  return {
    ...enter(fighter, action),
    move,
    moveConnected: false,
    bufferedCommand: null,
    bufferFrames: 0,
  };
}

/**
 * The move that interrupts the current one, if any: a normal turned into a grab when the
 * second button came a little late, a cancel allowed once the move has connected, or, from its
 * `freeCancelFrom` frame on, a cancel without contact (Riff's dash). The cancel replaces the
 * frame the move would play next.
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
  if (!(fighter.moveConnected || free) || !move.cancelInto) return null;

  const next = groundMove(
    command,
    fighter.bufferedInput,
    fighter.bufferedMotion,
    fighter.bufferedFacing,
  );
  return next && move.cancelInto.includes(template.moves[next].kind) ? next : null;
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
 * Carries the fighter by the move's motion on its current frame. On the frames without motion
 * the fighter stops, unless it glides on a cancelled dash's momentum, which friction slows down
 * (the rule of the pushback slide). A move stops dead where its own motion ends.
 */
function applyMotion(fighter: FighterState, move: MoveData): FighterState {
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
