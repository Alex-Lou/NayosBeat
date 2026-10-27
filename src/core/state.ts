import type { Command } from './commands';
import type { FighterTemplate, MatchConfig } from './config';
import type { InputBits } from './input';
import type { MoveId } from './move-data';
import type { Motion } from './motion';
import { ROUND_TIME } from './rules';

export type Facing = 1 | -1;

export type FighterAction =
  | 'idle'
  | 'walkForward'
  | 'walkBack'
  | 'crouch'
  /** Holding back while the opponent threatens: stands (or crouches) still in guard. */
  | 'guard'
  | 'preJump'
  | 'air'
  | 'landing'
  | 'attack'
  | 'airAttack'
  | 'hitstun'
  | 'blockstun'
  | 'airHit'
  | 'knockdown'
  | 'ko'
  /** Holding the grabbed opponent (see `hold.ts`): its `move` is the pummel or throw played. */
  | 'holding'
  /** Grabbed and held: it can only break free (in the clinch) or struggle. */
  | 'held'
  /** Broke free of a grab, or grabbed on the same tick as the opponent: pushed apart, reeling. */
  | 'tech';

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
  /** Command pressed while busy, carried out as soon as the fighter can act. */
  readonly bufferedCommand: Command | null;
  readonly bufferFrames: number;
  /**
   * Direction held, motion completed and side faced when the buffered command was pressed:
   * the move is read as the player meant it, even after a cross-up turned them around.
   */
  readonly bufferedInput: InputBits;
  readonly bufferedMotion: Motion | null;
  readonly bufferedFacing: Facing;
  /** Directions held on the last ticks (oldest first), to recognize motions such as ↓↘→. */
  readonly directionHistory: readonly InputBits[];
  /**
   * The double tap in progress (see `double-tap.ts`): the side of the first tap in stage
   * coordinates (0: none), ticks since it, and whether the stick went back to neutral since.
   */
  readonly tapDirection: -1 | 0 | 1;
  readonly tapFrames: number;
  readonly tapReleased: boolean;
  /** Ticks left during which grabs whiff, after a stun (see THROW_PROTECTION_FRAMES). */
  readonly throwImmuneFrames: number;
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

/**
 * Something that touched on a tick: a strike or a projectile, hit or blocked. The simulation
 * knows where its boxes met, so the presentation never has to work it out.
 */
export interface Contact {
  /** The attacker; for a tech, the player who broke free (both, on a same-tick tech). */
  readonly by: 0 | 1;
  /**
   * A strike or projectile hit or blocked; a grab that catches; a tech; a pummel or throw on
   * the held opponent (its release).
   */
  readonly kind: 'hit' | 'block' | 'grab' | 'tech' | 'pummel' | 'throw';
  readonly move: MoveId;
  /**
   * Middle of the overlap between what struck (the attacker's hitbox, or its projectile's) and
   * the body it touched, in stage sub-pixels (y up from the ground).
   */
  readonly x: number;
  readonly y: number;
  /** Health taken: none when blocked, nor on a training dummy at its 1 HP floor. */
  readonly damage: number;
  /**
   * PUNITION: the grab caught a fighter recovering, the tech is out of reach. (The counter-hits
   * of the strikes come with combat v2's phase 3.)
   */
  readonly counter: 'punish' | null;
}

/**
 * A grab that caught (docs/combat-v2.md §4): who holds whom, for how long it has lasted and can
 * last, and what the holder did with it. Time makes the rules (the clinch, the limit), not
 * counters; `pummels` only tells the CPU and the HUD how many blows landed.
 */
export interface HoldState {
  /** The holder; the other fighter is held. */
  readonly holder: 0 | 1;
  /** Ticks of the hold played, from 0 on the first tick after the grab's freeze. */
  readonly frame: number;
  /** When the holder throws forward if it has not thrown yet: shortened by the struggle. */
  readonly limit: number;
  /** False on a PUNITION: the grab caught a fighter recovering, it cannot break free. */
  readonly techable: boolean;
  /** Pummels landed so far. */
  readonly pummels: number;
}

/** Shared by every tick where nothing touches, so a quiet tick allocates no list. */
export const EMPTY_CONTACTS: readonly Contact[] = Object.freeze([]);
/** Shared by every tick without projectiles. */
export const NO_PROJECTILES: readonly ProjectileState[] = Object.freeze([]);

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
  /** What touched on the tick that produced this state (at most one per fighter). */
  readonly contacts: readonly Contact[];
  /** The grab holding a fighter, if any. */
  readonly hold: HoldState | null;
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
    projectiles: NO_PROJECTILES,
    contacts: EMPTY_CONTACTS,
    // A new round always starts free: a hold never outlives its round.
    hold: null,
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
    bufferedCommand: null,
    bufferFrames: 0,
    bufferedInput: 0,
    bufferedMotion: null,
    bufferedFacing: facing,
    directionHistory: [],
    tapDirection: 0,
    tapFrames: 0,
    tapReleased: false,
    throwImmuneFrames: 0,
    comboCount: 0,
  };
}
