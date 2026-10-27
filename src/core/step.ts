import { readInput } from './commands';
import { applyHit, contactOf, findHit, techGrab } from './combat';
import type { MatchConfig } from './config';
import { pushboxOf, updateFighter } from './fighter';
import { startHold, struggleInHitstop, updateHold, type HoldTick } from './hold';
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
import {
  EMPTY_CONTACTS,
  type Contact,
  type FighterState,
  type GameState,
  type HoldState,
  type ProjectileState,
} from './state';

/**
 * Advances the simulation by exactly one tick. Pure: same input, same output.
 * Both fighters are updated from the previous state, and every hit is detected before any
 * is applied, so neither player is favored by processing order (hits can trade). A hold
 * (`hold.ts`) plays the pair on its own, until it is over.
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

  if (state.hitstop > 0) return frozen(state, inputA, inputB);
  if (!state.hold) return freeTick(state, inputA, inputB, fighting, config);

  const held = updateHold(state, state.hold, [inputA, inputB], fighting, config);
  // Projectiles fly on, through the pair.
  const projectiles = updateProjectiles(state.projectiles, held.fighters, state.cameraX, config);
  return concluded(state, held, projectiles, config);
}

/**
 * The impact freeze: only the input is read (the buffer and the double tap do not age), and a
 * held fighter's struggle still counts.
 */
function frozen(state: GameState, inputA: InputBits, inputB: InputBits): GameState {
  const [prevA, prevB] = state.fighters;
  const fighters = [
    readInput(prevA, inputA, false, prevB.x),
    readInput(prevB, inputB, false, prevA.x),
  ] as const;
  return {
    ...state,
    frame: state.frame + 1,
    hitstop: state.hitstop - 1,
    fighters,
    contacts: EMPTY_CONTACTS,
    hold: state.hold && struggleInHitstop(state.hold, state.fighters, fighters),
  };
}

/**
 * A tick without a hold: both fighters, their positions, the projectiles, then every blow found
 * before any is applied. A blow (strike or projectile) beats a grab on the same tick, two grabs
 * tech, a grab alone catches (docs/combat-v2.md §4.2).
 */
function freeTick(
  state: GameState,
  inputA: InputBits,
  inputB: InputBits,
  fighting: boolean,
  config: MatchConfig,
): GameState {
  const [prevA, prevB] = state.fighters;
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
  const landedByA = fighting ? findHit(a, templateA, b, templateB) : null;
  const landedByB = fighting ? findHit(b, templateB, a, templateA) : null;
  const grabByA = landedByA?.kind === 'grab' ? landedByA : null;
  const grabByB = landedByB?.kind === 'grab' ? landedByB : null;
  const strikeByA = grabByA ? null : landedByA;
  const strikeByB = grabByB ? null : landedByB;
  const projectileOnA =
    fighting && !strikeByB ? findProjectileHit(projectiles, 0, a, config) : null;
  const projectileOnB =
    fighting && !strikeByA ? findProjectileHit(projectiles, 1, b, config) : null;

  const blow = strikeByA ?? strikeByB ?? projectileOnA ?? projectileOnB;
  if (!blow && (grabByA || grabByB)) {
    const fighters = [a, b] as const;
    const teched = grabByA && grabByB ? techTick(fighters, config) : null;
    const held = teched ?? startHold(grabByA ? 0 : 1, fighters, state.cameraX, config);
    return concluded(state, held, projectiles, config);
  }

  const minHealth = config.training ? 1 : 0;
  const nextA = resolveExchange(a, b.x, strikeByB, strikeByA, projectileOnA, minHealth);
  const nextB = resolveExchange(b, a.x, strikeByA, strikeByB, projectileOnB, minHealth);
  const hitstop = Math.max(
    strikeByA?.hitstop ?? 0,
    strikeByB?.hitstop ?? 0,
    projectileOnA?.move.hitstop ?? 0,
    projectileOnB?.move.hitstop ?? 0,
  );
  const contactOnA = contactOn(0, a, nextA, strikeByB, projectileOnA, b, config);
  const contactOnB = contactOn(1, b, nextB, strikeByA, projectileOnB, a, config);
  const projectileSpent = projectileOnA !== null || projectileOnB !== null;

  // The quiet tick's path: its pieces are passed as they are, no tick record is built.
  return assembled(
    state,
    [nextA, nextB],
    null,
    contactsOf(contactOnA, contactOnB),
    hitstop,
    projectileSpent
      ? withoutSpent(projectiles, [projectileOnA?.projectile, projectileOnB?.projectile])
      : projectiles,
    config,
  );
}

/** Both grabs caught on the same tick: a tech, each one reported where its grab met the body. */
function techTick(fighters: readonly [FighterState, FighterState], config: MatchConfig): HoldTick {
  const [a, b] = fighters;
  const nextA = techGrab(a, b.x);
  const nextB = techGrab(b, a.x);
  return {
    fighters: [nextA, nextB],
    hold: null,
    contacts: [grabContact(0, a, b, nextB, config), grabContact(1, b, a, nextA, config)],
    hitstop: 0,
  };
}

/** The tech of `by`'s grab: where it met the opponent's body. */
function grabContact(
  by: 0 | 1,
  grabber: FighterState,
  defender: FighterState,
  after: FighterState,
  config: MatchConfig,
): Contact {
  const box = config.fighters[by].moves.grab.hitbox;
  if (!box) throw new Error('The grab has no hitbox');
  const striker = { box, x: grabber.x, y: grabber.y, facing: grabber.facing };
  const template = config.fighters[by === 0 ? 1 : 0];
  return contactOf(by, 'grab', striker, defender, template, after, 'tech');
}

/** The end of a tick the hold (or a grab) produced. */
function concluded(
  state: GameState,
  tick: HoldTick,
  projectiles: readonly ProjectileState[],
  config: MatchConfig,
): GameState {
  const { fighters, hold, contacts, hitstop } = tick;
  return assembled(state, fighters, hold, contacts, hitstop, projectiles, config);
}

/** The tick's end, the same for every tick: camera, training rules, round. */
function assembled(
  state: GameState,
  fighters: readonly [FighterState, FighterState],
  hold: HoldState | null,
  contacts: readonly Contact[],
  hitstop: number,
  projectiles: readonly ProjectileState[],
  config: MatchConfig,
): GameState {
  const [a, b] = fighters;
  const next = applyTrainingRules(
    {
      frame: state.frame + 1,
      cameraX: followCamera(a, b, config.stage),
      hitstop,
      round: state.round,
      fighters,
      projectiles,
      contacts,
      hold,
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
