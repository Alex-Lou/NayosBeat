import type { MatchConfig } from './config';

export type Facing = 1 | -1;

export type FighterAction =
  'idle' | 'walkForward' | 'walkBack' | 'crouch' | 'preJump' | 'air' | 'landing';

export interface FighterState {
  /** Horizontal center, in sub-pixels from the stage's left edge. */
  readonly x: number;
  /** Height of the feet above the ground, in sub-pixels (0 = grounded). */
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  readonly action: FighterAction;
  /** Ticks spent in the current action, starting at 0. */
  readonly actionFrame: number;
}

/**
 * The whole simulation state. Plain, serializable data owned by the core:
 * the presentation layer only reads it.
 */
export interface GameState {
  /** Number of ticks simulated since the match started. */
  readonly frame: number;
  /** Horizontal center of the camera, in sub-pixels. */
  readonly cameraX: number;
  readonly fighters: readonly [FighterState, FighterState];
}

export function createInitialState(config: MatchConfig): GameState {
  const center = Math.trunc(config.stage.width / 2);
  const halfDistance = Math.trunc(config.stage.startDistance / 2);
  return {
    frame: 0,
    cameraX: center,
    fighters: [createFighter(center - halfDistance, 1), createFighter(center + halfDistance, -1)],
  };
}

function createFighter(x: number, facing: Facing): FighterState {
  return { x, y: 0, vx: 0, vy: 0, facing, action: 'idle', actionFrame: 0 };
}
