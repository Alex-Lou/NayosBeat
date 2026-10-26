import type { GameState } from './state';

/** Advances the simulation by exactly one tick. Pure: same input, same output. */
export function step(state: GameState): GameState {
  return { frame: state.frame + 1 };
}
