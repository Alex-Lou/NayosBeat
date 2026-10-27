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
  'pummel',
  'throwForward',
  'throwBack',
  'dashForward',
  'dashBack',
] as const;

export type CoreMoveId = (typeof CORE_MOVE_IDS)[number];
export type MoveId = CoreMoveId;

/** Moves performed in the air (a projectile there would never be fired). */
export const AIR_MOVE_IDS: readonly MoveId[] = ['jumpLight', 'jumpHeavy'];

/**
 * Decides what a move can cancel into, and how it is blocked (grabs cannot be). A `movement`
 * (dash, backdash) carries the fighter and never strikes: the CPU does not guard against it, and
 * a fighter hit during one is not caught attacking. A `throw` is played on a held opponent
 * (`hold.ts`): no hitbox, it lands on its startup frame, whatever the boxes say.
 */
export type MoveKind = 'normal' | 'special' | 'grab' | 'throw' | 'movement';

/** The moves of kind `movement`, and only they. */
export const MOVEMENT_MOVE_IDS: readonly MoveId[] = ['dashForward', 'dashBack'];

/** The moves of kind `throw`, and only they: what the holder does with the opponent it holds. */
export const THROW_MOVE_IDS: readonly MoveId[] = ['pummel', 'throwForward', 'throwBack'];

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

/**
 * How a blow sends the defender flying, even from the ground: launched at `vy`, carried at `vx`
 * (away from the attacker, sub-pixels per tick) until it lands, then down for its knockdown.
 */
export interface Knockdown {
  readonly vx: number;
  readonly vy: number;
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
  /** Strike hitbox. Absent for projectile moves (the projectile carries its own) and movements. */
  readonly hitbox?: Box;
  /** Spawned on the first active tick. */
  readonly projectile?: ProjectileData;
  /**
   * Move kinds this move can be cancelled into, once it has hit or been blocked (or from
   * `freeCancelFrom` on, without contact).
   */
  readonly cancelInto?: readonly MoveKind[];
  /**
   * From this action frame on, the move can be cancelled without having touched anything (Riff's
   * dash): the move cancelled into keeps part of its speed (DASH_MOMENTUM_PERCENT).
   */
  readonly freeCancelFrom?: number;
  /** Movement during the move. */
  readonly motion?: RootMotion;
  /** Frames during which strikes, projectiles and grabs whiff. */
  readonly invincible?: FrameRange;
  /** Frames during which grabs whiff, strikes do not (the backdash). */
  readonly throwInvincible?: FrameRange;
  /** Sends the defender to the ground on hit, even when standing. */
  readonly knockdown?: Knockdown;
  /**
   * A throw backward: on this frame the held opponent goes over to the holder's back, before the
   * release (the arc over the shoulder is drawn, the core keeps no path).
   */
  readonly sideSwitchFrame?: number;
}
