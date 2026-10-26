/** Static match data, passed to the simulation. Distances in sub-pixels, durations in ticks. */

export interface BoxSize {
  readonly width: number;
  readonly height: number;
}

export interface FighterStats {
  readonly walkForwardSpeed: number;
  readonly walkBackSpeed: number;
  readonly jumpVelocity: number;
  readonly jumpForwardSpeed: number;
  readonly jumpBackSpeed: number;
  readonly gravity: number;
  readonly preJumpFrames: number;
  readonly landingFrames: number;
  /** Collision body that keeps fighters from overlapping, anchored at the feet. */
  readonly standingPushbox: BoxSize;
  readonly crouchingPushbox: BoxSize;
}

export interface StageConfig {
  readonly width: number;
  /** Distance between the two fighters at round start. */
  readonly startDistance: number;
}

export interface MatchConfig {
  readonly stage: StageConfig;
  readonly fighters: readonly [FighterStats, FighterStats];
}
