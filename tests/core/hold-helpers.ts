import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { FighterState, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, MIRROR_MATCH, type TickInputs } from './helpers';

export const NAYO_MIRROR = MIRROR_MATCH;
export const RIFF_MIRROR: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, RIFF] };

/** Inputs of a tick, from the tick's index. */
export type Script = (tick: number) => TickInputs;

const NOTHING: Script = () => [0, 0];

/**
 * Player 1 grabs player 2, `distancePx` away: the state on the tick the grab catches (its
 * freeze ahead). Throws if it does not catch.
 */
export function grabbed(
  config: MatchConfig = NAYO_MIRROR,
  overrides: [Partial<FighterState>, Partial<FighterState>] = [{}, {}],
  distancePx = 30,
): GameState {
  let state = step(facingOff(distancePx, config, overrides), [Input.Grab, 0], config);
  for (let tick = 0; tick < 20 && !state.hold; tick++) state = step(state, [0, 0], config);
  if (!state.hold) throw new Error('The grab did not catch');
  return state;
}

/** Whether a hold forms within `ticks`, player 1 grabbing on the first one. */
export function catches(
  start: GameState,
  ticks: number,
  config: MatchConfig = NAYO_MIRROR,
  opponent: (tick: number) => InputBits = () => 0,
): boolean {
  const states = play(
    start,
    ticks,
    (tick) => [tick === 0 ? Input.Grab : 0, opponent(tick)],
    config,
  );
  return states.some((state) => state.hold !== null);
}

/**
 * Plays `script` (inputs of each tick, counted from the start) for `ticks` ticks: the state
 * after each one.
 */
export function play(
  start: GameState,
  ticks: number,
  script: Script = NOTHING,
  config: MatchConfig = NAYO_MIRROR,
): GameState[] {
  const states: GameState[] = [];
  let state = start;
  for (let tick = 0; tick < ticks; tick++) {
    state = step(state, script(tick), config);
    states.push(state);
  }
  return states;
}

/**
 * Plays nothing until the hold is about to play its tick `t` (out of any freeze): the next step
 * is tick t of the hold.
 */
export function atHoldTick(
  start: GameState,
  t: number,
  config: MatchConfig = NAYO_MIRROR,
  inputs: TickInputs = [0, 0],
): GameState {
  let state = start;
  while (state.hitstop > 0 || (state.hold && state.hold.frame < t)) {
    state = step(state, inputs, config);
  }
  if (state.hold?.frame !== t) throw new Error(`The hold ended before its tick ${t}`);
  return state;
}

/** `button` on every other tick: a mash, each press a new one. */
export function mash(button: InputBits, tick: number): InputBits {
  return tick % 2 === 0 ? button : 0;
}

/** The last state, or the start when there is none. */
export function last(states: readonly GameState[], start: GameState): GameState {
  return states.at(-1) ?? start;
}

/** The first tick of `states` satisfying `test`, or -1. */
export function firstTick(
  states: readonly GameState[],
  test: (state: GameState) => boolean,
): number {
  return states.findIndex(test);
}

/** Health a player lost between two states. */
export function lost(before: GameState, after: GameState, player: 0 | 1): number {
  return before.fighters[player].health - after.fighters[player].health;
}
