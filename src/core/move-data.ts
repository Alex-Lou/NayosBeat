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

/**
 * Moves a fighter may leave out (docs/combat-v2.md §2.8): the command that asks for one gives
 * the standing normal instead (`groundMove`). Nayo and Riff define them all.
 */
export const OPTIONAL_MOVE_IDS = [
  'forwardLight',
  'forwardHeavy',
  'backHeavy',
  'chainLight',
  'lightFinisher',
] as const;

/** Every move a fighter can have, required or not. */
export const MOVE_IDS = [...CORE_MOVE_IDS, ...OPTIONAL_MOVE_IDS] as const;

export type CoreMoveId = (typeof CORE_MOVE_IDS)[number];
export type OptionalMoveId = (typeof OPTIONAL_MOVE_IDS)[number];
export type MoveId = CoreMoveId | OptionalMoveId;

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
 * entry per frame of the move, and `y[f]`, when given, the height of its feet on that frame
 * (a leap that really leaves the ground, back on it on the last frame). Data, not code, so
 * every way of moving shares one mechanism.
 */
export interface RootMotion {
  readonly dx: readonly number[];
  readonly y?: readonly number[];
}

/** Where the fighter can be hit during `frames` of a move, instead of its posture's boxes. */
export interface MoveHurtbox {
  readonly frames: FrameRange;
  readonly boxes: readonly Box[];
}

/**
 * How a blow sends the defender flying, even from the ground: launched at `vy`, carried at `vx`
 * (away from the attacker, sub-pixels per tick) until it lands, then down for its knockdown.
 */
export interface Knockdown {
  readonly vx: number;
  readonly vy: number;
  /** Swept off the legs (sweeps, the Glissade): the defender falls on its back. */
  readonly trip?: boolean;
  /** A launcher: the defender, sent up from its feet, can take one more blow in the air. */
  readonly juggle?: boolean;
}

/**
 * Frames during which the move cannot be hit: by anything ('all', the default: strikes,
 * projectiles, grabs), or by attacks from the air only (Riff's Genou montant, no reversal).
 */
export interface Invincibility extends FrameRange {
  readonly against?: 'all' | 'air';
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
   * The move L gives once this one has hit or been blocked (L, L, L, docs/combat-v2.md §7.2),
   * before any other reading of L: no counter, the chain is in the data.
   */
  readonly chain?: MoveId;
  /**
   * From this action frame on, the move can be cancelled without having touched anything (Riff's
   * dash): the move cancelled into keeps part of its speed (DASH_MOMENTUM_PERCENT).
   */
  readonly freeCancelFrom?: number;
  /** Movement during the move. */
  readonly motion?: RootMotion;
  /** Replaces the posture's hurtboxes on some frames (the Glissade's body along the floor). */
  readonly hurtboxes?: readonly MoveHurtbox[];
  /** Frames during which strikes, projectiles and grabs (or attacks from the air) whiff. */
  readonly invincible?: Invincibility;
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
