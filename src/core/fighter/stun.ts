import type { FighterTemplate } from '../config';
import { has, Input } from '../input';
import { signed } from '../numbers';
import { PUSHBACK_FRICTION } from '../rules';
import type { FighterState } from '../state';
import { nextFrame } from './action';
import { airborne } from './air';

/**
 * One tick of blockstun, hitstun or knockdown, sliding from the blow. Null once it is over:
 * the fighter can act again.
 */
export function updateStun(fighter: FighterState): FighterState | null {
  if (fighter.stunFrames <= 0) return null;
  // The guard can switch between high and low while blocking a string of hits.
  const crouching =
    fighter.action === 'blockstun' ? has(fighter.input, Input.Down) : fighter.crouching;
  return { ...slide(nextFrame(fighter)), stunFrames: fighter.stunFrames - 1, crouching };
}

/** Knocked out: a KO by a knockdown move launches the fighter, even from the ground. */
export function updateKo(fighter: FighterState, template: FighterTemplate): FighterState {
  return fighter.y > 0 || fighter.vy > 0
    ? airborne(nextFrame(fighter), template)
    : slide(nextFrame(fighter));
}

/** Ground slide after a hit or block, slowed down by friction. */
function slide(fighter: FighterState): FighterState {
  if (fighter.vx === 0) return fighter;
  const speed = Math.max(0, Math.abs(fighter.vx) - PUSHBACK_FRICTION);
  const vx = signed(fighter.vx > 0 ? 1 : -1, speed);
  return { ...fighter, x: fighter.x + fighter.vx, vx };
}
