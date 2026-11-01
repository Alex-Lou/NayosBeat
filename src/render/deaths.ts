import type { ClipId } from '../art/types';
import type { FighterState } from '../core/state';
import { flightClipOf, isAirborne } from './reactions';

/**
 * Which clip shows a fighter knocked out (docs/art/animation-plan.md §4): its own module, so the
 * varied deaths are chosen here without touching the rest of the animation. Today, one death.
 *
 * Sent flying (a launcher, a sweep, a throw, a blow in the air), it flies as any fighter sent
 * flying until the body lands, then plays the ko from the frame it meets the floor
 * (`koLanding`), on the clock the landing restarts: it never hovers upright through the first
 * frames of a ko drawn on its feet. On its feet, the whole ko.
 */
export function deathClipOf(fighter: FighterState): ClipId {
  if (isAirborne(fighter)) return flightClipOf(fighter);
  const { reaction } = fighter;
  return reaction === 'launch' || reaction === 'trip' || reaction === 'thrown' ? 'koLanding' : 'ko';
}
