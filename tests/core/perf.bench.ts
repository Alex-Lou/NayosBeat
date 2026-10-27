import { test } from 'vitest';
import { playCpuMatches } from './cpu-match';
import { MATCH } from './helpers';

/**
 * The simulation's speed, CPU decisions included: `npm run bench`. Budget: under 0.05 ms per
 * tick on average (docs/combat-v2.md §14.5), i.e. 5 s for these 100 000 ticks.
 */
test('simulation speed', async ({ bench }) => {
  await bench('100 000 ticks of CPU against CPU', () => {
    playCpuMatches(100_000, MATCH);
  }).run({ iterations: 10, time: 0 });
});
