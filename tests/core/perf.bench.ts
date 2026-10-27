import { expect, test } from 'vitest';
import { playCpuMatches } from './cpu-match';
import { MATCH } from './helpers';

const TICKS = 100_000;
/** docs/combat-v2.md §14.5: under 0.05 ms per tick on average, i.e. 5 s for these ticks. */
const BUDGET_MS_PER_TICK = 0.05;

/**
 * The simulation's speed, CPU decisions included: `npm run bench`. The verbose reporter
 * prints the timings; the budget is checked as well, so a slow simulation fails the bench.
 */
test('simulation speed', async ({ bench }) => {
  const result = await bench('100 000 ticks of CPU against CPU', () => {
    playCpuMatches(TICKS, MATCH);
  }).run({ iterations: 10, time: 0 });
  // tinybench reports latencies in milliseconds per run of the function.
  expect(result.latency.mean / TICKS).toBeLessThan(BUDGET_MS_PER_TICK);
});
