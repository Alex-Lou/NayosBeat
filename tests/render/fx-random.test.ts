import { describe, expect, it } from 'vitest';
import { FxRandom } from '../../src/render/fx-random';

/** The first `count` values after reseeding to `tick`. */
function draw(random: FxRandom, tick: number, count = 8): number[] {
  random.reseed(tick);
  return Array.from({ length: count }, () => random.next());
}

describe("the effects' seeded randomness (docs/polish/AUDIT-ET-PLAN.md §3.0)", () => {
  it('plays the same tick the same, whatever was drawn before', () => {
    const fresh = new FxRandom();
    const used = new FxRandom();
    for (let i = 0; i < 100; i++) used.next();
    expect(draw(used, 412)).toEqual(draw(fresh, 412));
  });

  it('plays two ticks differently, and stays in [0, 1)', () => {
    const random = new FxRandom();
    expect(draw(random, 412)).not.toEqual(draw(random, 413));
    const values = Array.from({ length: 1000 }, (_, tick) => draw(random, tick, 1)[0] ?? -1);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(990);
  });

  it('spreads between its bounds', () => {
    const random = new FxRandom(7);
    const values = Array.from({ length: 200 }, () => random.between(-2, 3));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-2);
    expect(Math.max(...values)).toBeLessThan(3);
  });
});
