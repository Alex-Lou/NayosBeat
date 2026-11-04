import { describe, expect, it } from 'vitest';
import { STAGE_MAPS } from '../../src/art/stages';
import { STAGE_COLORS } from '../../src/art/lucioles/colors';
import { STAGE_PROPS } from '../../src/art/lucioles/props';
import { drawLucioles } from '../../tools/stage/lucioles';
import { CYCLE, SWARM_AT } from '../../tools/stage/lucioles/mid';
import { PALETTE } from '../../tools/stage/lucioles/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

describe(
  "the code's Firefly Forest (docs/art/decor-firefly-forest.md)",
  { timeout: 60_000 },
  () => {
    stageContract({
      name: 'lucioles',
      drawn: drawLucioles(),
      palette: PALETTE,
      colors: STAGE_COLORS,
    });

    it('is a night only: clear, rain, fog, the night first', () => {
      expect(Object.keys(STAGE_COLORS)).toEqual([
        'midnight-clear',
        'midnight-rain',
        'midnight-fog',
      ]);
      const map = STAGE_MAPS.find(({ name }) => name === 'lucioles');
      expect(map?.sheltered).toBe(false);
      expect(map?.variants[0]?.atmosphere).toEqual({ moment: 'midnight', weather: 'clear' });
    });

    it('sweeps its swarm of fireflies once a cycle, centered on SWARM_AT', () => {
      expect(propNamed('swarm').timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(CYCLE);
      const drift = propNamed('swarm').drift;
      expect(drift).toBeDefined();
      expect(drift && drift.start <= SWARM_AT && drift.start + drift.steps >= SWARM_AT).toBe(true);
      expect(drift && drift.start + drift.steps / 2).toBe(SWARM_AT);
    });

    it('never blinks: every living state held 20 steps at least', () => {
      for (const name of ['fireflies', 'glow', 'glow1', 'vines']) {
        const timeline = propNamed(name).timeline;
        expect(
          timeline.reduce((sum, [, steps]) => sum + steps, 0),
          name,
        ).toBe(CYCLE);
        expect(Math.min(...timeline.map(([, steps]) => steps)), name).toBeGreaterThanOrEqual(20);
      }
    });
  },
);
