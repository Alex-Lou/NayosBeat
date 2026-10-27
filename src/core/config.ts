/** Static match data, passed to the simulation. Distances in sub-pixels, durations in ticks. */

import type { MoveData, MoveId } from './move-data';

export interface BoxSize {
  readonly width: number;
  readonly height: number;
}

/** A body the opponent cannot walk through, anchored at the feet; `lift` raises it off them. */
export interface Pushbox extends BoxSize {
  readonly lift?: number;
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
  /**
   * The body in the air: slimmer, and raised off the feet, so a jump close enough passes over a
   * standing opponent's head and lands behind it (a cross-up). Its size alone sets the range.
   */
  readonly airPushbox: Pushbox & { readonly lift: number };
  /** Lying on the ground (knockdown): a jumper may pass over, and stand up on either side. */
  readonly lyingPushbox: BoxSize;
  /** Where the fighter can be hit, per posture: a list, so a body can be drawn in bands. */
  readonly standingHurtboxes: readonly Box[];
  readonly crouchingHurtboxes: readonly Box[];
  readonly airHurtboxes: readonly Box[];
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
