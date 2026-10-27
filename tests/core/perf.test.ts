import { describe, expect, it } from 'vitest';
import { DIRECTION_HISTORY_FRAMES } from '../../src/core/rules';
import { playCpuMatches } from './cpu-match';
import { MATCH } from './helpers';

/** Ten minutes of play. */
const TICKS = 36_000;
/**
 * Three times what these ticks took when this guard was written: 150 to 185 ms on the
 * development machine, JIT warm-up included, with the rest of the suite running alongside.
 * A regression that makes the simulation several times slower fails; ordinary noise does not.
 */
const BUDGET_MS = 550;

describe('simulation performance', () => {
  it('plays ten minutes of CPU against CPU well within budget', () => {
    const start = performance.now();
    playCpuMatches(TICKS, MATCH);
    expect(performance.now() - start).toBeLessThan(BUDGET_MS);
  });

  it('keeps the state from growing over a long session', () => {
    let projectiles = 0;
    let history = 0;
    let contacts = 0;
    playCpuMatches(TICKS, MATCH, ['hard', 'normal'], (state) => {
      projectiles = Math.max(projectiles, state.projectiles.length);
      contacts = Math.max(contacts, state.contacts.length);
      for (const fighter of state.fighters) {
        history = Math.max(history, fighter.directionHistory.length);
      }
    });
    expect(projectiles).toBeLessThanOrEqual(2);
    expect(contacts).toBeLessThanOrEqual(2);
    expect(history).toBe(DIRECTION_HISTORY_FRAMES);
  });
});
