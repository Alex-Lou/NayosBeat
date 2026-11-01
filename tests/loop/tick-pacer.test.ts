import { describe, expect, it } from 'vitest';
import { FixedTimestep } from '../../src/loop/fixed-timestep';
import { TickPacer } from '../../src/loop/tick-pacer';

const FRAME_MS = 1000 / 60;

/** A seeded jitter in [-1, 1): the same display frames on every run. */
function jitter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 2 ** 31 - 1;
  };
}

/** The ticks of each of `frames` frames of the visual clock, one frame at a time. */
function paced(ticks: number, frames: number, count: number): number[] {
  const pacer = new TickPacer(ticks, frames);
  return Array.from({ length: count }, () => pacer.advance(1));
}

describe('TickPacer (docs/art/animation-plan.md §2, V0)', () => {
  it('holds each tick the same number of frames: 1 for 2, 2 for 3, 1 for 4', () => {
    expect(paced(1, 2, 8)).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    expect(paced(2, 3, 9)).toEqual([0, 1, 1, 0, 1, 1, 0, 1, 1]);
    expect(paced(1, 4, 8)).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
    expect(paced(1, 1, 4)).toEqual([1, 1, 1, 1]);
  });

  it('plays exactly its ticks over 600 frames', () => {
    const sum = (ticks: readonly number[]) => ticks.reduce((total, each) => total + each, 0);
    expect(sum(paced(1, 2, 600))).toBe(300);
    expect(sum(paced(2, 3, 600))).toBe(400);
    expect(sum(paced(1, 4, 600))).toBe(150);
  });

  for (const hz of [60, 144]) {
    it(`stays exact on a ${hz} Hz screen whose frames jitter`, () => {
      // The display frames go through the visual clock as in FightScene, a few frames of it at
      // once or none: after every display frame, the ticks played are those owed, to the tick.
      for (const [ticks, frames] of [
        [1, 2],
        [2, 3],
        [1, 4],
      ] as const) {
        const clock = new FixedTimestep(FRAME_MS, 5);
        const pacer = new TickPacer(ticks, frames);
        const noise = jitter(hz + frames);
        let visual = 0;
        let played = 0;
        while (visual < 600) {
          const deltaMs = (1000 / hz) * (1 + 0.4 * noise());
          const gone = Math.min(clock.advance(deltaMs), 600 - visual);
          visual += gone;
          played += pacer.advance(gone);
          expect(played).toBe(Math.floor((visual * ticks) / frames));
        }
        expect(played).toBe((600 * ticks) / frames);
      }
    });
  }

  it('plays nothing for no frame, and refuses a pace that is not whole', () => {
    expect(new TickPacer(1, 2).advance(0)).toBe(0);
    expect(() => new TickPacer(1, 0)).toThrow(RangeError);
    expect(() => new TickPacer(0.5, 1)).toThrow(RangeError);
  });
});
