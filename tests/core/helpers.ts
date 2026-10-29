import { expect } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { createInitialState, type FighterState, type GameState } from '../../src/core/state';
import { updateFighter } from '../../src/core/fighter';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';

export const MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [NAYO, RIFF],
};

/** Same template on both sides, for symmetry tests. */
export const MIRROR_MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [NAYO, NAYO],
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
  const facing = overrides.facing ?? 1;
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
    flags: 0,
    reaction: null,
    reactionHeavy: false,
    stunTotal: 0,
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

/** Far away on the right: a fighter played alone faces right and nothing interferes. */
const FAR = px(900);

/** Plays one input per tick on a lone fighter; returns its state after each tick. */
export function playAlone(
  template: FighterTemplate,
  inputs: readonly InputBits[],
  start: FighterState = makeFighter(),
): FighterState[] {
  const states: FighterState[] = [];
  let current = start;
  for (const input of inputs) {
    current = updateFighter(current, input, template, FAR);
    states.push(current);
  }
  return states;
}

/** How far the fighter moved on each tick (sub-pixels), from `start`. */
export function stepsOf(states: readonly FighterState[], start = makeFighter()): number[] {
  return states.map((state, tick) => state.x - (states[tick - 1] ?? start).x);
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Both players' inputs on one tick. */
export type TickInputs = readonly [InputBits, InputBits];

/** The same input seen in a mirror: left and right exchanged. */
export function mirroredInput(input: InputBits): InputBits {
  const sides = Input.Left | Input.Right;
  const left = input & Input.Left ? Input.Right : 0;
  const right = input & Input.Right ? Input.Left : 0;
  return (input & ~sides) | left | right;
}

/**
 * Plays `script` from `facingOff(distancePx, config, overrides)`, then its mirror image (players
 * swapped, left and right exchanged), and expects every tick of one to be the reflection of the
 * other: x ↦ stage width − x, the other facing, the same height, action, move, frame, health,
 * stun, juggle and reaction. The mirror swaps the templates too, so a mixed match-up mirrors.
 * Returns the states of the script as written, for the mechanic's own checks.
 */
export function expectMirrored(
  script: readonly TickInputs[],
  config: MatchConfig,
  distancePx: number,
  overrides: [Partial<FighterState>, Partial<FighterState>] = [{}, {}],
): GameState[] {
  const width = config.stage.width;
  const mirrored = (o: Partial<FighterState>): Partial<FighterState> => ({
    ...o,
    ...(o.x === undefined ? {} : { x: width - o.x }),
    ...(o.facing === undefined ? {} : { facing: o.facing === 1 ? -1 : 1 }),
  });
  const swapped: MatchConfig = { ...config, fighters: [config.fighters[1], config.fighters[0]] };
  const played = playScript(script, config, facingOff(distancePx, config, overrides));
  const mirror = playScript(
    script.map(([a, b]) => [mirroredInput(b), mirroredInput(a)] as const),
    swapped,
    facingOff(distancePx, swapped, [mirrored(overrides[1]), mirrored(overrides[0])]),
  );
  const pose = (f: FighterState, reflected: boolean) => [
    reflected ? width - f.x : f.x,
    reflected ? -f.facing : f.facing,
    f.y,
    f.action,
    f.move,
    f.actionFrame,
    f.health,
    f.stunFrames,
    f.juggle,
    f.reaction,
  ];
  const rows = (states: GameState[], reflected: boolean) =>
    states.map((state, tick) => {
      const [a, b] = state.fighters;
      const [first, second] = reflected ? [b, a] : [a, b];
      return [tick, state.hitstop, pose(first, reflected), pose(second, reflected)];
    });
  expect(rows(mirror, true)).toEqual(rows(played, false));
  return played;
}

/** Plays one pair of inputs per tick; returns the state after each tick. */
function playScript(
  script: readonly TickInputs[],
  config: MatchConfig,
  start: GameState,
): GameState[] {
  const states: GameState[] = [];
  let current = start;
  for (const inputs of script) {
    current = step(current, inputs, config);
    states.push(current);
  }
  return states;
}
