import type { FighterTemplate, MatchConfig } from './config';
import type { MoveData } from './move-data';
import { isActiveFrame, moveOf } from './moves';
import { PROJECTILE_THREAT_RANGE, THREAT_MARGIN } from './rules';
import type { FighterState, ProjectileState } from './state';

/**
 * What menaces a fighter: one rule for the proximity guard (`actOnGround`) and for the CPU, so
 * the CPU sees danger exactly where a player's guard would stop the retreat.
 */

/**
 * How far in front of the attacker a move reaches, in sub-pixels: the front edge of its hitbox
 * (or of the projectile it fires, where it appears), plus how far the move carries the fighter
 * until its last active frame.
 */
export function threatReach(move: MoveData): number {
  let reach = 0;
  if (move.hitbox) reach = move.hitbox.x + move.hitbox.width;
  else if (move.projectile) {
    const { spawnX, hitbox } = move.projectile;
    reach = spawnX + hitbox.x + hitbox.width;
  }
  const dx = move.motion?.dx;
  if (dx) for (let frame = 0; frame < move.startup + move.active; frame++) reach += dx[frame] ?? 0;
  return reach;
}

/**
 * The attacker's move while it is starting up or out: what can still hit. Movements (dashes)
 * never strike, a guard against them would only stop the defender.
 */
export function upcomingMove(attacker: FighterState, template: FighterTemplate): MoveData | null {
  if (!attacker.move) return null;
  const move = moveOf(template, attacker.move);
  if (move.kind === 'movement') return null;
  const upcoming = attacker.actionFrame < move.startup || isActiveFrame(move, attacker.actionFrame);
  return upcoming ? move : null;
}

/** Whether the attacker's coming move would reach a defender standing at `defenderX`. */
export function strikeThreatens(
  attacker: FighterState,
  template: FighterTemplate,
  defenderX: number,
): boolean {
  const move = upcomingMove(attacker, template);
  return move !== null && Math.abs(attacker.x - defenderX) <= threatReach(move) + THREAT_MARGIN;
}

/** Whether a projectile of the opponent flies toward the defender, closer than `range`. */
export function projectileThreatens(
  projectiles: readonly ProjectileState[],
  defenderIndex: 0 | 1,
  defenderX: number,
  range: number = PROJECTILE_THREAT_RANGE,
): boolean {
  for (const projectile of projectiles) {
    if (projectile.owner === defenderIndex) continue;
    const toward = (projectile.facing === 1) === defenderX > projectile.x;
    if (toward && Math.abs(projectile.x - defenderX) < range) return true;
  }
  return false;
}

/** Whether `defender` is menaced by its opponent's blow or projectile, in this state. */
export function isThreatened(
  defenderIndex: 0 | 1,
  fighters: readonly [FighterState, FighterState],
  projectiles: readonly ProjectileState[],
  config: MatchConfig,
): boolean {
  const attackerIndex = defenderIndex === 0 ? 1 : 0;
  const defenderX = fighters[defenderIndex].x;
  return (
    strikeThreatens(fighters[attackerIndex], config.fighters[attackerIndex], defenderX) ||
    projectileThreatens(projectiles, defenderIndex, defenderX)
  );
}
