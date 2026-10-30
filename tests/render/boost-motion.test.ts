import { describe, expect, it } from 'vitest';
import { BOOST_BAR, BOOST_MAX } from '../../src/core/rules';
import {
  barsOf,
  BREAK_TICKS,
  DRAIN_RATE,
  FILL_RATE,
  freshBoost,
  isDraining,
  isFull,
  LEVEL_UP_TICKS,
  stepBoost,
  type BoostMotion,
  type Breakage,
} from '../../src/render/boost-motion';

/** Steps `motion` one tick at a time for `ticks` ticks, the fighter on `boost`. */
function run(
  motion: BoostMotion,
  ticks: number,
  boost: number,
  breakage: Breakage | null = null,
): BoostMotion {
  let state = motion;
  for (let tick = 0; tick < ticks; tick++) {
    state = stepBoost(state, boost, breakage, state.frame + 1);
  }
  return state;
}

describe('Boost gauge motion', () => {
  it('fills up to the Boost rather than jumping to it', () => {
    const state = run(freshBoost(0), 1, 600);
    expect(state.shown).toBe(FILL_RATE);
    expect(run(state, 100, 600).shown).toBe(600);
  });

  it('lights up the bar it completes', () => {
    // 900 + 2 ticks of FILL_RATE: the first bar just completed.
    let state = run(freshBoost(0, 900), 2, 1300);
    expect(state.shown).toBe(BOOST_BAR);
    expect(state.levelUp).toBe(LEVEL_UP_TICKS);
    expect(state.levelUpBar).toBe(0);
    state = run(state, LEVEL_UP_TICKS, 1300);
    expect(state.levelUp).toBe(0);
    // Each bar in turn: the third lights up the full gauge.
    state = run(freshBoost(0, 2950), 1, BOOST_MAX);
    expect(state.levelUpBar).toBe(2);
    expect(isFull(state)).toBe(true);
  });

  it('drains fast what a Boost move spends', () => {
    const full = freshBoost(0, BOOST_MAX);
    const spent = stepBoost(full, BOOST_MAX - BOOST_BAR, null, 1);
    expect(spent.shown).toBe(BOOST_MAX - DRAIN_RATE);
    expect(isDraining(spent)).toBe(true);
    const drained = run(spent, BOOST_BAR / DRAIN_RATE, BOOST_MAX - BOOST_BAR);
    expect(drained.shown).toBe(BOOST_MAX - BOOST_BAR);
    expect(isDraining(drained)).toBe(false);
    // The super spends the whole gauge in half a second.
    expect(run(full, 30, 0).shown).toBe(0);
  });

  it('shatters at a KO and comes back whole for the next round, its Boost kept', () => {
    let state = run(freshBoost(0, 1500), 1, 1500, 'shatter');
    expect(state.broken).toBe(1);
    state = run(state, BREAK_TICKS + 30, 1500, 'shatter');
    expect(state.broken).toBe(BREAK_TICKS);
    state = run(state, 1, 1500);
    expect(state.broken).toBe(-1);
    expect(state.shown).toBe(1500);
  });

  it('counts its whole bars', () => {
    expect([0, 999, 1000, 2500, BOOST_MAX, BOOST_MAX + 10].map(barsOf)).toEqual([0, 0, 1, 2, 3, 3]);
  });

  it('restarts with a new match', () => {
    expect(stepBoost(run(freshBoost(0), 50, 2000), 0, null, 0)).toEqual(freshBoost(0));
  });
});
