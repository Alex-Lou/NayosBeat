import { describe, expect, it } from 'vitest';
import { benchPair, formatResult, levelsOf, pairsOf } from '../../tools/bench/cpu';

/** The CPU bench (tools/bench/cpu.ts): seeded, sides swapped, its arguments checked. */
describe('the CPU bench', () => {
  it('gives the same numbers for the same call', () => {
    const once = benchPair('saphir', 'nayo', 'hard', 2);
    expect(benchPair('saphir', 'nayo', 'hard', 2)).toEqual(once);
    expect(once.wins + once.draws).toBeLessThanOrEqual(2);
    expect(formatResult(once)).toMatch(/^hard {4}Saphir > Nayo +\d+\.\d %/);
  });

  it('plays every pair of the roster when no fighter is named', () => {
    expect(pairsOf([])).toHaveLength(10);
    expect(pairsOf(['saphir', 'riff', '--matches', '50'])).toEqual([['saphir', 'riff']]);
    expect(levelsOf(['--levels', 'easy,hard'])).toEqual(['easy', 'hard']);
    expect(levelsOf([])).toEqual(['hard']);
  });

  it('says what is wrong with its arguments, and how to fix them', () => {
    expect(() => pairsOf(['saphyr', 'nayo'])).toThrow(/Unknown fighter « saphyr »: pick from/);
    expect(() => pairsOf(['saphir'])).toThrow(/Name two fighters/);
    expect(() => levelsOf(['--levels', 'expert'])).toThrow(/Unknown level « expert »/);
  });
});
