import { cpuStep, createCpu, type CpuLevel } from '../../src/ai/cpu';
import type { MatchConfig } from '../../src/core/config';
import { createInitialState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';

/**
 * Plays `ticks` ticks of CPU against CPU, starting a new match whenever one ends, and calls
 * `visit` with every state. Both CPUs are seeded: the same call always plays the same games.
 */
export function playCpuMatches(
  ticks: number,
  config: MatchConfig,
  levels: readonly [CpuLevel, CpuLevel] = ['hard', 'hard'],
  visit?: (state: GameState) => void,
): GameState {
  let state = createInitialState(config);
  let a = createCpu(0, levels[0], 1);
  let b = createCpu(1, levels[1], 2);
  const inputs: [number, number] = [0, 0];
  for (let i = 0; i < ticks; i++) {
    if (state.round.phase === 'matchEnd') state = createInitialState(config);
    const decisionA = cpuStep(a, state, config);
    const decisionB = cpuStep(b, state, config);
    a = decisionA.cpu;
    b = decisionB.cpu;
    inputs[0] = decisionA.input;
    inputs[1] = decisionB.input;
    state = step(state, inputs, config);
    visit?.(state);
  }
  return state;
}
