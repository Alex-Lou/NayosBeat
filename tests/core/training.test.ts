import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import { ROUND_TIME, TRAINING_REFILL_FRAMES } from '../../src/core/rules';
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
});
