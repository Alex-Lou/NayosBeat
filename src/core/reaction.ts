import type { FighterTemplate } from './config';
import type { MoveData } from './move-data';
import type { FighterState, Reaction } from './state';

/**
 * How a blow shakes the defender (docs/combat-v2.md §9.4), read from the geometry the core
 * already has, without any data of its own: where the impact lands on the body, its posture,
 * and whether the blow sends it flying.
 */

/** Above this share of the standing body (percent), the head takes it. */
const HIGH_PERCENT = 60;

/** A blow when nothing says where it landed: on the body. */
export const BODY_PERCENT = 50;

/** The reaction to `move`, landing at `impactPercent` of the standing body, on `defender`. */
export function reactionOf(
  defender: FighterState,
  move: MoveData,
  launched: boolean,
  impactPercent: number,
): Reaction {
  if (move.knockdown?.trip) return 'trip';
  if (launched) return 'launch';
  if (defender.crouching) return 'crouch';
  // A low blow, or the lower third of the body: a leg takes it.
  if (move.guard === 'low' || impactPercent * 3 < 100) return 'low';
  return impactPercent > HIGH_PERCENT ? 'high' : 'mid';
}

/**
 * Where a point `height` above the defender's feet stands on its standing body, in percent (its
 * tallest hurtbox gives the height): the same measure crouching, so a leg is a leg.
 */
export function impactPercent(height: number, template: FighterTemplate): number {
  let top = 1;
  for (const box of template.standingHurtboxes) top = Math.max(top, box.y + box.height);
  return Math.trunc((height * 100) / top);
}
