import { describe, expect, it } from 'vitest';
import { absorbs, applyArmored } from '../../src/core/combat';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import { FLAG_ARMOR_SPENT, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, makeFighter } from './helpers';

/**
 * The super-armor (docs/watt-arsenal.md §3.1): within its frames, a move absorbs one strike or
 * projectile, at half its damage, and goes on. Nobody has one yet: Nayo's H with an armor
 * stands in for Watt's Pas blindé.
 */

const { Light, Heavy } = Input;

const ARMORED: FighterTemplate = {
  ...NAYO,
  moves: { ...NAYO.moves, standHeavy: { ...NAYO.moves.standHeavy, armor: { from: 0, to: 12 } } },
};
const MATCH: MatchConfig = { stage: TRAINING_STAGE, fighters: [ARMORED, NAYO] };
const JAB = NAYO.moves.standLight;

/** `ticks` ticks of both players' inputs, one pair per tick. */
function play(state: GameState, ticks: readonly (readonly [number, number])[]): GameState[] {
  const states: GameState[] = [];
  let current = state;
  for (const inputs of ticks) {
    current = step(current, inputs, MATCH);
    states.push(current);
  }
  return states;
}

describe('the super-armor (watt-arsenal §3.1)', () => {
  const heavy = makeFighter({ action: 'attack', move: 'standHeavy', actionFrame: 5 });

  it('absorbs within its frames only, once a move', () => {
    expect(absorbs(heavy, ARMORED, JAB, 0)).toBe(true);
    expect(absorbs({ ...heavy, actionFrame: 12 }, ARMORED, JAB, 0)).toBe(false);
    expect(absorbs({ ...heavy, flags: FLAG_ARMOR_SPENT }, ARMORED, JAB, 0)).toBe(false);
    // Without an armor, nothing changes.
    expect(absorbs(heavy, NAYO, JAB, 0)).toBe(false);
    expect(absorbs(makeFighter(), ARMORED, JAB, 0)).toBe(false);
  });

  it('is checked: within the move, never on a throw', () => {
    expect(validateTemplate(ARMORED)).toEqual([]);
    const late = { ...NAYO.moves.standHeavy, armor: { from: 0, to: 999 } };
    expect(validateTemplate({ ...NAYO, moves: { ...NAYO.moves, standHeavy: late } })).not.toEqual(
      [],
    );
    const pummel = { ...NAYO.moves.pummel, armor: { from: 0, to: 2 } };
    expect(validateTemplate({ ...NAYO, moves: { ...NAYO.moves, pummel } })).not.toEqual([]);
  });

  it('never absorbs a grab nor a Boost move', () => {
    expect(absorbs(heavy, ARMORED, NAYO.moves.grab, 0)).toBe(false);
    expect(absorbs(heavy, ARMORED, JAB, 2)).toBe(false);
    expect(absorbs(heavy, ARMORED, JAB, 3)).toBe(false);
  });

  it('takes half the damage, no stun, and spends the armor for the rest of the move', () => {
    const armored = applyArmored(heavy, { ...JAB, damage: 31 });
    expect(armored.health).toBe(heavy.health - 15);
    expect(armored).toMatchObject({ action: 'attack', move: 'standHeavy', actionFrame: 5 });
    expect(armored.stunFrames).toBe(0);
    expect(armored.flags & FLAG_ARMOR_SPENT).toBe(FLAG_ARMOR_SPENT);
    expect(applyArmored(heavy, { ...JAB, damage: 2000 }, 1).health).toBe(1);
  });

  it('in a fight: the H goes on through a jab, and lands', () => {
    // Player 1 presses H, player 2 jabs on the same tick: the jab lands first.
    const states = play(facingOff(40, MATCH), [
      [Heavy, Light],
      ...Array.from({ length: 30 }, () => [0, 0] as const),
    ]);
    const absorbed = states.findIndex((s) => s.contacts.some((c) => c.kind === 'armor'));
    expect(absorbed).toBeGreaterThan(-1);
    const at = states[absorbed];
    if (!at) throw new Error('No armor contact');
    expect(at.fighters[0].health).toBe(NAYO.maxHealth - Math.trunc(JAB.damage / 2));
    expect(at.fighters[0]).toMatchObject({ action: 'attack', move: 'standHeavy' });
    // Its H lands on the jabber afterwards.
    const last = states[states.length - 1];
    expect(last?.fighters[1].health).toBeLessThan(NAYO.maxHealth);
    // Nayo without the armor is beaten by the same jab.
    const plain = (s: GameState): GameState =>
      step(s, [Heavy, Light], { ...MATCH, fighters: [NAYO, NAYO] });
    let state = plain(facingOff(40, MATCH));
    for (let i = 0; i < 10; i++) state = step(state, [0, 0], { ...MATCH, fighters: [NAYO, NAYO] });
    expect(state.fighters[0].action).not.toBe('attack');
  });
});
