import type { MatchConfig } from '../../src/core/config';
import type { InputBits } from '../../src/core/input';
import { createInitialState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { GREYBOX_FIGHTER } from '../../src/data/fighters';
import { TRAINING_STAGE } from '../../src/data/stages';

export const MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [GREYBOX_FIGHTER, GREYBOX_FIGHTER],
};

/** Runs `ticks` ticks with the same inputs held, from `state` (or a fresh match). */
export function run(
  ticks: number,
  inputs: readonly [InputBits, InputBits] = [0, 0],
  state: GameState = createInitialState(MATCH),
  config: MatchConfig = MATCH,
): GameState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = step(current, inputs, config);
  return current;
}
