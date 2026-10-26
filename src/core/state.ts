import type { FighterTemplate, MatchConfig, MoveId } from './config';
import type { InputBits } from './input';
import type { Motion } from './motion';
import { ROUND_TIME } from './rules';

export type Facing = 1 | -1;

export type FighterAction =
  | 'idle'
  | 'walkForward'
  | 'walkBack'
  | 'crouch'
  | 'preJump'
  | 'air'
  | 'landing'
  | 'attack'
  | 'airAttack'
  | 'hitstun'
  | 'blockstun'
  | 'airHit'
  | 'knockdown'
  | 'ko';

/** Throw = light + heavy together. */
export type AttackButton = 'light' | 'heavy' | 'special' | 'throw';

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
  /** Selects the crouching pushbox and hurtbox. */
  readonly crouching: boolean;
  readonly health: number;
  /** The attack being performed, if any. */
  readonly move: MoveId | null;
  /** The current attack already hit or was blocked: a move connects only once. */
  readonly moveConnected: boolean;
  /** Remaining ticks of hitstun, blockstun or knockdown. */
  readonly stunFrames: number;
  /** Input of the last tick, after SOCD cleaning: used to detect presses and blocking. */
  readonly input: InputBits;
  /** Attack pressed while busy, started as soon as the fighter can act. */
  readonly bufferedAttack: AttackButton | null;
  readonly bufferFrames: number;
  /** Direction held and motion completed when the buffered button was pressed. */
  readonly bufferedInput: InputBits;
  readonly bufferedMotion: Motion | null;
  /** Directions held on the last ticks (oldest first), to recognize motions such as ↓↘→. */
  readonly directionHistory: readonly InputBits[];
  /** Consecutive hits taken without being able to act: drives the combo counter and scaling. */
  readonly comboCount: number;
}

export interface ProjectileState {
  readonly owner: 0 | 1;
  /** The move that fired it: its frame data applies on hit. */
  readonly move: MoveId;
  readonly x: number;
  readonly facing: Facing;
}

export type RoundPhase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd';

export interface RoundResult {
  /** Index of the winner, or null for a draw. */
  readonly winner: 0 | 1 | null;
  readonly reason: 'ko' | 'timeout';
}

export interface RoundState {
  readonly number: number;
  readonly wins: readonly [number, number];
  /** Remaining fight time, in ticks. */
  readonly timer: number;
  readonly phase: RoundPhase;
  readonly phaseFrame: number;
  readonly result: RoundResult | null;
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
  /** Remaining ticks of impact freeze. */
  readonly hitstop: number;
  readonly round: RoundState;
  readonly fighters: readonly [FighterState, FighterState];
  readonly projectiles: readonly ProjectileState[];
}

export function createInitialState(config: MatchConfig): GameState {
  return createRound(config, 0, 1, [0, 0]);
}

/** A fresh round: fighters back in place with full health, scores kept. */
export function createRound(
  config: MatchConfig,
  frame: number,
  roundNumber: number,
  wins: readonly [number, number],
): GameState {
  const center = Math.trunc(config.stage.width / 2);
  const halfDistance = Math.trunc(config.stage.startDistance / 2);
  const [templateA, templateB] = config.fighters;
  return {
    frame,
    cameraX: center,
    hitstop: 0,
    round: {
      number: roundNumber,
      wins,
      timer: ROUND_TIME,
      // Training starts right away: there is no round to announce.
      phase: config.training ? 'fight' : 'intro',
      phaseFrame: 0,
      result: null,
    },
    fighters: [
      createFighter(center - halfDistance, 1, templateA),
      createFighter(center + halfDistance, -1, templateB),
    ],
    projectiles: [],
  };
}

function createFighter(x: number, facing: Facing, template: FighterTemplate): FighterState {
  return {
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    action: 'idle',
    actionFrame: 0,
    crouching: false,
    health: template.maxHealth,
    move: null,
    moveConnected: false,
    stunFrames: 0,
    input: 0,
    bufferedAttack: null,
    bufferFrames: 0,
    bufferedInput: 0,
    bufferedMotion: null,
    directionHistory: [],
    comboCount: 0,
  };
}
