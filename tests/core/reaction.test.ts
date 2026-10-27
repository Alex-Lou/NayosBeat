import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { moveOf } from '../../src/core/moves';
import { Input, type InputBits } from '../../src/core/input';
import { impactPercent, reactionOf } from '../../src/core/reaction';
import type { FighterState, GameState, Reaction } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo } from './combo-helpers';
import { facingOff, makeFighter } from './helpers';

/**
 * How a blow shakes the defender (docs/combat-v2.md §9.4): read from the height of the impact
 * on its body, its posture and how the blow sends it, with how long the stun lasts.
 */

const { Light, Heavy, Special, Grab, Down, Right } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

describe('reactionOf', () => {
  const standing = makeFighter();
  const { standLight, crouchLight, crouchHeavy, specialForward } = NAYO.moves;
  const backHeavy = moveOf(NAYO, 'backHeavy');

  it('reads the height of the impact on the standing body', () => {
    expect(reactionOf(standing, standLight, false, 61)).toBe('high');
    expect(reactionOf(standing, standLight, false, 60)).toBe('mid');
    expect(reactionOf(standing, standLight, false, 34)).toBe('mid');
    expect(reactionOf(standing, standLight, false, 33)).toBe('low');
    // A low blow takes a leg wherever it lands.
    expect(reactionOf(standing, crouchLight, false, 50)).toBe('low');
  });

  it('crouching, swept, sent flying', () => {
    expect(reactionOf(makeFighter({ crouching: true }), standLight, false, 70)).toBe('crouch');
    expect(reactionOf(standing, crouchHeavy, true, 5)).toBe('trip');
    expect(reactionOf(standing, specialForward, true, 40)).toBe('launch');
    expect(reactionOf(standing, backHeavy, true, 80)).toBe('launch');
  });

  it('measures heights against the tallest standing hurtbox', () => {
    expect(impactPercent(px(38), RIFF)).toBe(50);
    expect(impactPercent(0, NAYO)).toBe(0);
  });
});

/** The defender of the first blow `steps` land, from `distancePx`, `defender` held. */
function struck(
  steps: readonly InputBits[],
  distancePx = 36,
  defender: InputBits = 0,
): { fighter: FighterState; state: GameState } {
  const result = playCombo(
    facingOff(distancePx, NAYO_VS_RIFF),
    NAYO_VS_RIFF,
    steps,
    () => defender,
  );
  const first = result.hits[0];
  const state = result.states.find((s) => first && s.contacts.includes(first));
  if (!state) throw new Error('Nothing hit');
  return { fighter: state.fighters[1], state };
}

describe('the reaction of a blow, in a fight', () => {
  const cases: readonly [string, readonly InputBits[], InputBits, Reaction][] = [
    ['the Direct takes the head', [Light], 0, 'high'],
    ['the Coup bas a leg', [Down | Light], 0, 'low'],
    ['the Direct a crouching fighter', [Light], Down, 'crouch'],
    ['the Balayage sweeps', [Down | Heavy], 0, 'trip'],
    ['the Pied fendu sends flying', [Right | Special], 0, 'launch'],
  ];
  for (const [label, steps, defender, reaction] of cases) {
    it(label, () => {
      expect(struck(steps, 36, defender).fighter.reaction).toBe(reaction);
    });
  }

  it('the Vinyle lands on the body', () => {
    expect(struck([Special], 100).fighter.reaction).toBe('mid');
  });

  it('a throw', () => {
    const result = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, [Grab, Heavy]);
    expect(result.states.some((s) => s.fighters[1].reaction === 'thrown')).toBe(true);
  });

  it('a long stun plays the whole reaction, its length kept for the animation', () => {
    const jab = struck([Light]).fighter;
    expect(jab).toMatchObject({ reactionHeavy: false, stunTotal: NAYO.moves.standLight.hitstun });
    const hook = struck([Heavy]).fighter;
    expect(hook).toMatchObject({ reactionHeavy: true, stunTotal: NAYO.moves.standHeavy.hitstun });
  });

  it('a block has no reaction, its stun kept', () => {
    const result = playCombo(facingOff(36, NAYO_VS_RIFF), NAYO_VS_RIFF, [Light], () => Right);
    const blocked = result.states.find((s) => s.fighters[1].action === 'blockstun');
    expect(blocked?.fighters[1]).toMatchObject({
      reaction: null,
      stunTotal: NAYO.moves.standLight.blockstun,
    });
  });
});
