import { overlaps, toWorld, type WorldBox } from './boxes';
import { canBeHit, touchedHurtbox, type PlacedBox } from './combat';
import type { MatchConfig } from './config';
import { CAMERA_WIDTH_PX, px } from './constants';
import type { MoveData, ProjectileData } from './move-data';
import { signed } from './numbers';
import { NO_PROJECTILES, type FighterState, type ProjectileState } from './state';

/** Projectiles disappear once this far past the screen edge. */
const OFFSCREEN_MARGIN = px(32);
const HALF_CAMERA_WIDTH = Math.trunc(px(CAMERA_WIDTH_PX) / 2);

export interface ProjectileHit {
  readonly projectile: ProjectileState;
  readonly move: MoveData;
}

function projectileData(projectile: ProjectileState, config: MatchConfig): MoveData {
  return config.fighters[projectile.owner].moves[projectile.move];
}

/** The projectile's hitbox, placed where it flies (on the ground line). */
export function placedProjectile(projectile: ProjectileState, config: MatchConfig): PlacedBox {
  const box = projectileSpec(projectile, config).hitbox;
  return { box, x: projectile.x, y: 0, facing: projectile.facing };
}

/** For drawing: collisions place the box with `overlaps`, without allocating. */
export function projectileBox(projectile: ProjectileState, config: MatchConfig): WorldBox {
  return toWorld(projectileSpec(projectile, config).hitbox, projectile.x, 0, projectile.facing);
}

/**
 * Moves existing projectiles, drops those off screen, then fires new ones from fighters
 * reaching the first active frame of a projectile move (one projectile per player at a time).
 */
export function updateProjectiles(
  projectiles: readonly ProjectileState[],
  fighters: readonly [FighterState, FighterState],
  cameraX: number,
  config: MatchConfig,
): readonly ProjectileState[] {
  const [first, second] = fighters;
  // The common case, nothing in flight and nothing fired, allocates nothing.
  if (projectiles.length === 0 && !firing(first, 0, config) && !firing(second, 1, config)) {
    return NO_PROJECTILES;
  }
  const minX = cameraX - HALF_CAMERA_WIDTH - OFFSCREEN_MARGIN;
  const maxX = cameraX + HALF_CAMERA_WIDTH + OFFSCREEN_MARGIN;

  const result: ProjectileState[] = [];
  for (const projectile of projectiles) {
    const x = projectile.x + signed(projectile.facing, projectileSpec(projectile, config).speed);
    if (x >= minX && x <= maxX) result.push({ ...projectile, x });
  }

  for (const owner of [0, 1] as const) {
    const fighter = fighters[owner];
    const spec = firing(fighter, owner, config);
    if (!spec || !fighter.move || result.some((p) => p.owner === owner)) continue;
    result.push({
      owner,
      move: fighter.move,
      x: fighter.x + signed(fighter.facing, spec.spawnX),
      facing: fighter.facing,
    });
  }

  return removeClashes(result, config);
}

/** The projectiles left once those that hit are spent. */
export function withoutSpent(
  projectiles: readonly ProjectileState[],
  spent: readonly (ProjectileState | undefined)[],
): readonly ProjectileState[] {
  const left = projectiles.filter((p) => !spent.includes(p));
  return left.length === 0 ? NO_PROJECTILES : left;
}

/** The projectile hitting `defender` on this tick, if any. */
export function findProjectileHit(
  projectiles: readonly ProjectileState[],
  defenderIndex: 0 | 1,
  defender: FighterState,
  config: MatchConfig,
): ProjectileHit | null {
  const template = config.fighters[defenderIndex];
  if (!canBeHit(defender, template)) return null;
  for (const projectile of projectiles) {
    if (projectile.owner === defenderIndex) continue;
    const box = projectileSpec(projectile, config).hitbox;
    if (touchedHurtbox(box, projectile.x, 0, projectile.facing, defender, template)) {
      return { projectile, move: projectileData(projectile, config) };
    }
  }
  return null;
}

/** The projectile the fighter's move fires on this tick, if it reaches that frame now. */
function firing(fighter: FighterState, owner: 0 | 1, config: MatchConfig): ProjectileData | null {
  if (fighter.action !== 'attack' || !fighter.move) return null;
  const move = config.fighters[owner].moves[fighter.move];
  return move.projectile && fighter.actionFrame === move.startup ? move.projectile : null;
}

/** The projectile description of the move that fired it (guaranteed by data validation). */
function projectileSpec(projectile: ProjectileState, config: MatchConfig): ProjectileData {
  const spec = projectileData(projectile, config).projectile;
  if (!spec) throw new Error(`Move ${projectile.move} has no projectile`);
  return spec;
}

/** Opposing projectiles that meet cancel each other out. */
function removeClashes(
  projectiles: ProjectileState[],
  config: MatchConfig,
): readonly ProjectileState[] {
  const first = projectiles.find((p) => p.owner === 0);
  const second = projectiles.find((p) => p.owner === 1);
  if (first && second && clash(first, second, config)) {
    return withoutSpent(projectiles, [first, second]);
  }
  return projectiles.length === 0 ? NO_PROJECTILES : projectiles;
}

function clash(first: ProjectileState, second: ProjectileState, config: MatchConfig): boolean {
  const a = projectileSpec(first, config).hitbox;
  const b = projectileSpec(second, config).hitbox;
  return overlaps(a, first.x, 0, first.facing, b, second.x, 0, second.facing);
}
