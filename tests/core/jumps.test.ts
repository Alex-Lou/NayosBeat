import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import type { FighterState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { makeFighter, playAlone as play, repeat, stepsOf as steps } from './helpers';

const { Up, Left, Right } = Input;

describe('walk (§3.1)', () => {
  it.each([
    [NAYO, 1.5, 1.2],
    [RIFF, 1.9, 1.4],
  ] as const)('%s walks at the v2 speeds', (template, forward, back) => {
    expect(steps(play(template, repeat(Right, 10)))).toEqual(repeat(px(forward), 10));
    expect(steps(play(template, repeat(Left, 10)))).toEqual(repeat(-px(back), 10));
  });
});

describe('jumps (§3.1)', () => {
  /** A jump from neutral, until the landing ends: the states of every tick. */
  function jump(template: FighterTemplate, direction: InputBits = 0): FighterState[] {
    // The direction is read at take-off, once the pre-jump is over.
    const held = repeat(Up | direction, template.preJumpFrames + 1);
    return play(template, [...held, ...repeat(0, 60)]);
  }

  it.each([
    { template: NAYO, preJump: 4, air: 31, apex: 79.6, above48: 20, landing: 3 },
    { template: RIFF, preJump: 3, air: 27, apex: 66.5, above48: 15, landing: 2 },
  ])(
    '$template.name: $preJump ticks of pre-jump, $air in the air, $apex px high, $landing of landing',
    ({ template, preJump, air, apex, above48, landing }) => {
      const states = jump(template);
      const actions = states.map((state) => state.action);
      expect(actions.filter((action) => action === 'preJump')).toHaveLength(preJump);
      expect(states.filter((state) => state.y > 0)).toHaveLength(air);
      // The landing comes on the next air tick.
      expect(actions.indexOf('landing')).toBe(preJump + air);
      expect(actions.filter((action) => action === 'landing')).toHaveLength(landing);
      expect(Math.max(...states.map((state) => state.y))).toBe(px(apex));
      // Long enough over the Vinyle (its top at 52 px is cleared by feet above 48).
      expect(states.filter((state) => state.y > px(48))).toHaveLength(above48);
    },
  );

  it.each([
    { template: NAYO, forward: 70.4, back: 60.8 },
    { template: RIFF, forward: 72.8, back: 58.8 },
  ])('$template.name jumps $forward px forward, $back px back', ({ template, forward, back }) => {
    const start = makeFighter().x;
    expect((jump(template, Right).at(-1)?.x ?? 0) - start).toBe(px(forward));
    expect((jump(template, Left).at(-1)?.x ?? 0) - start).toBe(-px(back));
  });

  it('sends everyone flying with the same gravity: the knockdown depends on the blow only', () => {
    // A lift of 3 px/tick lands on tick 11 whatever the victim's own jump (L = 4V - 1).
    for (const template of [NAYO, RIFF]) {
      const hit = makeFighter({ action: 'airHit', y: 0, vy: px(3) });
      const states = play(template, repeat(0, 20), hit);
      expect(states.findIndex((state) => state.action === 'knockdown') + 1).toBe(11);
    }
  });
});
