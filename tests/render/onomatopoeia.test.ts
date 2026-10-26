import { describe, expect, it } from 'vitest';
import { landHit, wordFor, type Tally } from '../../src/render/onomatopoeia';

describe('comic words of the blows', () => {
  it('adds up the hits a player lands until they take one', () => {
    let tally: Tally = [0, 0];
    tally = landHit(tally, 0);
    tally = landHit(tally, 0);
    tally = landHit(tally, 0);
    expect(tally).toEqual([3, 0]);
    tally = landHit(tally, 1);
    expect(tally).toEqual([0, 1]);
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
