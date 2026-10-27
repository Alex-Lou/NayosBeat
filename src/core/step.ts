import { readInput } from './commands';
import { applyHit, contactOf, findHit, techGrab } from './combat';
import type { MatchConfig } from './config';
import { pushboxOf, updateFighter } from './fighter';
import type { InputBits } from './input';
import type { MoveData } from './move-data';
import { followCamera, resolvePositions } from './positions';
import {
  findProjectileHit,
  placedProjectile,
  updateProjectiles,
  withoutSpent,
  type ProjectileHit,
} from './projectiles';
import { updateRound } from './round';
import { isThreatened } from './threat';
import { applyTrainingRules } from './training';
import { EMPTY_CONTACTS, type Contact, type FighterState, type GameState } from './state';

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
      contacts: EMPTY_CONTACTS,
    };
  }

  const [templateA, templateB] = config.fighters;
  // Threats are read from the previous state, like the opponent's position: no order effect.
  const threatOnA = isThreatened(0, state.fighters, state.projectiles, config);
  const threatOnB = isThreatened(1, state.fighters, state.projectiles, config);
  const movedA = updateFighter(prevA, inputA, templateA, prevB.x, threatOnA);
  const movedB = updateFighter(prevB, inputB, templateB, prevA.x, threatOnB);

  const [a, b] = resolvePositions(
    { fighter: movedA, box: pushboxOf(movedA, templateA) },
    { fighter: movedB, box: pushboxOf(movedB, templateB) },
    state.cameraX,
    config.stage,
  );

  const projectiles = updateProjectiles(state.projectiles, [a, b], state.cameraX, config);
  // Once the round is decided, attacks still play out but can no longer change the result.
  const strikeByA = fighting ? findHit(a, templateA, b, templateB) : null;
  const strikeByB = fighting ? findHit(b, templateB, a, templateA) : null;
  const projectileOnA =
    fighting && !strikeByB ? findProjectileHit(projectiles, 0, a, config) : null;
  const projectileOnB =
    fighting && !strikeByA ? findProjectileHit(projectiles, 1, b, config) : null;
  const minHealth = config.training ? 1 : 0;

  const grabTech = strikeByA?.kind === 'grab' && strikeByB?.kind === 'grab';
  const [nextA, nextB] = grabTech
    ? [techGrab(a, b.x), techGrab(b, a.x)]
    : [
        resolveExchange(a, b.x, strikeByB, strikeByA, projectileOnA, minHealth),
        resolveExchange(b, a.x, strikeByA, strikeByB, projectileOnB, minHealth),
      ];

  const hitstop = grabTech
    ? 0
    : Math.max(
        strikeByA?.hitstop ?? 0,
        strikeByB?.hitstop ?? 0,
        projectileOnA?.move.hitstop ?? 0,
        projectileOnB?.move.hitstop ?? 0,
      );

  const contactOnA = contactOn(0, a, nextA, strikeByB, projectileOnA, b, config);
  const contactOnB = contactOn(1, b, nextB, strikeByA, projectileOnB, a, config);
  const projectileSpent = projectileOnA !== null || projectileOnB !== null;

  const next = applyTrainingRules(
    {
      frame: state.frame + 1,
      cameraX: followCamera(nextA, nextB, config.stage),
      hitstop,
      round: state.round,
      fighters: [nextA, nextB],
      projectiles: projectileSpent
        ? withoutSpent(projectiles, [projectileOnA?.projectile, projectileOnB?.projectile])
        : projectiles,
      contacts: contactsOf(contactOnA, contactOnB),
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
  minHealth: number,
): FighterState {
  if (strikeTaken) return applyHit(fighter, opponentX, strikeTaken, minHealth);
  if (projectileTaken) {
    const { projectile, move } = projectileTaken;
    // The hit comes from behind the projectile, i.e. from the side of whoever fired it.
    return applyHit(fighter, projectile.x - projectile.facing, move, minHealth);
  }
  if (strikeLanded) return { ...fighter, moveConnected: true };
  return fighter;
}

/**
 * What touched the defender on this tick, if anything: the opponent's strike or projectile.
 * `defender` is as it was when the blow was found, `after` once the blow was applied.
 */
function contactOn(
  defenderIndex: 0 | 1,
  defender: FighterState,
  after: FighterState,
  strike: MoveData | null,
  projectileHit: ProjectileHit | null,
  attacker: FighterState,
  config: MatchConfig,
): Contact | null {
  const by = defenderIndex === 0 ? 1 : 0;
  const template = config.fighters[defenderIndex];
  if (strike?.hitbox && attacker.move) {
    const striker = { box: strike.hitbox, x: attacker.x, y: attacker.y, facing: attacker.facing };
    return contactOf(by, attacker.move, striker, defender, template, after);
  }
  if (!projectileHit) return null;
  const { projectile } = projectileHit;
  const striker = placedProjectile(projectile, config);
  return contactOf(by, projectile.move, striker, defender, template, after);
}

/** At most one contact per fighter; the shared empty list when nothing touched. */
function contactsOf(first: Contact | null, second: Contact | null): readonly Contact[] {
  if (first && second) return [first, second];
  if (first) return [first];
  return second ? [second] : EMPTY_CONTACTS;
}
