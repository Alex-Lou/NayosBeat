import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { matchWinner, updateRound } from '../../src/core/round';
import {
  INTRO_FRAMES,
  MATCH_END_FRAMES,
  ROUND_END_FRAMES,
  ROUND_TIME,
  ROUNDS_TO_WIN,
} from '../../src/core/rules';
import { createInitialState, type GameState } from '../../src/core/state';
import { MATCH, fightState, run } from './helpers';

function withHealth(state: GameState, healthA: number, healthB: number): GameState {
  const [a, b] = state.fighters;
  return {
    ...state,
    fighters: [
      { ...a, health: healthA },
      { ...b, health: healthB },
    ],
  };
}

function advance(state: GameState, ticks: number): GameState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = updateRound(current, MATCH);
  return current;
}

describe('round flow', () => {
  it('starts with an intro during which inputs are ignored', () => {
    const start = createInitialState(MATCH);
    expect(start.round.phase).toBe('intro');
    const state = run(INTRO_FRAMES - 1, [Input.Right, 0], start);
    expect(state.round.phase).toBe('intro');
    expect(state.fighters[0].x).toBe(start.fighters[0].x);
  });

  it('starts the fight after the intro', () => {
    expect(run(INTRO_FRAMES, [0, 0], createInitialState(MATCH)).round.phase).toBe('fight');
  });

  it('counts the timer down only during the fight', () => {
    const state = run(60, [0, 0], fightState());
    expect(state.round.timer).toBe(ROUND_TIME - 60);
  });

  it('ends the round on KO and gives the win to the survivor', () => {
    const state = updateRound(withHealth(fightState(), 0, 500), MATCH);
    expect(state.round.phase).toBe('roundEnd');
    expect(state.round.result).toEqual({ winner: 1, reason: 'ko' });
    expect(state.round.wins).toEqual([0, 1]);
  });

  it('gives the round to both players on a double KO, so a match always ends', () => {
    const state = updateRound(withHealth(fightState(), 0, 0), MATCH);
    expect(state.round.result).toEqual({ winner: null, reason: 'ko' });
    expect(state.round.wins).toEqual([1, 1]);
  });

  it('ends in a drawn match when both players reach the winning score together', () => {
    const tied = {
      ...fightState(),
      round: { ...fightState().round, wins: [ROUNDS_TO_WIN - 1, ROUNDS_TO_WIN - 1] as const },
    };
    const ended = advance(updateRound(withHealth(tied, 0, 0), MATCH), ROUND_END_FRAMES);
    expect(ended.round.phase).toBe('matchEnd');
    expect(matchWinner(ended.round)).toBeNull();
  });

  it('decides a time out on remaining health ratio', () => {
    const lastTick = { ...fightState(), round: { ...fightState().round, timer: 1 } };
    // 600/1000 = 60 % vs 500/900 = 55.6 %: player 1 wins although the gap looks small.
    const state = updateRound(withHealth(lastTick, 600, 500), MATCH);
    expect(state.round.result).toEqual({ winner: 0, reason: 'timeout' });
  });

  it('starts the next round with full health and the score kept', () => {
    const ended = updateRound(withHealth(fightState(), 0, 500), MATCH);
    const next = advance(ended, ROUND_END_FRAMES);
    expect(next.round.number).toBe(2);
    expect(next.round.phase).toBe('intro');
    expect(next.round.wins).toEqual([0, 1]);
    expect(next.fighters[0].health).toBe(MATCH.fighters[0].maxHealth);
  });

  it('ends the match at the required number of wins and stays there', () => {
    const matchPoint = {
      ...fightState(),
      round: { ...fightState().round, wins: [ROUNDS_TO_WIN - 1, 0] as const },
    };
    const ended = advance(updateRound(withHealth(matchPoint, 500, 0), MATCH), ROUND_END_FRAMES);
    expect(ended.round.phase).toBe('matchEnd');
    expect(ended.round.wins).toEqual([ROUNDS_TO_WIN, 0]);
    expect(matchWinner(ended.round)).toBe(0);

    // The application decides what comes next (results screen): no automatic restart.
    expect(advance(ended, MATCH_END_FRAMES * 10).round.phase).toBe('matchEnd');
  });
});
