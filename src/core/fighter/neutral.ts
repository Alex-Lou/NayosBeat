import type { FighterTemplate } from '../config';
import { has, horizontalDirection, Input } from '../input';
import { groundMove } from '../moves';
import { signed } from '../numbers';
import { sideOf } from '../side';
import { VICTIM_FLAGS, type FighterState } from '../state';
import { continueOrEnter, enter } from './action';
import { startGroundMove, superGauge } from './move';

/**
 * Neutral grounded state: the only place where the player chooses what to do next. A command
 * buffered while busy comes out first (attack, grab, dash, jump), then what is held: up jumps,
 * back guards in place when the opponent threatens (`threatened`) and walks back otherwise.
 * `discOut`: the fighter's projectile still flies (see `groundMove`).
 */
export function actOnGround(
  fighter: FighterState,
  template: FighterTemplate,
  opponentX: number,
  threatened: boolean,
  discOut = false,
): FighterState {
  const f: FighterState = {
    ...fighter,
    // Grounded fighters always turn to face their opponent; airborne ones keep their side.
    facing: sideOf(fighter, opponentX),
    move: null,
    comboCount: 0,
    vx: 0,
    // On its feet again, the combo it took is over, and its marks with it.
    flags: fighter.flags & ~VICTIM_FLAGS,
  };
  const input = f.input;
  const crouching = has(input, Input.Down) && !has(input, Input.Up);

  const command = f.bufferedCommand;
  const move = command
    ? groundMove(
        command,
        f.bufferedInput,
        f.bufferedMotion,
        f.bufferedFacing,
        template.moves,
        superGauge(f),
        discOut,
      )
    : null;
  if (move) return startGroundMove(f, move, template);
  if (command === 'jump' || has(input, Input.Up) || has(input, Input.Jump)) {
    return { ...enter(f, 'preJump'), crouching: false, bufferedCommand: null, bufferFrames: 0 };
  }

  const direction = horizontalDirection(input);
  // The proximity guard: the fighter stops in its guard instead of walking out of range of a
  // blow it was about to block, and the guard shows.
  if (threatened && direction === -f.facing) {
    return { ...continueOrEnter(f, 'guard'), crouching };
  }
  if (crouching) {
    return { ...continueOrEnter(f, 'crouch'), crouching: true };
  }
  if (direction === 0) {
    return { ...continueOrEnter(f, 'idle'), crouching: false };
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
