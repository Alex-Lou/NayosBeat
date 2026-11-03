import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/club/colors';
import { STAGE_PROPS } from '../../src/art/club/props';
import { drawClub } from '../../tools/stage/club';
import { BASS_AT, BASS_CYCLE } from '../../tools/stage/club/mid';
import { PALETTE, VIOLET } from '../../tools/stage/club/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

function frameAt(name: string, step: number): number {
  const { timeline } = propNamed(name);
  const total = timeline.reduce((sum, [, steps]) => sum + steps, 0);
  let left = step % total;
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

/** What the bass shakes (docs/art/decor-club.md §5). */
const SHAKEN = ['crowd0', 'crowd1', 'crowd2', 'crowd3', 'dj', 'cones', 'bartender'];

describe("the code's L'Entrepôt, inside (docs/art/decor-club.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'club', drawn: drawClub(), palette: PALETTE, colors: STAGE_COLORS });

  it('offers the night, the stage smoke and the rain at the loading door', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([
      'midnight-clear',
      'midnight-fog',
      'midnight-rain',
    ]);
  });

  it('rains at its door only: sheltered, its rain drawn in the opening, in the rain alone', () => {
    const map = STAGE_MAPS.find(({ name }) => name === 'club');
    expect(map?.sheltered).toBe(true);
    for (const { atmosphere, art } of map?.variants ?? []) {
      const names = (art.props?.props ?? []).map(({ name }) => name);
      expect(names.includes('doorRain'), atmosphere.weather).toBe(atmosphere.weather === 'rain');
    }
  });

  it('shakes all it moves in step with the bass: one cycle, all changed on its first beat', () => {
    for (const name of SHAKEN) {
      const total = propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0);
      expect(total, name).toBe(BASS_CYCLE);
      const before = new Set(
        Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT - 15 + step)),
      );
      const hit = Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT + step));
      expect(
        hit.some((frame) => !before.has(frame)),
        name,
      ).toBe(true);
    }
  });

  it('never strobes: no animation lights or puts out a violet tube, the LEDs are fixed', () => {
    // Its lights are in its still layers: an animation that drew a tube where its first frame has
    // none, or put one out, would be a light coming and going (docs/flashs.md).
    const tubes = new Set(VIOLET.slice(2));
    for (const { name, frames } of drawClub().props) {
      const [still] = frames;
      if (!still) throw new Error(name);
      for (const frame of frames) {
        frame.pixels.forEach((slot, at) => {
          const before = still.pixels[at] ?? 0;
          if (tubes.has(slot) !== tubes.has(before)) throw new Error(`${name}: a tube at ${at}`);
        });
      }
    }
    expect(tubes.size).toBe(3);
  });
});
