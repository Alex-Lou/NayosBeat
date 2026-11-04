import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/dunes/colors';
import { STAGE_PROPS } from '../../src/art/dunes/props';
import { drawDunes } from '../../tools/stage/dunes';
import { CYCLE, GUST_AT } from '../../tools/stage/dunes/mid';
import { PALETTE } from '../../tools/stage/dunes/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

describe("the code's Dune Dusk (docs/art/decor-dune-dusk.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'dunes', drawn: drawDunes(), palette: PALETTE, colors: STAGE_COLORS });

  it('is a dusk only: clear, rain, fog, the dusk first', () => {
    expect(Object.keys(STAGE_COLORS)).toEqual(['dusk-clear', 'dusk-rain', 'dusk-fog']);
    const map = STAGE_MAPS.find(({ name }) => name === 'dunes');
    expect(map?.sheltered).toBe(false);
    expect(map?.ground).toBe('sand');
    expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'dusk', weather: 'clear' });
  });

  it('sweeps its gust of sand once a cycle, centered on GUST_AT', () => {
    expect(propNamed('gust').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
    const drift = propNamed('gust').drift;
    expect(drift).toBeDefined();
    expect(drift && drift.start <= GUST_AT && drift.start + drift.steps >= GUST_AT).toBe(true);
    expect(drift && drift.start + drift.steps / 2).toBe(GUST_AT);
  });

  it('streams its sand faster as the gust sweeps, every state held 20 steps at least', () => {
    for (const name of ['sand0', 'sand1']) {
      const timeline = propNamed(name).timeline;
      expect(
        timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(CYCLE);
      expect(Math.min(...timeline.map(([, steps]) => steps)), name).toBeGreaterThanOrEqual(20);
    }
  });

  it('loops its beetle over the same cycle', () => {
    expect(propNamed('beetle').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
  });
});
