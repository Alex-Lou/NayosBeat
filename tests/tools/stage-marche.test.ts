import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/marche/colors';
import { STAGE_PROPS } from '../../src/art/marche/props';
import { drawMarche } from '../../tools/stage/marche';
import { CYCLE, FLARE_AT } from '../../tools/stage/marche/mid';
import { LANTERN, PALETTE, WINDOW } from '../../tools/stage/marche/palette';
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

describe("the code's Night Market (docs/art/decor-night-market.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'marche', drawn: drawMarche(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a night, and a dusk: clear, rain, fog, the night first', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual([
      'midnight-clear',
      'dusk-clear',
      'midnight-rain',
      'midnight-fog',
    ]);
    const map = STAGE_MAPS.find(({ name }) => name === 'marche');
    expect(map?.sheltered).toBe(false);
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
  });

  it('flares its wok once a cycle, at FLARE_AT, for 60 steps', () => {
    expect(propNamed('flare').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
    const lit = Array.from({ length: CYCLE }, (_, step) => frameAt('flare', step) >= 1);
    expect(lit.indexOf(true)).toBe(FLARE_AT);
    expect(lit.filter(Boolean).length).toBe(60);
  });

  it('never flashes: no animation lights or puts out a lantern or a far window', () => {
    const lights = new Set([...LANTERN.slice(1), ...WINDOW.slice(1)]);
    for (const { name, frames } of drawMarche().props) {
      const [still] = frames;
      if (!still) throw new Error(name);
      for (const frame of frames) {
        frame.pixels.forEach((slot, at) => {
          const before = still.pixels[at] ?? 0;
          if (lights.has(slot) !== lights.has(before)) throw new Error(`${name}: a light at ${at}`);
        });
      }
    }
    expect(lights.size).toBeGreaterThan(0);
  });

  it('loops its steam and its tassels over the same cycle as the flare', () => {
    for (const name of ['steam', 'tasselL', 'tasselR']) {
      expect(
        propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
    }
  });
});
