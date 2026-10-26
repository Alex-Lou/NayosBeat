import { applyHit, findHit, techThrow } from './combat';
import type { MatchConfig, MoveData } from './config';
import { pushboxOf, readInput, updateFighter } from './fighter';
import type { InputBits } from './input';
import { followCamera, resolvePositions } from './positions';
import { findProjectileHit, updateProjectiles, type ProjectileHit } from './projectiles';
import { updateRound } from './round';
import { applyTrainingRules } from './training';
import type { FighterState, GameState } from './state';

/**
 * Advances the simulation by exactly one tick. Pure: same input, same output.
 * Both fighters are updated from the previous state, and every hit is detected before any
 * is applied, so neither player is favored by processing order (hits can trade).
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

  const projectiles = updateProjectiles(state.projectiles, [a, b], state.cameraX, config);
  const strikeByA = findHit(a, templateA, b, templateB);
  const strikeByB = findHit(b, templateB, a, templateA);
  const projectileOnA = strikeByB ? null : findProjectileHit(projectiles, 0, a, config);
  const projectileOnB = strikeByA ? null : findProjectileHit(projectiles, 1, b, config);

  const throwTech = strikeByA?.kind === 'throw' && strikeByB?.kind === 'throw';
  const [nextA, nextB] = throwTech
    ? [techThrow(a, b.x), techThrow(b, a.x)]
    : [
        resolveExchange(a, b.x, strikeByB, strikeByA, projectileOnA),
        resolveExchange(b, a.x, strikeByA, strikeByB, projectileOnB),
      ];

  const spent = [projectileOnA?.projectile, projectileOnB?.projectile];
  const hitstop = throwTech
    ? 0
    : Math.max(
        strikeByA?.hitstop ?? 0,
        strikeByB?.hitstop ?? 0,
        projectileOnA?.move.hitstop ?? 0,
        projectileOnB?.move.hitstop ?? 0,
      );

  const next = applyTrainingRules(
    {
      frame: state.frame + 1,
      cameraX: followCamera(nextA, nextB, config.stage),
      hitstop,
      round: state.round,
      fighters: [nextA, nextB],
      projectiles: projectiles.filter((p) => !spent.includes(p)),
    },
    config,
  );
  return updateRound(next, config);
}

/**
 * Applies the strike or projectile a fighter took, or marks the move it landed so it
 * cannot hit twice (and can now be cancelled).
 */
function resolveExchange(
  fighter: FighterState,
  opponentX: number,
  strikeTaken: MoveData | null,
  strikeLanded: MoveData | null,
  projectileTaken: ProjectileHit | null,
): FighterState {
  if (strikeTaken) return applyHit(fighter, opponentX, strikeTaken);
  if (projectileTaken) {
    const { projectile, move } = projectileTaken;
    // The hit comes from behind the projectile, i.e. from the side of whoever fired it.
    return applyHit(fighter, projectile.x - projectile.facing, move);
  }
  if (strikeLanded) return { ...fighter, moveConnected: true };
  return fighter;
}
