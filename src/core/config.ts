/** Static match data, passed to the simulation. Distances in sub-pixels, durations in ticks. */

import type { CoreMoveId, MoveData, OptionalMoveId } from './move-data';

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
  /** Every core move, and the optional ones the fighter has (see `moveOf`). */
  readonly moves: FighterMoves;
}

export type FighterMoves = Readonly<Record<CoreMoveId, MoveData>> &
  Readonly<Partial<Record<OptionalMoveId, MoveData>>>;

export interface StageConfig {
  readonly width: number;
  /** Distance between the two fighters at round start. */
  readonly startDistance: number;
}

/**
 * The Boost gauge in training (docs/combos-v3.md §1.8.1, §6.5): as in a match, back to three
 * bars once a fighter is left alone, or full on every tick.
 */
export type TrainingGauge = 'normal' | 'full' | 'infinite';

/**
 * The Finisher in training (docs/finisher.md §1.12): as in a match, its match point played as
 * reached ('match'); always ready, three bars and room enough ('always'); or never, BOOST and
 * back staying the plain super ('off').
 */
export type TrainingFinisher = 'match' | 'always' | 'off';

/** The health the training dummy refills to, in percent of its own (docs/finisher.md §1.12). */
export type TrainingDummyHealth = 100 | 50 | 30 | 10;

/**
 * Where training starts, and starts over (docs/combat-v2.md D32): both fighters at the center, as
 * a round starts, or against a wall, the same distance apart: the left one at player 1's back,
 * the right one at player 2's.
 */
export type TrainingStart = 'center' | 'leftCorner' | 'rightCorner';

export interface MatchConfig {
  readonly stage: StageConfig;
  readonly fighters: readonly [FighterTemplate, FighterTemplate];
  /** Training mode: no timer, no KO, health refills between combos. */
  readonly training?: boolean;
  /** Training mode's gauge: 'normal' when left out. */
  readonly trainingGauge?: TrainingGauge;
  /** Training mode's Finisher: 'match' when left out. */
  readonly trainingFinisher?: TrainingFinisher;
  /** Training mode's dummy (player 2) refills to this: 100 when left out. */
  readonly trainingDummyHealth?: TrainingDummyHealth;
  /** Training mode's start: 'center' when left out. */
  readonly trainingStart?: TrainingStart;
}
