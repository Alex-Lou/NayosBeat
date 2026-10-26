import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { step } from '../../src/core/step';

describe('step', () => {
  it('advances the frame counter by one tick', () => {
    expect(step(createInitialState()).frame).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const initial = createInitialState();
    step(initial);
    expect(initial).toEqual(createInitialState());
  });

  it('is deterministic', () => {
    const run = () => {
      let state = createInitialState();
      for (let i = 0; i < 600; i++) state = step(state);
      return state;
    };
    expect(run()).toEqual(run());
  });
});
