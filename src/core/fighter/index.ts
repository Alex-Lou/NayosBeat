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
 * always tells, a fighter tested alone is left in peace. `discOut`: the fighter's projectile
 * still flies, so BOOST does not pay for a second one (see `groundMove`). `armed`: the
 * Finisher is ready (`finisherReady`, read by `step` from the previous state), so the super
 * starts armed.
 */
export function updateFighter(
  fighter: FighterState,
  rawInput: InputBits,
  template: FighterTemplate,
  opponentX: number,
  threatened = false,
  discOut = false,
  armed = false,
): FighterState {
  const read = readInput(fighter, rawInput, true, opponentX);
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
        ? actOnGround(f, template, opponentX, threatened, discOut, armed)
        : nextFrame(f);
    case 'attack':
      return (
        updateMove(f, template, discOut, armed) ??
        actOnGround(f, template, opponentX, threatened, discOut, armed)
      );
    case 'blockstun':
    case 'hitstun':
    case 'tech':
    case 'knockdown': {
      const stunned = updateStun(f);
      if (stunned) return stunned;
      // Out of the stun, grabs whiff for a moment: a throw cannot be looped on the wake-up.
      const free = { ...f, throwImmuneFrames: THROW_PROTECTION_FRAMES };
      return actOnGround(free, template, opponentX, threatened, discOut, armed);
    }
    default:
      return actOnGround(f, template, opponentX, threatened, discOut, armed);
  }
}

/** The fighter's body for collisions: raised and slimmer in the air, flat when lying down. */
export function pushboxOf(fighter: FighterState, template: FighterTemplate): Pushbox {
  // The raised air body lets a jump pass over a crouching opponent (cross-ups, D7). A ground
  // move that leaves the ground (the Saut de l'ange) keeps its body, carried at its height: it
  // would otherwise sink into the crouching opponent it targets, then be shoved out on impact.
  if (fighter.y > 0 && fighter.action !== 'attack') return template.airPushbox;
  if (fighter.action === 'knockdown') return template.lyingPushbox;
  return fighter.crouching ? template.crouchingPushbox : template.standingPushbox;
}
