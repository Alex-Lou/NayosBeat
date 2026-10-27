/** Frame data of the moves, passed to the simulation. Distances in sub-pixels, durations in ticks. */

import type { Box } from './config';

/** Every move a fighter must define: validation checks them all. */
export const CORE_MOVE_IDS = [
  'standLight',
  'standHeavy',
  'crouchLight',
  'crouchHeavy',
  'jumpLight',
  'jumpHeavy',
  'special',
  'specialForward',
  'specialAntiAir',
  'grab',
] as const;

export type CoreMoveId = (typeof CORE_MOVE_IDS)[number];
export type MoveId = CoreMoveId;

/** Moves performed in the air (a projectile there would never be fired). */
export const AIR_MOVE_IDS: readonly MoveId[] = ['jumpLight', 'jumpHeavy'];

/** Decides what a move can cancel into, and how it is blocked (grabs cannot be). */
export type MoveKind = 'normal' | 'special' | 'grab';

/** How a move must be blocked: low = crouching, overhead = standing, mid = either. */
export type Guard = 'mid' | 'low' | 'overhead';

/** A range of action frames: `from` included, `to` excluded. */
export interface FrameRange {
  readonly from: number;
  readonly to: number;
}

export interface ProjectileData {
  /** Horizontal speed, in sub-pixels per tick. */
  readonly speed: number;
  /** Spawn distance in front of the fighter. */
  readonly spawnX: number;
  /** Relative to the projectile's position (a point on the ground line). */
  readonly hitbox: Box;
}

/**
 * How a move carries the fighter: `dx[f]` is the forward movement on action frame `f`, one
 * entry per frame of the move. Data, not code, so every way of moving shares one mechanism.
 */
export interface RootMotion {
  readonly dx: readonly number[];
}

export interface MoveData {
  /** Display name, shown in training mode. */
  readonly name: string;
  readonly kind: MoveKind;
  /** Ticks before the first active tick. */
  readonly startup: number;
  /** Ticks during which the hitbox can hit. */
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  /** Ticks the defender cannot act after being hit (or blocking). */
  readonly hitstun: number;
  readonly blockstun: number;
  /** Ticks during which the whole game freezes on impact. */
  readonly hitstop: number;
  /** Initial slide speed given to the defender (it then slows down with friction). */
  readonly pushback: number;
  readonly guard: Guard;
  /** Strike hitbox. Absent for projectile moves: the projectile carries its own. */
  readonly hitbox?: Box;
  /** Spawned on the first active tick. */
  readonly projectile?: ProjectileData;
  /** Move kinds this move can be cancelled into, once it has hit or been blocked. */
  readonly cancelInto?: readonly MoveKind[];
  /** Movement during the move. */
  readonly motion?: RootMotion;
  /** Frames during which strikes, projectiles and grabs whiff. */
  readonly invincible?: FrameRange;
  /** Sends the defender to the ground on hit, even when standing. */
  readonly knockdown?: boolean;
}
