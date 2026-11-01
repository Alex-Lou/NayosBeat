import { cpuUsage } from 'node:process';
import { describe, expect, it } from 'vitest';
import { DIRECTION_HISTORY_FRAMES } from '../../src/core/rules';
import { playCpuMatches } from './cpu-match';
import { MATCH } from './helpers';

/** Ten minutes of play. */
const TICKS = 36_000;
/**
 * About four times what these ticks take once warm: 125 to 135 ms of CPU on the development
 * machine, alone or with the rest of the suite running. The count is this process's CPU time,
 * not the wall clock: the other test files run alongside on the same cores, and that alone took
 * the wall clock past this budget on CI (605 ms) with the simulation unchanged. A regression
 * that makes the simulation several times slower fails; ordinary noise does not.
 */
const BUDGET_MS = 550;

describe('simulation performance', () => {
  it('plays ten minutes of CPU against CPU well within budget', () => {
    // Played once untimed first: the JIT has compiled the simulation when the count starts (a
    // single minute left it half done, at 300 ms).
    playCpuMatches(TICKS, MATCH);
    const start = cpuUsage();
    playCpuMatches(TICKS, MATCH);
    const used = cpuUsage(start);
    expect((used.user + used.system) / 1000).toBeLessThan(BUDGET_MS);
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
