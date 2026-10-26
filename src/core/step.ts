import { applyHit, findHit } from './combat';
import type { MatchConfig, MoveData } from './config';
import { pushboxOf, readInput, updateFighter } from './fighter';
import type { InputBits } from './input';
import { followCamera, resolvePositions } from './positions';
import { updateRound } from './round';
import type { FighterState, GameState } from './state';

/**
 * Advances the simulation by exactly one tick. Pure: same input, same output.
 * Both fighters are updated from the previous state, and both hits are detected before
 * either is applied, so neither player is favored by processing order (hits can trade).
 */
export function step(
  state: GameState,
  inputs: readonly [InputBits, InputBits],
  config: MatchConfig,
): GameState {
  // Players only control their fighter while the round is being fought.
  const fighting = state.round.phase === 'fight';
  const inputA = fighting ? inputs[0] : 0;
  const inputB = fighting ? inputs[1] : 0;
  const [prevA, prevB] = state.fighters;

  if (state.hitstop > 0) {
    return {
      ...state,
      frame: state.frame + 1,
      hitstop: state.hitstop - 1,
      fighters: [readInput(prevA, inputA, false), readInput(prevB, inputB, false)],
    };
  }

  const [templateA, templateB] = config.fighters;
  const movedA = updateFighter(prevA, inputA, templateA, prevB.x);
  const movedB = updateFighter(prevB, inputB, templateB, prevA.x);

  const [a, b] = resolvePositions(
    { fighter: movedA, box: pushboxOf(movedA, templateA) },
    { fighter: movedB, box: pushboxOf(movedB, templateB) },
    state.cameraX,
    config.stage,
  );

  const hitByA = findHit(a, templateA, b, templateB);
  const hitByB = findHit(b, templateB, a, templateA);
  const nextA = resolveExchange(a, b.x, hitByB, hitByA);
  const nextB = resolveExchange(b, a.x, hitByA, hitByB);

  return updateRound(
    {
      frame: state.frame + 1,
      cameraX: followCamera(nextA, nextB, config.stage),
      hitstop: Math.max(hitByA?.hitstop ?? 0, hitByB?.hitstop ?? 0),
      round: state.round,
      fighters: [nextA, nextB],
    },
    config,
  );
}

/** Applies the hit a fighter took, or marks the move it landed so it cannot hit twice. */
function resolveExchange(
  fighter: FighterState,
  opponentX: number,
  taken: MoveData | null,
  landed: MoveData | null,
): FighterState {
  if (taken) return applyHit(fighter, opponentX, taken);
  if (landed) return { ...fighter, moveConnected: true };
  return fighter;
}
