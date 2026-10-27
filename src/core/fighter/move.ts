import type { FighterTemplate } from '../config';
import type { MoveData, MoveId } from '../move-data';
import { groundMove, isCrouchingMove, moveDuration } from '../moves';
import { signed } from '../numbers';
import { THROW_CONVERSION_FRAMES } from '../rules';
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
  if (cancel) return startGroundMove(fighter, cancel, template);
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
 * second button came a little late, or a cancel allowed once the move has connected.
 */
function cancelMove(
  fighter: FighterState,
  move: MoveData,
  template: FighterTemplate,
): MoveId | null {
  const command = fighter.bufferedCommand;
  if (!command) return null;

  if (command === 'grab') {
    const early = fighter.actionFrame < THROW_CONVERSION_FRAMES && !fighter.moveConnected;
    return early && move.kind === 'normal' ? 'grab' : null;
  }
  if (!fighter.moveConnected || !move.cancelInto) return null;

  const next = groundMove(
    command,
    fighter.bufferedInput,
    fighter.bufferedMotion,
    fighter.bufferedFacing,
  );
  return next && move.cancelInto.includes(template.moves[next].kind) ? next : null;
}

/** Carries the fighter forward by the move's motion on its current frame. */
function applyMotion(fighter: FighterState, move: MoveData): FighterState {
  const dx = move.motion?.dx[fighter.actionFrame] ?? 0;
  if (dx === 0) return fighter.vx === 0 ? fighter : { ...fighter, vx: 0 };
  const vx = signed(fighter.facing, dx);
  return { ...fighter, vx, x: fighter.x + vx };
}
