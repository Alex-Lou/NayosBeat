import type { ClipId } from '../art/types';
import type { FighterState } from '../core/state';

/**
 * Which clip shows a fighter struck (docs/art/animation-plan.md §5): its own module, so the
 * varied reactions are chosen here without touching the rest of the animation. Today's choice:
 * by where the blow landed, standing; swept or launched, sent flying.
 */

/**
 * Hit standing: the head, the belly or a leg, by where the blow landed (§9.4); the whole
 * reaction for a long stun, its quick version otherwise. Crouching, the crouching one.
 */
export function hitClipOf(fighter: FighterState): ClipId {
  if (fighter.crouching) return 'hitCrouch';
  const heavy = fighter.reactionHeavy;
  switch (fighter.reaction) {
    case 'high':
      return heavy ? 'hitHigh' : 'hitHighLight';
    case 'low':
      return heavy ? 'hitLow' : 'hitLowLight';
    default:
      return heavy ? 'hitMid' : 'hitMidLight';
  }
}

/** Sent flying: swept off the legs by a sweep, launched otherwise. */
export function flightClipOf(fighter: FighterState): ClipId {
  return fighter.reaction === 'trip' ? 'trip' : 'airHit';
}

/** Off the ground, or leaving it on this tick (the blow that sends it flying has just landed). */
export function isAirborne(fighter: FighterState): boolean {
  return fighter.y > 0 || fighter.vy > 0;
}
