import { describe, expect, it } from 'vitest';
import { startTrack, stepTrack, type ComboTrack } from '../../src/render/combo-counter';

/** Plays display frames, each with the defender's combo count and health. */
function play(frames: readonly (readonly [number, number])[], from = startTrack(1000)): ComboTrack {
  let track = from;
  for (const [comboCount, health] of frames) track = stepTrack(track, { comboCount, health });
  return track;
}

describe('combo counter', () => {
  it('counts the hits and the damage from the health before the first one', () => {
    const track = play([
      [0, 1000],
      [1, 960],
      [2, 930],
      [3, 905],
    ]);
    expect(track.hits).toBe(3);
    expect(track.damage).toBe(95);
  });

  it('pops on every new hit from the second one', () => {
    const one = play([[1, 960]]);
    expect(one.popFrames).toBe(0);
    const two = stepTrack(one, { comboCount: 2, health: 930 });
    expect(two.popFrames).toBeGreaterThan(0);
    const same = stepTrack(two, { comboCount: 2, health: 930 });
    expect(same.popFrames).toBe(two.popFrames - 1);
  });

  it('keeps the result a moment once the combo is over, then lets it go', () => {
    let track = play([
      [1, 960],
      [2, 930],
      [0, 930],
    ]);
    expect(track.holdFrames).toBeGreaterThan(0);
    expect(track.hits).toBe(2);
    for (let i = 0; i < 200; i++) track = stepTrack(track, { comboCount: 0, health: 930 });
    expect(track.holdFrames).toBe(0);
  });

  it('starts over when the defender is hit again on the tick they recover', () => {
    const track = play([
      [1, 960],
      [2, 930],
      [3, 900],
      [1, 870],
    ]);
    expect(track.hits).toBe(1);
    expect(track.damage).toBe(30);
  });
});
