import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/plage/colors';
import { STAGE_PROPS } from '../../src/art/plage/props';
import { drawPlage } from '../../tools/stage/plage';
import { BIG_WAVE_AT, CYCLE } from '../../tools/stage/plage/mid';
import { LAMP, PALETTE, SUN } from '../../tools/stage/plage/palette';
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

describe("the code's Sunset Beach (docs/art/decor-plage.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'plage', drawn: drawPlage(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a golden hour only, its base the clear dusk: clear, a shower, a sea mist', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear', 'dusk-rain', 'dusk-fog']);
    const map = STAGE_MAPS.find(({ name }) => name === 'plage');
    expect(map?.sheltered).toBe(false);
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
  });

  it('breathes: few people, the sea open in the middle where its waves are animated', () => {
    const { props } = drawPlage();
    const waves = props.filter(({ name }) => name.startsWith('wave'));
    const people = props.filter(({ name }) => ['sunbather', 'reader', 'bartender'].includes(name));
    expect(waves.map(({ name }) => name)).toEqual(['wave0', 'wave1']);
    // The waves move where no one stands in front of them: the bathers left, the bar right.
    for (const { name, rect } of waves) {
      for (const person of people) {
        const apart =
          person.rect.x + person.rect.width <= rect.x || person.rect.x >= rect.x + rect.width;
        expect(apart, `${name} behind ${person.name}`).toBe(true);
      }
    }
  });

  it('breaks its big wave once a cycle, the gulls flying over with it', () => {
    for (const name of ['wave0', 'wave1']) {
      const total = propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0);
      expect(total, name).toBe(CYCLE);
      const big = Array.from({ length: CYCLE }, (_, step) => frameAt(name, step) >= 4);
      expect(big.indexOf(true), name).toBe(BIG_WAVE_AT);
      expect(big.filter(Boolean).length, name).toBe(60);
    }
    const { drift } = propNamed('gulls');
    expect(drift && drift.start <= BIG_WAVE_AT && drift.start + drift.steps >= BIG_WAVE_AT).toBe(
      true,
    );
  });

  it('never flashes: no animation lights or puts out the sun or a bulb', () => {
    const lights = new Set([...SUN.slice(1), ...LAMP.slice(1)]);
    for (const { name, frames } of drawPlage().props) {
      const [still] = frames;
      if (!still) throw new Error(name);
      for (const frame of frames) {
        frame.pixels.forEach((slot, at) => {
          const before = still.pixels[at] ?? 0;
          if (lights.has(slot) !== lights.has(before)) throw new Error(`${name}: a light at ${at}`);
        });
      }
    }
    expect(lights.size).toBe(4);
  });
});
