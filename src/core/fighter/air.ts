import type { FighterTemplate } from '../config';
import { horizontalDirection } from '../input';
import { airMove } from '../moves';
import { signed } from '../numbers';
import type { FighterState } from '../state';
import { enter, nextFrame } from './action';
import { startAttack } from './move';

/** Airborne and free: the buffered command may start an air attack, once per jump. */
export function updateAir(fighter: FighterState, template: FighterTemplate): FighterState {
  const move = fighter.bufferedCommand ? airMove(fighter.bufferedCommand) : null;
  return move
    ? airborne(startAttack(fighter, 'airAttack', move), template)
    : airborne(nextFrame(fighter), template);
}

/** The jump direction is locked at take-off and cannot be changed in the air. */
export function takeOff(fighter: FighterState, template: FighterTemplate): FighterState {
  const direction = horizontalDirection(fighter.input);
  const forward = direction === fighter.facing;
  const vx = signed(direction, forward ? template.jumpForwardSpeed : template.jumpBackSpeed);
  return airborne({ ...enter(fighter, 'air'), vx, vy: template.jumpVelocity }, template);
}

/** Applies gravity and handles the landing, which depends on how the fighter was airborne. */
export function airborne(fighter: FighterState, template: FighterTemplate): FighterState {
  const vy = fighter.vy - template.gravity;
  const y = fighter.y + vy;
  const x = fighter.x + fighter.vx;
  if (y > 0) return { ...fighter, x, y, vy };

  const grounded: FighterState = { ...fighter, x, y: 0, vx: 0, vy: 0 };
  switch (fighter.action) {
    case 'airHit':
      return { ...enter(grounded, 'knockdown'), stunFrames: template.knockdownFrames };
    case 'ko':
      return grounded;
    default:
      return { ...enter(grounded, 'landing'), move: null };
  }
}
