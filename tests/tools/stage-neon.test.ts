import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/neon/colors';
import { STAGE_PROPS } from '../../src/art/neon/props';
import { drawNeon } from '../../tools/stage/neon';
import { CAR_AT, CYCLE } from '../../tools/stage/neon/mid';
import { PALETTE } from '../../tools/stage/neon/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

describe("the code's Neon Dusk (docs/art/decor-neon-dusk.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'neon', drawn: drawNeon(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a night only: clear, rain, fog, the night first', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear', 'midnight-rain', 'midnight-fog']);
    const map = STAGE_MAPS.find(({ name }) => name === 'neon');
    expect(map?.sheltered).toBe(false);
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
  });

  it('flies its low car through the street once a cycle, centered on CAR_AT', () => {
    expect(propNamed('car0').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
    const drift = propNamed('car0').drift;
    expect(drift).toBeDefined();
    expect(drift && drift.start <= CAR_AT && drift.start + drift.steps >= CAR_AT).toBe(true);
    expect(drift && drift.start + drift.steps / 2).toBe(CAR_AT);
    // The high car glides the whole cycle, away from the low one's pass.
    const high = propNamed('car1').drift;
    expect(high && high.start + high.steps).toBe(CYCLE);
  });

  it('never blinks: its neon holds every state 20 steps at least', () => {
    expect(
      Math.min(...propNamed('neon').timeline.map(([, steps]) => steps)),
    ).toBeGreaterThanOrEqual(20);
  });

  it('loops every living detail over the same cycle', () => {
    for (const name of ['steam', 'walker', 'cat', 'neon']) {
      expect(
        propNamed(name).timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
    }
  });
});
