import { intersects, toWorld, type WorldBox } from './boxes';
import { canBeHit, hurtboxInWorld } from './combat';
import type { MatchConfig, MoveData } from './config';
import { CAMERA_WIDTH_PX, px } from './constants';
import type { FighterState, ProjectileState } from './state';

/** Projectiles disappear once this far past the screen edge. */
const OFFSCREEN_MARGIN = px(32);
const HALF_CAMERA_WIDTH = Math.trunc(px(CAMERA_WIDTH_PX) / 2);

export interface ProjectileHit {
  readonly projectile: ProjectileState;
  readonly move: MoveData;
}

export function projectileData(projectile: ProjectileState, config: MatchConfig): MoveData {
  return config.fighters[projectile.owner].moves[projectile.move];
}

export function projectileBox(projectile: ProjectileState, config: MatchConfig): WorldBox {
  const hitbox = projectileData(projectile, config).projectile?.hitbox;
  if (!hitbox) throw new Error(`Move ${projectile.move} has no projectile`);
  return toWorld(hitbox, projectile.x, 0, projectile.facing);
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
): ProjectileState[] {
  const minX = cameraX - HALF_CAMERA_WIDTH - OFFSCREEN_MARGIN;
  const maxX = cameraX + HALF_CAMERA_WIDTH + OFFSCREEN_MARGIN;

  const result: ProjectileState[] = [];
  for (const projectile of projectiles) {
    const speed = projectileData(projectile, config).projectile?.speed ?? 0;
    const x = projectile.x + projectile.facing * speed;
    if (x >= minX && x <= maxX) result.push({ ...projectile, x });
  }

  for (const owner of [0, 1] as const) {
    const fighter = fighters[owner];
    if (fighter.action !== 'attack' || !fighter.move) continue;
    const move = config.fighters[owner].moves[fighter.move];
    if (!move.projectile || fighter.actionFrame !== move.startup) continue;
    if (result.some((p) => p.owner === owner)) continue;
    result.push({
      owner,
      move: fighter.move,
      x: fighter.x + fighter.facing * move.projectile.spawnX,
      facing: fighter.facing,
    });
  }

  return removeClashes(result, config);
}

/** Opposing projectiles that meet cancel each other out. */
function removeClashes(
  projectiles: readonly ProjectileState[],
  config: MatchConfig,
): ProjectileState[] {
  const first = projectiles.find((p) => p.owner === 0);
  const second = projectiles.find((p) => p.owner === 1);
  if (first && second && intersects(projectileBox(first, config), projectileBox(second, config))) {
    return projectiles.filter((p) => p !== first && p !== second);
  }
  return [...projectiles];
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
  const hurtbox = hurtboxInWorld(defender, template);
  for (const projectile of projectiles) {
    if (projectile.owner === defenderIndex) continue;
    if (intersects(projectileBox(projectile, config), hurtbox)) {
      return { projectile, move: projectileData(projectile, config) };
    }
  }
  return null;
}
