import type { MatchConfig } from './config';
import { TRAINING_REFILL_FRAMES } from './rules';
import type { FighterAction, FighterState, GameState } from './state';

/** States in which a fighter is left alone and can be healed. */
const NEUTRAL_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
]);

/**
 * Training mode rules, applied after each tick: nobody can be KO'd, and health is restored
 * once a fighter has been back in a neutral state for a moment.
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
    NEUTRAL_ACTIONS.has(fighter.action) && fighter.actionFrame >= TRAINING_REFILL_FRAMES;
  const health = rested ? maxHealth : Math.max(1, fighter.health);
  return health === fighter.health ? fighter : { ...fighter, health };
}
