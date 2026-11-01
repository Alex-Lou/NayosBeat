/**
 * Golden replays (tests/core/replays/*.json): scripted input sequences, each with one hash of
 * the state on every tick of the match. They pin the game's behavior: a refactor that changes
 * nothing keeps every hash, and a change of gameplay shows up as a changed hash, re-recorded
 * on purpose with `npm run replays:update`. Every tick, not the last one alone: the replays
 * settle back to neutral, so a frame of hitstun or knockdown more would leave the final state
 * as it was.
 */

import type {
  MatchConfig,
  TrainingDummyHealth,
  TrainingFinisher,
  TrainingGauge,
  TrainingStart,
} from '../../src/core/config.ts';
import { Input, type InputBits } from '../../src/core/input.ts';
import { createInitialState, type FighterState, type GameState } from '../../src/core/state.ts';
import { step } from '../../src/core/step.ts';
import { templateOf, type FighterId } from '../../src/data/roster.ts';
import { TRAINING_STAGE } from '../../src/data/stages.ts';

/** `ticks` ticks with these inputs held, written as button names: "down+light", "" for none. */
export type InputRun = readonly [ticks: number, player1: string, player2: string];

export interface Replay {
  /** What the replay exercises, for whoever reads a failing test. */
  readonly description: string;
  readonly fighters: readonly [FighterId, FighterId];
  readonly training?: boolean;
  /** The training option of the Boost gauge (docs/combos-v3.md §6.5): 'normal' unless told. */
  readonly trainingGauge?: TrainingGauge;
  /** The training options of the Finisher (docs/finisher.md §1.12): 'match' and 100 unless told. */
  readonly trainingFinisher?: TrainingFinisher;
  readonly trainingDummyHealth?: TrainingDummyHealth;
  /** Where training starts (docs/combat-v2.md D32): 'center' unless told. */
  readonly trainingStart?: TrainingStart;
  /** The whole match from its first tick (round intro included). */
  readonly inputs: readonly InputRun[];
  /** `replayHash` of the replay: the state on every tick. */
  readonly hash: string;
}

const BUTTONS: Readonly<Record<string, InputBits>> = {
  up: Input.Up,
  down: Input.Down,
  left: Input.Left,
  right: Input.Right,
  jump: Input.Jump,
  light: Input.Light,
  heavy: Input.Heavy,
  special: Input.Special,
  grab: Input.Grab,
  dash: Input.Dash,
  boost: Input.Boost,
};

export function parseInput(written: string): InputBits {
  if (written === '') return 0;
  let bits = 0;
  for (const name of written.split('+')) {
    const flag = BUTTONS[name];
    if (flag === undefined) throw new Error(`Unknown button in replay: ${name}`);
    bits |= flag;
  }
  return bits;
}

export function replayConfig(replay: Replay): MatchConfig {
  const [first, second] = replay.fighters;
  return {
    stage: TRAINING_STAGE,
    fighters: [templateOf(first), templateOf(second)],
    training: replay.training ?? false,
    ...(replay.trainingGauge && { trainingGauge: replay.trainingGauge }),
    ...(replay.trainingFinisher && { trainingFinisher: replay.trainingFinisher }),
    ...(replay.trainingDummyHealth && { trainingDummyHealth: replay.trainingDummyHealth }),
    ...(replay.trainingStart && { trainingStart: replay.trainingStart }),
  };
}

/**
 * Plays the replay from a fresh match, calls `visit` with the state after every tick and
 * returns the final state.
 */
export function playReplay(replay: Replay, visit?: (state: GameState) => void): GameState {
  const config = replayConfig(replay);
  let state = createInitialState(config);
  for (const [ticks, player1, player2] of replay.inputs) {
    const inputs = [parseInput(player1), parseInput(player2)] as const;
    for (let i = 0; i < ticks; i++) {
      state = step(state, inputs, config);
      visit?.(state);
    }
  }
  return state;
}

/**
 * Every field the hash covers, in a fixed order. Values are hashed without their names, so
 * renaming a field (and its entry here) keeps the hashes; a test checks that no field of the
 * state is left out.
 */
export const FIGHTER_FIELDS = [
  'x',
  'y',
  'vx',
  'vy',
  'facing',
  'action',
  'actionFrame',
  'crouching',
  'health',
  'move',
  'moveConnected',
  'stunFrames',
  'input',
  'bufferedCommand',
  'bufferFrames',
  'bufferedInput',
  'bufferedMotion',
  'bufferedFacing',
  'directionHistory',
  'tapDirection',
  'tapFrames',
  'tapReleased',
  'throwImmuneFrames',
  'comboCount',
  'juggle',
  'phrase',
  'phraseTwice',
  'boost',
  'flags',
  'reaction',
  'reactionHeavy',
  'stunTotal',
] as const satisfies readonly (keyof FighterState)[];

/**
 * The game's fields, in a fixed order, `contacts` included: health and stun do not tell where a
 * hit landed, and the impact point moves with any hitbox or hurtbox.
 */
export const GAME_FIELDS = [
  'frame',
  'cameraX',
  'hitstop',
  'round',
  'fighters',
  'projectiles',
  'contacts',
  'hold',
] as const satisfies readonly (keyof GameState)[];

/** FNV-1a, 32 bits: small, stable, and the same in every JavaScript engine. */
const FNV_OFFSET = 0x811c9dc5;

/** A small stable hash (FNV-1a, 32 bits, hexadecimal) of one state's canonical form. */
export function stateHash(state: GameState): string {
  return hex(fnv(FNV_OFFSET, canonicalText(state)));
}

/** One hash of the state on every tick of the replay, in order: what a golden replay pins. */
export function replayHash(replay: Replay): string {
  let hash = FNV_OFFSET;
  playReplay(replay, (state) => {
    hash = fnv(hash, canonicalText(state));
  });
  return hex(hash);
}

/** Carries the FNV-1a `hash` on over `text`, so several texts hash as one stream. */
function fnv(hash: number, text: string): number {
  let next = hash;
  for (let i = 0; i < text.length; i++) {
    next = Math.imul(next ^ text.charCodeAt(i), 0x01000193);
  }
  return next;
}

function hex(hash: number): string {
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalText(state: GameState): string {
  return JSON.stringify(canonical(state));
}

function canonical(state: GameState): unknown {
  return GAME_FIELDS.map((field) =>
    field === 'fighters'
      ? state.fighters.map((fighter) => FIGHTER_FIELDS.map((name) => fighter[name]))
      : sortedKeys(state[field]),
  );
}

/** Plain data with its object keys in alphabetical order: independent of how it was built. */
function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1));
  return Object.fromEntries(entries.map(([key, inner]) => [key, sortedKeys(inner)]));
}
