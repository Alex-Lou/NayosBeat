import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { createInitialState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { MATCH, run } from './helpers';

describe('step', () => {
  it('advances the frame counter by one tick', () => {
    expect(step(createInitialState(MATCH), [0, 0], MATCH).frame).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const initial = createInitialState(MATCH);
    step(initial, [Input.Right, Input.Up], MATCH);
    expect(initial).toEqual(createInitialState(MATCH));
  });

  it('is deterministic for a scripted input sequence', () => {
    const script = (frame: number): [number, number] => [
      frame % 90 < 40 ? Input.Right : frame % 90 < 50 ? Input.Up | Input.Right : Input.Down,
      frame % 70 < 30 ? Input.Left : frame % 70 < 35 ? Input.Jump : Input.Right,
    ];
    const play = () => {
      let state = createInitialState(MATCH);
      for (let i = 0; i < 1200; i++) state = step(state, script(i), MATCH);
      return state;
    };
    expect(play()).toEqual(play());
  });

  it('treats both players symmetrically', () => {
    const state = run(30, [Input.Right, Input.Left]);
    const [a, b] = state.fighters;
    const center = MATCH.stage.width / 2;
    expect(center - a.x).toBe(b.x - center);
    expect(a.action).toBe(b.action);
  });
});
