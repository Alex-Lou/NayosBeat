import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/dojo/colors';
import { STAGE_PROPS } from '../../src/art/dojo/props';
import { drawDojo } from '../../tools/stage/dojo';
import { CYCLE, SWELL_AT } from '../../tools/stage/dojo/mid';
import { PALETTE } from '../../tools/stage/dojo/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

describe("the code's Dojo (docs/art/decor-dojo.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'dojo', drawn: drawDojo(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a sheltered night: clear, then the rain on the screens', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['midnight-clear', 'midnight-rain']);
    const map = STAGE_MAPS.find(({ name }) => name === 'dojo');
    expect(map?.sheltered).toBe(true);
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
    // Its rain is its own: drawn on the screens, the render's curtain never falls here.
    expect(propNamed('rain').weather).toBe('rain');
  });

  it('passes its wave of light once a cycle, around SWELL_AT, each state held long', () => {
    const timeline = propNamed('swell').timeline;
    expect(timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
    expect(Math.min(...timeline.map(([, steps]) => steps))).toBeGreaterThanOrEqual(40);
    const total = timeline.reduce((sum, [, steps]) => sum + steps, 0);
    let left = 0;
    let lit = -1;
    for (const [frame, steps] of timeline) {
      if (frame === 3 && lit < 0) lit = left;
      left += steps;
    }
    expect(lit).toBeGreaterThanOrEqual(SWELL_AT);
    expect(lit).toBeLessThanOrEqual(SWELL_AT + 160);
    expect(total).toBe(CYCLE);
  });

  it('never blinks: its scroll and its tassel hold every state 20 steps at least', () => {
    for (const name of ['scroll', 'tassel', 'rain']) {
      const timeline = propNamed(name).timeline;
      expect(
        timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
      expect(Math.min(...timeline.map(([, steps]) => steps)), name).toBeGreaterThanOrEqual(20);
    }
  });
});
