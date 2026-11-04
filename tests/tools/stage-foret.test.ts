import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/foret/colors';
import { STAGE_PROPS } from '../../src/art/foret/props';
import { drawForet } from '../../tools/stage/foret';
import { CYCLE, GUST_AT } from '../../tools/stage/foret/mid';
import { PALETTE } from '../../tools/stage/foret/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

describe("the code's Dancing Forest (docs/art/decor-forest-dance.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'foret', drawn: drawForet(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a night only: clear, rain, fog, the night first', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear', 'midnight-rain', 'midnight-fog']);
    const map = STAGE_MAPS.find(({ name }) => name === 'foret');
    expect(map?.sheltered).toBe(false);
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
  });

  it('sweeps its gust of leaves once a cycle, centered on GUST_AT', () => {
    expect(propNamed('gust').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
    const drift = propNamed('gust').drift;
    expect(drift).toBeDefined();
    expect(drift && drift.start <= GUST_AT && drift.start + drift.steps >= GUST_AT).toBe(true);
    expect(drift && drift.start + drift.steps / 2).toBe(GUST_AT);
  });

  it('dances its crowns stronger as the gust sweeps, every state held 20 steps at least', () => {
    for (const name of ['canopy0', 'canopy1', 'canopy2']) {
      const timeline = propNamed(name).timeline;
      expect(
        timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
      expect(Math.min(...timeline.map(([, steps]) => steps)), name).toBeGreaterThanOrEqual(20);
      // The strong sway (frame 2) comes exactly once, with the gust.
      const total = timeline.reduce((sum, [, steps]) => sum + steps, 0);
      let left = 0;
      let strong = 0;
      let firstStrong = -1;
      for (const [frame, steps] of timeline) {
        if (frame === 2 && firstStrong < 0) firstStrong = left;
        if (frame === 2) strong += 1;
        left += steps;
      }
      expect(firstStrong, name).toBeGreaterThanOrEqual(GUST_AT - 60);
      expect(firstStrong, name).toBeLessThanOrEqual(GUST_AT + 80);
      expect(strong, name).toBeGreaterThanOrEqual(2);
      expect(total, name).toBe(CYCLE);
    }
  });

  it('loops its leaves, its bird, its hut and its cat over the same cycle', () => {
    for (const name of ['leaves', 'bird', 'hut', 'cat']) {
      expect(
        propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
    }
  });
});
