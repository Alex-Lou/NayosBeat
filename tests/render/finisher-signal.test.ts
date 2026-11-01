import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { finisherState } from '../../src/core/finisher';
import { FLAG_DANGER, type GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import {
  FinisherSignal,
  finisherSignalOf,
  NO_SIGNAL,
  sirenPitchOf,
} from '../../src/render/finisher-signal';
import { armedStart } from '../core/finisher-helpers';

const CONFIG: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

/** Player `by` with every light on, `distance` px from its victim. */
const ready = (by: 0 | 1): GameState => armedStart(CONFIG, by, { distance: 60 });
/** The same pair, the victim 11 blows into a combo: no room left for the super's. */
const blocked = (by: 0 | 1): GameState =>
  armedStart(CONFIG, by, { distance: 60, victim: { comboCount: 11, flags: FLAG_DANGER } });
/** The same pair, no one at match point. */
const off = (by: 0 | 1): GameState => armedStart(CONFIG, by, { distance: 60, wins: [0, 0] });

/** A signal whose sirens are counted, by player. */
function counted(): { signal: FinisherSignal; sirens: (0 | 1)[] } {
  const sirens: (0 | 1)[] = [];
  return { signal: new FinisherSignal(CONFIG, (player) => sirens.push(player)), sirens };
}

describe('the Finisher signal (docs/finisher.md §1.2)', () => {
  it("is the core's predicate while the fight runs, off between rounds", () => {
    for (const make of [ready, blocked, off]) {
      for (const by of [0, 1] as const) {
        const state = make(by);
        expect(finisherSignalOf(state, by, CONFIG)).toBe(finisherState(state, by, CONFIG));
        for (const phase of ['intro', 'roundEnd', 'matchEnd'] as const) {
          const between = { ...state, round: { ...state.round, phase } };
          expect(finisherSignalOf(between, by, CONFIG), phase).toBe('off');
        }
      }
    }
    expect(finisherSignalOf(ready(0), 0, CONFIG)).toBe('ready');
    expect(finisherSignalOf(blocked(1), 1, CONFIG)).toBe('blocked');
  });

  it('reads both players once a frame for every reader', () => {
    const { signal } = counted();
    expect(signal.states).toEqual(NO_SIGNAL);
    signal.update(ready(1));
    expect(signal.states).toEqual(['off', 'ready']);
    signal.update(blocked(0));
    expect(signal.states).toEqual(['blocked', 'off']);
  });

  it('sounds the siren on the rising front of ready only, once a round for each player', () => {
    const { signal, sirens } = counted();
    signal.update(off(0));
    signal.update(blocked(0));
    expect(sirens).toEqual([]);
    signal.update(ready(0));
    signal.update(ready(0));
    expect(sirens).toEqual([0]);
    // Ready again in the same round: no second siren.
    signal.update(blocked(0));
    signal.update(ready(0));
    signal.update(off(0));
    signal.update(ready(0));
    expect(sirens).toEqual([0]);
    // The other player's own, then both again next round.
    signal.update(ready(1));
    expect(sirens).toEqual([0, 1]);
    const next = (state: GameState): GameState => ({
      ...state,
      round: { ...state.round, number: 2 },
    });
    signal.update(next(ready(0)));
    signal.update(next(off(0)));
    signal.update(next(ready(1)));
    signal.update(next(ready(0)));
    expect(sirens).toEqual([0, 1, 0, 1]);
  });

  it("plays each fighter's siren in its own key: Nayo's do, Riff's mi", () => {
    expect(sirenPitchOf('nayo')).toBe(1);
    expect(262 * sirenPitchOf('riff')).toBeCloseTo(330, 6);
    // Her fifth, si: within a hertz of 494 Hz.
    expect(Math.abs(392 * sirenPitchOf('riff') - 494)).toBeLessThan(1);
  });
});
