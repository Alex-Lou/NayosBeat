import type { FighterAction, FighterState } from '../state';

/** One more tick in the current action. */
export function nextFrame(fighter: FighterState): FighterState {
  return { ...fighter, actionFrame: fighter.actionFrame + 1 };
}

/** Starts an action from its first tick. */
export function enter(fighter: FighterState, action: FighterAction): FighterState {
  return { ...fighter, action, actionFrame: 0 };
}

/** Keeps counting while the action goes on (a walk cycle stays in step), or starts it. */
export function continueOrEnter(fighter: FighterState, action: FighterAction): FighterState {
  return fighter.action === action ? nextFrame(fighter) : enter(fighter, action);
}
