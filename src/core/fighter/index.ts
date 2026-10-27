import { readInput } from '../commands';
import type { BoxSize, FighterTemplate } from '../config';
import type { InputBits } from '../input';
import type { FighterState } from '../state';
import { nextFrame } from './action';
import { airborne, takeOff, updateAir } from './air';
import { updateMove } from './move';
import { actOnGround } from './neutral';
import { updateKo, updateStun } from './stun';

/**
 * Advances one fighter by one tick: input, state machine, velocity and position.
 * Input is only acted upon in grounded neutral states (and once per jump in the air);
 * every other action plays out on its own. An action lasting N ticks occupies exactly N ticks.
 * Stage bounds, collisions and hits are resolved afterwards, in `step`.
 */
export function updateFighter(
  fighter: FighterState,
  rawInput: InputBits,
  template: FighterTemplate,
  opponentX: number,
): FighterState {
  const f = readInput(fighter, rawInput, true);

  switch (f.action) {
    case 'preJump':
      return f.actionFrame + 1 >= template.preJumpFrames ? takeOff(f, template) : nextFrame(f);
    case 'air':
      return updateAir(f, template);
    case 'airAttack':
    case 'airHit':
      return airborne(nextFrame(f), template);
    case 'ko':
      return updateKo(f, template);
    case 'landing':
      return f.actionFrame + 1 >= template.landingFrames
        ? actOnGround(f, template, opponentX)
        : nextFrame(f);
    case 'attack':
      return updateMove(f, template) ?? actOnGround(f, template, opponentX);
    case 'blockstun':
    case 'hitstun':
    case 'knockdown':
      return updateStun(f) ?? actOnGround(f, template, opponentX);
    default:
      return actOnGround(f, template, opponentX);
  }
}

export function pushboxOf(fighter: FighterState, template: FighterTemplate): BoxSize {
  return fighter.crouching ? template.crouchingPushbox : template.standingPushbox;
}
