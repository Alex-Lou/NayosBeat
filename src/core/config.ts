/** Static match data, passed to the simulation. Distances in sub-pixels, durations in ticks. */

export interface BoxSize {
  readonly width: number;
  readonly height: number;
}

/**
 * A box relative to a fighter, described as if the fighter faced right:
 * `x` is the offset of the box's left edge from the fighter's center, `y` of its bottom edge
 * from the fighter's feet. It is mirrored when the fighter faces left.
 */
export interface Box extends BoxSize {
  readonly x: number;
  readonly y: number;
}

export type MoveId =
  | 'standLight'
  | 'standHeavy'
  | 'crouchLight'
  | 'crouchHeavy'
  | 'jumpLight'
  | 'jumpHeavy'
  | 'special'
  | 'specialForward'
  | 'specialAntiAir'
  | 'throw';

/** Decides what a move can cancel into, and how it is blocked (throws cannot be). */
export type MoveKind = 'normal' | 'special' | 'throw';

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
  /** Forward movement during part of the move. */
  readonly advance?: FrameRange & { readonly speed: number };
  /** Frames during which strikes, projectiles and throws whiff. */
  readonly invincible?: FrameRange;
  /** Sends the defender to the ground on hit, even when standing. */
  readonly knockdown?: boolean;
}

/** Everything that defines a playable character. */
export interface FighterTemplate {
  readonly name: string;
  readonly maxHealth: number;
  readonly walkForwardSpeed: number;
  readonly walkBackSpeed: number;
  readonly jumpVelocity: number;
  readonly jumpForwardSpeed: number;
  readonly jumpBackSpeed: number;
  readonly gravity: number;
  readonly preJumpFrames: number;
  readonly landingFrames: number;
  /** Time spent on the ground after being hit in the air. */
  readonly knockdownFrames: number;
  /** Collision body that keeps fighters from overlapping, anchored at the feet. */
  readonly standingPushbox: BoxSize;
  readonly crouchingPushbox: BoxSize;
  /** Where the fighter can be hit. */
  readonly standingHurtbox: Box;
  readonly crouchingHurtbox: Box;
  readonly airHurtbox: Box;
  readonly moves: Readonly<Record<MoveId, MoveData>>;
}

export interface StageConfig {
  readonly width: number;
  /** Distance between the two fighters at round start. */
  readonly startDistance: number;
}

export interface MatchConfig {
  readonly stage: StageConfig;
  readonly fighters: readonly [FighterTemplate, FighterTemplate];
  /** Training mode: no timer, no KO, health refills between combos. */
  readonly training?: boolean;
}
