import type { FighterTemplate, MatchConfig } from './config';
import { pushboxOf } from './fighter';
import { placePair } from './positions';
import type { Contact, FighterState, HoldState } from './state';

/**
 * The pair of a hold (`hold.ts`): who is held, where it stands against the holder, and where
 * what lands in the hold is reported.
 */

/** The held fighter's index. */
export function heldOf(hold: HoldState): 0 | 1 {
  return hold.holder === 0 ? 1 : 0;
}

/**
 * Distance between the centers of a held pair: touching, their standing bodies side by side
 * (computed from both fighters, not stored).
 */
export function contactDistance(holder: FighterTemplate, held: FighterTemplate): number {
  return Math.trunc((holder.standingPushbox.width + held.standingPushbox.width) / 2);
}

/** The held fighter touching the holder on `side`, the pair kept inside the walls. */
export function placeHeld(
  hold: HoldState,
  holder: FighterState,
  held: FighterState,
  side: 1 | -1,
  cameraX: number,
  config: MatchConfig,
): [FighterState, FighterState] {
  const holderTemplate = config.fighters[hold.holder];
  const heldTemplate = config.fighters[heldOf(hold)];
  return placePair(
    { fighter: holder, box: pushboxOf(holder, holderTemplate) },
    { fighter: held, box: pushboxOf(held, heldTemplate) },
    side,
    contactDistance(holderTemplate, heldTemplate),
    cameraX,
    config.stage,
  );
}

/**
 * What touched in the hold: between the two centers, at the middle of the holder's grab (the
 * collar, the belly the knee finds). `by` the holder, or the held fighter for a tech.
 */
export function holdContact(
  hold: HoldState,
  kind: Contact['kind'],
  holder: FighterState,
  held: FighterState,
  damage: number,
  config: MatchConfig,
): Contact {
  const grab = config.fighters[hold.holder].moves.grab.hitbox;
  const height = grab ? grab.y + Math.trunc(grab.height / 2) : 0;
  return {
    by: kind === 'tech' ? heldOf(hold) : hold.holder,
    kind,
    move: kind === 'tech' ? 'grab' : (holder.move ?? 'grab'),
    x: Math.trunc((holder.x + held.x) / 2),
    y: holder.y + height,
    damage,
    counter: null,
  };
}

/** The two fighters in player order. */
export function pairOf(
  hold: HoldState,
  holder: FighterState,
  held: FighterState,
): readonly [FighterState, FighterState] {
  return hold.holder === 0 ? [holder, held] : [held, holder];
}
