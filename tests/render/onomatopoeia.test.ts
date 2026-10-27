import { describe, expect, it } from 'vitest';
import {
  landHit,
  NO_TALLY,
  startTick,
  wordFor,
  type TickTally,
} from '../../src/render/onomatopoeia';

/** Plays ticks, each with the players who landed a blow on it, and returns the ranks shown. */
function play(ticks: readonly (readonly (0 | 1)[])[]): { counts: number[]; tally: TickTally } {
  let tally = NO_TALLY;
  const counts: number[] = [];
  for (const blows of ticks) {
    tally = startTick(tally);
    for (const by of blows) {
      const landed = landHit(tally, by);
      counts.push(landed.count);
      tally = landed.tally;
    }
  }
  return { counts, tally };
}

describe('comic words of the blows', () => {
  it('adds up the hits a player lands until they take one', () => {
    const { counts, tally } = play([[0], [0], [0], [1]]);
    expect(counts).toEqual([1, 2, 3, 1]);
    expect(tally.now).toEqual([0, 1]);
  });

  it('counts a trade the same whatever the player order: each shows its streak, both reset', () => {
    // Player 1 has landed two hits when both players hit each other on the same tick.
    const first = play([[0], [0], [0, 1]]);
    const second = play([[0], [0], [1, 0]]);
    expect(first.counts.slice(-2)).toEqual([3, 1]);
    expect(second.counts.slice(-2)).toEqual([1, 3]);
    expect(first.tally.now).toEqual([0, 0]);
    expect(second.tally.now).toEqual([0, 0]);
  });

  it('never repeats a word on two blows in a row', () => {
    for (const kind of ['light', 'heavy'] as const) {
      for (let count = 1; count < 12; count++) {
        expect(wordFor(kind, count)).not.toBe(wordFor(kind, count + 1));
      }
    }
  });

  it('booms on the knockout, whatever the tally', () => {
    expect(wordFor('ko', 1)).toBe('BOUM');
    expect(wordFor('ko', 7)).toBe('BOUM');
  });
});
