import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/bal/colors';
import { STAGE_PROPS } from '../../src/art/bal/props';
import { drawBal } from '../../tools/stage/bal';
import { BAL_ATMOSPHERES } from '../../tools/stage/bal/atmospheres';
import { CHORUS_AT, CHORUS_CYCLE } from '../../tools/stage/bal/mid';
import { LAMP, NIGHT, PALETTE, SILL } from '../../tools/stage/bal/palette';
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

/** What the chorus moves (docs/art/decor-bal.md §5). */
const SWUNG = ['band', 'couple0', 'couple1', 'couple2'];

describe("the code's Bal du Samedi (docs/art/decor-bal.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'bal', drawn: drawBal(), palette: PALETTE, colors: STAGE_COLORS });

  it('offers the night, the rain and the snow behind its high windows', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([
      'midnight-clear',
      'midnight-rain',
      'midnight-snow',
    ]);
  });

  it('is sheltered: its rain and its snow fall behind the glass, each in its weather alone', () => {
    const map = STAGE_MAPS.find(({ name }) => name === 'bal');
    expect(map?.sheltered).toBe(true);
    for (const { atmosphere, art } of map?.variants ?? []) {
      const names = (art.props?.props ?? []).map(({ name }) => name);
      for (const window of [0, 1]) {
        expect(names.includes(`rain${window}`), atmosphere.weather).toBe(
          atmosphere.weather === 'rain',
        );
        expect(names.includes(`snow${window}`), atmosphere.weather).toBe(
          atmosphere.weather === 'snow',
        );
      }
    }
  });

  it('hides the snow on the sills but in the snow: the night there in every other palette', () => {
    for (const { atmosphere, palette } of BAL_ATMOSPHERES) {
      const night = palette[NIGHT[2] ?? 0];
      for (const slot of SILL) {
        if (atmosphere.weather === 'snow') expect(palette[slot]).not.toEqual(night);
        else expect(palette[slot], atmosphere.weather).toEqual(night);
      }
    }
  });

  it('swings all it moves in step with the chorus: one cycle, all changed on its first beat', () => {
    for (const name of SWUNG) {
      const total = propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0);
      expect(total, name).toBe(CHORUS_CYCLE);
      const before = new Set(
        Array.from({ length: 12 }, (_, step) => frameAt(name, CHORUS_AT - 12 + step)),
      );
      const hit = Array.from({ length: 12 }, (_, step) => frameAt(name, CHORUS_AT + step));
      expect(
        hit.some((frame) => !before.has(frame)),
        name,
      ).toBe(true);
    }
  });

  it('never flashes: no animation lights or puts out a bulb, the lamps are fixed', () => {
    // Its lights are in its still layers: an animation that drew a bulb where its first frame has
    // none, or put one out, would be a light coming and going (docs/flashs.md).
    const bulbs = new Set(LAMP.slice(2));
    for (const { name, frames } of drawBal().props) {
      const [still] = frames;
      if (!still) throw new Error(name);
      for (const frame of frames) {
        frame.pixels.forEach((slot, at) => {
          const before = still.pixels[at] ?? 0;
          if (bulbs.has(slot) !== bulbs.has(before)) throw new Error(`${name}: a bulb at ${at}`);
        });
      }
    }
    expect(bulbs.size).toBe(2);
  });
});
