import { readInput } from '../commands';
import type { FighterTemplate, Pushbox } from '../config';
import type { InputBits } from '../input';
import { THROW_PROTECTION_FRAMES } from '../rules';
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
 * Stage bounds, collisions and hits are resolved afterwards, in `step`. `threatened` says
 * whether the opponent menaces this fighter (see `threat.ts`), for the proximity guard; `step`
 * always tells, a fighter tested alone is left in peace.
 */
export function updateFighter(
  fighter: FighterState,
  rawInput: InputBits,
  template: FighterTemplate,
  opponentX: number,
  threatened = false,
): FighterState {
  const read = readInput(fighter, rawInput, true);
  // Allocates only on the few ticks the protection lasts.
  const f =
    read.throwImmuneFrames > 0 ? { ...read, throwImmuneFrames: read.throwImmuneFrames - 1 } : read;

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
        ? actOnGround(f, template, opponentX, threatened)
        : nextFrame(f);
    case 'attack':
      return updateMove(f, template) ?? actOnGround(f, template, opponentX, threatened);
    case 'blockstun':
    case 'hitstun':
    case 'knockdown': {
      const stunned = updateStun(f);
      if (stunned) return stunned;
      // Out of the stun, grabs whiff for a moment: a throw cannot be looped on the wake-up.
      const free = { ...f, throwImmuneFrames: THROW_PROTECTION_FRAMES };
      return actOnGround(free, template, opponentX, threatened);
    }
    default:
      return actOnGround(f, template, opponentX, threatened);
  }
}

/** The fighter's body for collisions: raised and slimmer in the air, flat when lying down. */
export function pushboxOf(fighter: FighterState, template: FighterTemplate): Pushbox {
  if (fighter.y > 0) return template.airPushbox;
  if (fighter.action === 'knockdown') return template.lyingPushbox;
  return fighter.crouching ? template.crouchingPushbox : template.standingPushbox;
}
