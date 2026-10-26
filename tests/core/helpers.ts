import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import type { InputBits } from '../../src/core/input';
import { createInitialState, type FighterState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { POLYVALENT, RUSHDOWN } from '../../src/data/fighters';
import { TRAINING_STAGE } from '../../src/data/stages';

export const MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [POLYVALENT, RUSHDOWN],
};

/** Same template on both sides, for symmetry tests. */
export const MIRROR_MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [POLYVALENT, POLYVALENT],
};

/** A fresh match with the intro skipped, so inputs are accepted right away. */
export function fightState(config: MatchConfig = MATCH): GameState {
  const state = createInitialState(config);
  return { ...state, round: { ...state.round, phase: 'fight' } };
}

/** Runs `ticks` ticks with the same inputs held. */
export function run(
  ticks: number,
  inputs: readonly [InputBits, InputBits] = [0, 0],
  state: GameState = fightState(),
  config: MatchConfig = MATCH,
): GameState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = step(current, inputs, config);
  return current;
}

export function makeFighter(overrides: Partial<FighterState> = {}): FighterState {
  return {
    x: px(400),
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    action: 'idle',
    actionFrame: 0,
    crouching: false,
    health: 1000,
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
    ...overrides,
  };
}

/** Places both fighters, facing each other, `distancePx` apart around the stage center. */
export function facingOff(
  distancePx: number,
  config: MatchConfig = MATCH,
  overrides: [Partial<FighterState>, Partial<FighterState>] = [{}, {}],
): GameState {
  const state = fightState(config);
  const center = config.stage.width / 2;
  const half = px(distancePx) / 2;
  return {
    ...state,
    fighters: [
      { ...state.fighters[0], x: center - half, ...overrides[0] },
      { ...state.fighters[1], x: center + half, ...overrides[1] },
    ],
  };
}

/** `count` copies of `value`, typed (unlike `Array(n).fill`, which yields `any[]`). */
export function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}
