import type { MatchConfig } from './config';
import { TRAINING_REFILL_FRAMES } from './rules';
import type { FighterAction, FighterState, GameState } from './state';

/** States in which a fighter is left alone and can be healed. */
const RESTING_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
]);

/**
 * Training mode rule, applied after each tick: health is restored once a fighter has been
 * resting for a moment. (Nobody can be KO'd either: see `applyHit`'s minimum health.)
 */
export function applyTrainingRules(state: GameState, config: MatchConfig): GameState {
  if (!config.training) return state;
  const [a, b] = state.fighters;
  return {
    ...state,
    fighters: [
      trainingHealth(a, config.fighters[0].maxHealth),
      trainingHealth(b, config.fighters[1].maxHealth),
    ],
  };
}

function trainingHealth(fighter: FighterState, maxHealth: number): FighterState {
  const rested =
    RESTING_ACTIONS.has(fighter.action) && fighter.actionFrame >= TRAINING_REFILL_FRAMES;
  return rested && fighter.health !== maxHealth ? { ...fighter, health: maxHealth } : fighter;
}
