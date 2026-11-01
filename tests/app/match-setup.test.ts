import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, matchConfigOf } from '../../src/app/match-setup';

describe('the match a setup plays (docs/finisher.md §1.12)', () => {
  it('gives training its gauge, its Finisher and its dummy’s health, a match none of them', () => {
    const setup = { ...DEFAULT_SETUP, finisher: 'always', dummyHealth: 30 } as const;
    expect(matchConfigOf({ ...setup, mode: 'training' })).toMatchObject({
      training: true,
      trainingGauge: 'full',
      trainingFinisher: 'always',
      trainingDummyHealth: 30,
    });
    const match = matchConfigOf({ ...setup, mode: 'cpu' });
    expect(match).not.toHaveProperty('trainingFinisher');
    expect(match).not.toHaveProperty('trainingDummyHealth');
    // By default: as in a match, the dummy back to its whole health.
    expect(DEFAULT_SETUP).toMatchObject({ finisher: 'match', dummyHealth: 100 });
  });
});
