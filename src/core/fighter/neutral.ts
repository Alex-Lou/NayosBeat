import type { FighterTemplate } from '../config';
import { has, horizontalDirection, Input } from '../input';
import { groundMove } from '../moves';
import { signed } from '../numbers';
import type { Facing, FighterState } from '../state';
import { continueOrEnter, enter } from './action';
import { startGroundMove } from './move';

/** Neutral grounded state: the only place where the player chooses what to do next. */
export function actOnGround(
  fighter: FighterState,
  template: FighterTemplate,
  opponentX: number,
): FighterState {
  const f: FighterState = {
    ...fighter,
    facing: faceOpponent(fighter, opponentX),
    move: null,
    comboCount: 0,
    vx: 0,
  };
  const input = f.input;
  const crouching = has(input, Input.Down) && !has(input, Input.Up);

  const command = f.bufferedCommand;
  const move = command
    ? groundMove(command, f.bufferedInput, f.bufferedMotion, f.bufferedFacing)
    : null;
  if (move) return startGroundMove(f, move, template);
  if (has(input, Input.Up) || has(input, Input.Jump)) {
    return { ...enter(f, 'preJump'), crouching: false, vx: 0 };
  }
  if (crouching) {
    return { ...continueOrEnter(f, 'crouch'), crouching: true, vx: 0 };
  }

  const direction = horizontalDirection(input);
  if (direction === 0) {
    return { ...continueOrEnter(f, 'idle'), crouching: false, vx: 0 };
  }

  const forward = direction === f.facing;
  const vx = signed(direction, forward ? template.walkForwardSpeed : template.walkBackSpeed);
  return {
    ...continueOrEnter(f, forward ? 'walkForward' : 'walkBack'),
    crouching: false,
    vx,
    x: f.x + vx,
  };
}

/** Grounded fighters always turn to face their opponent; airborne ones keep their side. */
function faceOpponent(fighter: FighterState, opponentX: number): Facing {
  if (opponentX === fighter.x) return fighter.facing;
  return opponentX > fighter.x ? 1 : -1;
}
