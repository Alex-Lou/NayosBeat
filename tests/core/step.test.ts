import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { step } from '../../src/core/step';
import { fightState, MATCH, MIRROR_MATCH, run } from './helpers';

describe('step', () => {
  it('advances the frame counter by one tick', () => {
    expect(step(fightState(), [0, 0], MATCH).frame).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const initial = fightState();
    const snapshot = structuredClone(initial);
    step(initial, [Input.Right | Input.Light, Input.Up], MATCH);
    expect(initial).toEqual(snapshot);
  });

  it('is deterministic for a scripted fight', () => {
    // Movement patterns with an attack press every 20 ticks, offset between players.
    const attack = (frame: number): number =>
      frame % 20 === 0 ? Input.Light : frame % 20 === 10 ? Input.Heavy : 0;
    const script = (frame: number): [number, number] => [
      (frame % 90 < 50 ? Input.Right : frame % 90 < 60 ? Input.Up | Input.Right : Input.Down) |
        attack(frame),
      (frame % 70 < 40 ? Input.Left : frame % 70 < 45 ? Input.Jump : Input.Down | Input.Right) |
        attack(frame + 7),
    ];
    const play = () => {
      let state = fightState();
      for (let i = 0; i < 3000; i++) state = step(state, script(i), MATCH);
      return state;
    };
    const result = play();
    expect(result).toEqual(play());
    // The script must actually exercise combat, not just movement.
    expect(result.round.number > 1 || result.fighters.some((f) => f.health < 900)).toBe(true);
  });

  it('treats both players symmetrically', () => {
    const state = run(30, [Input.Right, Input.Left], fightState(MIRROR_MATCH), MIRROR_MATCH);
    const [a, b] = state.fighters;
    const center = MIRROR_MATCH.stage.width / 2;
    expect(center - a.x).toBe(b.x - center);
    expect(a.action).toBe(b.action);
  });
});
