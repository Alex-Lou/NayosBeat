import type { MatchConfig } from './config';
import { BOOST_MAX, TRAINING_REFILL_FRAMES } from './rules';
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
 * resting for a moment, the dummy's (player 2) to the share the training option says
 * (docs/finisher.md §1.12), and the Boost gauge as its own option says (docs/combos-v3.md
 * §6.5): 'full' back to three bars at the same moment, 'infinite' full on every tick. (Nobody
 * can be KO'd either: see `applyHit`'s minimum health.)
 */
export function applyTrainingRules(state: GameState, config: MatchConfig): GameState {
  if (!config.training) return state;
  const [a, b] = state.fighters;
  const gauge = config.trainingGauge ?? 'normal';
  const dummy = config.trainingDummyHealth ?? 100;
  return {
    ...state,
    fighters: [
      trainingRefill(a, config.fighters[0].maxHealth, 100, gauge),
      trainingRefill(b, config.fighters[1].maxHealth, dummy, gauge),
    ],
  };
}

/** The gauge a fighter starts a training session with: full, unless it plays as in a match. */
export function trainingStartBoost(config: MatchConfig): number {
  return config.training && (config.trainingGauge ?? 'normal') !== 'normal' ? BOOST_MAX : 0;
}

/** Rested, the fighter goes back to `percent` of its `maxHealth` (30: Nayo 300, Riff 270). */
function trainingRefill(
  fighter: FighterState,
  maxHealth: number,
  percent: number,
  gauge: MatchConfig['trainingGauge'],
): FighterState {
  const rested =
    RESTING_ACTIONS.has(fighter.action) && fighter.actionFrame >= TRAINING_REFILL_FRAMES;
  const health = rested ? Math.trunc((maxHealth * percent) / 100) : fighter.health;
  const full = gauge === 'infinite' || (gauge === 'full' && rested);
  const boost = full ? BOOST_MAX : fighter.boost;
  if (health === fighter.health && boost === fighter.boost) return fighter;
  return { ...fighter, health, boost };
}
