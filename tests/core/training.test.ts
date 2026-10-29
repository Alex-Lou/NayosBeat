import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import { BOOST_MAX, ROUND_TIME, TRAINING_REFILL_FRAMES } from '../../src/core/rules';
import { createInitialState } from '../../src/core/state';
import { MATCH, run } from './helpers';

const TRAINING: MatchConfig = { ...MATCH, training: true };

describe('training mode', () => {
  it('starts without an intro and keeps the timer frozen', () => {
    const start = createInitialState(TRAINING);
    expect(start.round.phase).toBe('fight');
    expect(run(600, [0, 0], start, TRAINING).round.timer).toBe(ROUND_TIME);
  });

  it('never KOs the dummy', () => {
    const start = createInitialState(TRAINING);
    const lowHealth = {
      ...start,
      fighters: [
        start.fighters[0],
        { ...start.fighters[1], health: 5, x: start.fighters[0].x + 3000 },
      ],
    } as const;
    const after = run(30, [Input.Heavy, 0], lowHealth, TRAINING);
    expect(after.fighters[1].health).toBeGreaterThanOrEqual(1);
    expect(after.round.phase).toBe('fight');
  });

  it('refills health once the dummy is left alone', () => {
    const start = createInitialState(TRAINING);
    const hurt = {
      ...start,
      fighters: [start.fighters[0], { ...start.fighters[1], health: 100 }],
    } as const;
    expect(run(TRAINING_REFILL_FRAMES - 5, [0, 0], hurt, TRAINING).fighters[1].health).toBe(100);
    expect(run(TRAINING_REFILL_FRAMES + 5, [0, 0], hurt, TRAINING).fighters[1].health).toBe(
      TRAINING.fighters[1].maxHealth,
    );
  });

  it('plays the gauge as told (combos-v3 §6.5): as in a match, full when left alone, or infinite', () => {
    const spent = (config: MatchConfig) => {
      const start = createInitialState(config);
      return {
        ...start,
        fighters: [{ ...start.fighters[0], boost: 500 }, start.fighters[1]],
      } as const;
    };
    const gauge = (config: MatchConfig, ticks: number) =>
      run(ticks, [0, 0], spent(config), config).fighters[0].boost;
    // As in a match: it starts empty and never refills.
    expect(createInitialState(TRAINING).fighters[0].boost).toBe(0);
    expect(gauge(TRAINING, TRAINING_REFILL_FRAMES + 5)).toBe(500);
    // Full: three bars at the start, and back to them with the health.
    const full: MatchConfig = { ...TRAINING, trainingGauge: 'full' };
    expect(createInitialState(full).fighters.map((fighter) => fighter.boost)).toEqual([
      BOOST_MAX,
      BOOST_MAX,
    ]);
    expect(gauge(full, TRAINING_REFILL_FRAMES - 5)).toBe(500);
    expect(gauge(full, TRAINING_REFILL_FRAMES + 5)).toBe(BOOST_MAX);
    // Infinite: refilled on every tick.
    const infinite: MatchConfig = { ...TRAINING, trainingGauge: 'infinite' };
    expect(gauge(infinite, 1)).toBe(BOOST_MAX);
  });

  it('never fills the gauge in a match, whatever the option says', () => {
    const match: MatchConfig = { ...MATCH, trainingGauge: 'infinite' };
    expect(createInitialState(match).fighters[0].boost).toBe(0);
    expect(run(5, [0, 0], createInitialState(match), match).fighters[0].boost).toBe(0);
  });
});
