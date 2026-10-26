import type { MatchConfig } from './config';
import { pushboxOf, updateFighter } from './fighter';
import type { InputBits } from './input';
import { followCamera, resolvePositions } from './positions';
import type { GameState } from './state';

/**
 * Advances the simulation by exactly one tick. Pure: same input, same output.
 * Both fighters are updated from the previous state, so neither player is favored by
 * processing order.
 */
export function step(
  state: GameState,
  inputs: readonly [InputBits, InputBits],
  config: MatchConfig,
): GameState {
  const [statsA, statsB] = config.fighters;
  const [prevA, prevB] = state.fighters;

  const movedA = updateFighter(prevA, inputs[0], statsA, prevB.x);
  const movedB = updateFighter(prevB, inputs[1], statsB, prevA.x);

  const [a, b] = resolvePositions(
    { fighter: movedA, box: pushboxOf(movedA, statsA) },
    { fighter: movedB, box: pushboxOf(movedB, statsB) },
    state.cameraX,
    config.stage,
  );

  return {
    frame: state.frame + 1,
    cameraX: followCamera(a, b, config.stage),
    fighters: [a, b],
  };
}
