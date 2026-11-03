import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff } from './helpers';

/**
 * The cable (docs/watt-arsenal.md §4.2): a long strike that reels the opponent in, 34 px in
 * front of the attacker, on hit only. Nobody has one yet: Nayo with Watt's ← + S stands in for
 * him.
 */

const { Left, Right, Special } = Input;

const PULL = px(34);
const CABLE: FighterTemplate = {
  ...NAYO,
  moves: {
    ...NAYO.moves,
    specialBack: {
      name: 'Câble',
      kind: 'special',
      startup: 14,
      active: 4,
      recovery: 28,
      damage: 40,
      hitstun: 20,
      blockstun: 10,
      hitstop: 9,
      pushback: px(2),
      guard: 'mid',
      hitbox: { x: px(30), y: px(30), width: px(80), height: px(12) },
      pull: PULL,
    },
  },
};
const MATCH: MatchConfig = { stage: TRAINING_STAGE, fighters: [CABLE, NAYO] };

function play(state: GameState, ticks: readonly (readonly [number, number])[]): GameState[] {
  const states: GameState[] = [];
  let current = state;
  for (const inputs of ticks) {
    current = step(current, inputs, MATCH);
    states.push(current);
  }
  return states;
}

/** The first state where player 1's cable touched, and how. */
function touched(states: readonly GameState[]): GameState | undefined {
  return states.find((s) => s.contacts.some((c) => c.move === 'specialBack'));
}

describe('the cable (watt-arsenal §4.2)', () => {
  it('reels the opponent in, 34 px in front, on hit', () => {
    const states = play(facingOff(90, MATCH), [
      [Left | Special, 0],
      ...Array.from({ length: 24 }, () => [0, 0] as const),
    ]);
    const at = touched(states);
    expect(at?.contacts).toMatchObject([{ kind: 'hit', move: 'specialBack' }]);
    if (!at) throw new Error('The cable missed');
    expect(at.fighters[1].x - at.fighters[0].x).toBe(PULL);
    expect(at.fighters[1].action).toBe('hitstun');
  });

  it('blocked, leaves the opponent where it was', () => {
    // Player 2 holds back (right, facing left) and blocks.
    const states = play(facingOff(90, MATCH), [
      [Left | Special, Right],
      ...Array.from({ length: 24 }, () => [0, Right] as const),
    ]);
    const at = touched(states);
    expect(at?.contacts).toMatchObject([{ kind: 'block' }]);
    expect((at?.fighters[1].x ?? 0) - (at?.fighters[0].x ?? 0)).toBeGreaterThan(PULL);
  });

  it('loses to a projectile thrown first: the Vinyle hits during its startup', () => {
    // The Vinyle (12 ticks, then 3.5 px a tick) reaches him about 31 ticks after it is thrown;
    // the cable, pressed 20 ticks after, would only strike 14 ticks later.
    const states = play(facingOff(90, MATCH), [
      [0, Special],
      ...Array.from({ length: 19 }, () => [0, 0] as const),
      [Left | Special, 0],
      ...Array.from({ length: 30 }, () => [0, 0] as const),
    ]);
    expect(touched(states)).toBeUndefined();
    expect(states[states.length - 1]?.fighters[0].health).toBeLessThan(NAYO.maxHealth);
  });

  it('is checked: only a strike reels in', () => {
    expect(validateTemplate(CABLE)).toEqual([]);
    const grab = { ...NAYO.moves.grab, pull: PULL };
    expect(validateTemplate({ ...NAYO, moves: { ...NAYO.moves, grab } })).not.toEqual([]);
  });
});
