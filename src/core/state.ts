import type { Command } from './commands';
import type { FighterTemplate, MatchConfig, TrainingStart } from './config';
import type { InputBits } from './input';
import type { MoveId } from './move-data';
import type { Motion } from './motion';
import { followCamera } from './positions';
import { ROUND_TIME } from './rules';
import { trainingStartBoost } from './training';

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

/**
 * How the last blow taken shook the fighter (docs/combat-v2.md §9.4), read from where it landed:
 * the head snapped back, folded at the belly, a leg buckling; crouching; swept off the legs;
 * sent flying; thrown. The presentation picks its animation from it, the core never reads it.
 */
export type Reaction = 'high' | 'mid' | 'low' | 'crouch' | 'trip' | 'launch' | 'thrown';

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
  /** Juggle points left (docs/combos-v3.md §1.5): each blow in the air spends its cost. */
  readonly juggle: number;
  /**
   * The phrase (docs/combos-v3.md §1.2): the normals played since the fighter last started a
   * move from neutral, one bit each (`PHRASE_MOVE_IDS`); `phraseTwice`, the lights played a
   * second time. A cancel never enters a normal again (a light, never a third time).
   */
  readonly phrase: number;
  readonly phraseTwice: number;
  /**
   * The Boost gauge (docs/combos-v3.md §1.8): from 0 to BOOST_MAX, filled by fighting, spent on
   * the Boost moves, kept from one round to the next.
   */
  readonly boost: number;
  /** Marks of the sequence, of the current move and of the combo taken (the FLAG_* bits below). */
  readonly flags: number;
  /** The last blow taken: how it shook the fighter (null: blocked, or none yet). */
  readonly reaction: Reaction | null;
  /** That blow's stun was long (hitstun of 18 ticks or more): the full reaction plays. */
  readonly reactionHeavy: boolean;
  /** The whole hit or block stun it gave, so the reaction ends with it. */
  readonly stunTotal: number;
}

/**
 * The bits of `FighterState.flags` (docs/combos-v3.md §1.11). The attacker's: what its sequence
 * already spent (the Rewind, the super: once each, cleared as the opponent gets out of it, see
 * `boosted` in step.ts); its current move hit (not blocked), set as it lands, cleared as the next
 * move starts; its super started armed (the Finisher, docs/finisher.md §1.6), cleared the same
 * way, or at its first contact if the lock does not take there. The victim's, cleared once it
 * stands in neutral again: its combo used its extender (Rebond or Vrille, once a combo), it is
 * being slammed down to bounce, it took the combo's last blow (COMBO_LIMIT), the combo opened
 * on it at 30 % of its health or less (docs/finisher.md §1.1, the Finisher's third light).
 */
export const FLAG_SPENT_CANCEL = 1;
export const FLAG_SPENT_SUPER = 2;
export const FLAG_MOVE_HIT = 4;
export const FLAG_EXTENDED = 8;
export const FLAG_BOUNCE = 16;
export const FLAG_LIMIT = 32;
export const FLAG_DANGER = 64;
export const FLAG_FINISHER = 128;
/** The attacker's spends, once each per sequence. */
export const SEQUENCE_FLAGS = FLAG_SPENT_CANCEL | FLAG_SPENT_SUPER;
/** The victim's marks. */
export const VICTIM_FLAGS = FLAG_EXTENDED | FLAG_BOUNCE | FLAG_LIMIT | FLAG_DANGER;

export interface ProjectileState {
  readonly owner: 0 | 1;
  /** The move that fired it: its frame data applies on hit. */
  readonly move: MoveId;
  readonly x: number;
  readonly facing: Facing;
}

/** CONTRE or PUNITION: the same bonus, two words to learn to punish (§7.4). */
export type CounterHit = 'counter' | 'punish';

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
  /**
   * Health taken: a special blocked chips some (never the last point), a normal blocked none,
   * nor a hit on a training dummy at its 1 HP floor.
   */
  readonly damage: number;
  /**
   * A blow caught the defender attacking (CONTRE: starting up or out) or recovering (PUNITION:
   * after its active frames), docs/combat-v2.md §7.4; a grab caught a fighter recovering, which
   * cannot break free (PUNITION).
   */
  readonly counter: CounterHit | null;
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
  const boost = trainingStartBoost(config);
  return createRound(config, 0, 1, [0, 0], [boost, boost]);
}

/**
 * A fresh round: fighters back in place with full health, scores and Boost gauges (`boosts`)
 * kept.
 */
export function createRound(
  config: MatchConfig,
  frame: number,
  roundNumber: number,
  wins: readonly [number, number],
  boosts: readonly [number, number],
): GameState {
  const start = config.training ? (config.trainingStart ?? 'center') : 'center';
  const [xA, xB] = startXs(config, start);
  const [templateA, templateB] = config.fighters;
  const a = createFighter(xA, 1, templateA, boosts[0]);
  const b = createFighter(xB, -1, templateB, boosts[1]);
  return {
    frame,
    // Against a wall, the camera already where it follows them: its edge is the wall.
    cameraX:
      start === 'center' ? Math.trunc(config.stage.width / 2) : followCamera(a, b, config.stage),
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
    fighters: [a, b],
    projectiles: NO_PROJECTILES,
    contacts: EMPTY_CONTACTS,
    // A new round always starts free: a hold never outlives its round.
    hold: null,
  };
}

/**
 * Where both fighters start, `startDistance` apart: around the stage's center, or, in training,
 * one of them against a wall as its option says (docs/combat-v2.md D32), touching it as the walls
 * keep a fighter (positions.ts).
 */
function startXs(config: MatchConfig, start: TrainingStart): readonly [number, number] {
  const { width, startDistance } = config.stage;
  const [templateA, templateB] = config.fighters;
  switch (start) {
    case 'center': {
      const center = Math.trunc(width / 2);
      const halfDistance = Math.trunc(startDistance / 2);
      return [center - halfDistance, center + halfDistance];
    }
    case 'leftCorner': {
      const left = Math.trunc(templateA.standingPushbox.width / 2);
      return [left, left + startDistance];
    }
    case 'rightCorner': {
      const right = width - Math.trunc(templateB.standingPushbox.width / 2);
      return [right - startDistance, right];
    }
  }
}

function createFighter(
  x: number,
  facing: Facing,
  template: FighterTemplate,
  boost: number,
): FighterState {
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
    juggle: 0,
    phrase: 0,
    phraseTwice: 0,
    boost,
    flags: 0,
    reaction: null,
    reactionHeavy: false,
    stunTotal: 0,
  };
}
