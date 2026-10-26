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
  'standLight' | 'standHeavy' | 'crouchLight' | 'crouchHeavy' | 'jumpLight' | 'jumpHeavy';

/** How a move must be blocked: low = crouching, overhead = standing, mid = either. */
export type Guard = 'mid' | 'low' | 'overhead';

export interface MoveData {
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
  readonly hitbox: Box;
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
}
