import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import type { Contact } from '../../src/core/state';
import { step } from '../../src/core/step';
import { isCharged, tensioned } from '../../src/core/tension';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, makeFighter } from './helpers';

/**
 * The tension (docs/watt-arsenal.md §3.2): a fighter's own gauge, filled by catching,
 * absorbing and taking blows, emptied slowly. Nobody has one yet: Nayo with Watt's rules
 * stands in for him.
 */

const RULES = { max: 100, gains: { grab: 30, pummel: 5, armor: 20, hit: 10 }, decayEvery: 8 };
const TENSE: FighterTemplate = { ...NAYO, tension: RULES };
const MATCH: MatchConfig = { stage: TRAINING_STAGE, fighters: [TENSE, NAYO] };

function contact(by: 0 | 1, kind: Contact['kind']): Contact {
  return { by, kind, move: 'standLight', x: 0, y: 0, damage: 0, counter: null };
}

describe('the tension (watt-arsenal §3.2)', () => {
  const pair = [makeFighter(), makeFighter()] as const;
  /** Fighter 0's tension after `contacts` on frame 1 (no decay), from `start`. */
  const after = (contacts: readonly Contact[], start = 0, frame = 1): number =>
    tensioned([{ ...pair[0], tension: start }, pair[1]], contacts, frame, MATCH)[0].tension;

  it('fills as it catches, pummels, absorbs and takes blows', () => {
    expect(after([contact(0, 'grab')])).toBe(30);
    expect(after([contact(0, 'pummel')])).toBe(5);
    expect(after([contact(1, 'armor')])).toBe(20);
    expect(after([contact(1, 'hit')])).toBe(10);
    // What it lands or has blocked gives nothing: the gauge is the colossus's, not the striker's.
    expect(after([contact(0, 'hit'), contact(1, 'block'), contact(0, 'throw')])).toBe(0);
  });

  it('stops at its max, loses a point every 8 ticks without a gain, never below 0', () => {
    expect(after([contact(0, 'grab')], 90)).toBe(100);
    expect(after([], 40, 8)).toBe(39);
    expect(after([], 40, 9)).toBe(40);
    expect(after([contact(1, 'hit')], 40, 8)).toBe(50);
    expect(after([], 0, 8)).toBe(0);
  });

  it('stays at 0 for a fighter without one, and the pair is the same when nothing changes', () => {
    const [, other] = tensioned(pair, [contact(0, 'hit')], 1, MATCH);
    expect(other.tension).toBe(0);
    expect(tensioned(pair, [], 1, MATCH)).toBe(pair);
  });

  it('is charged once full', () => {
    expect(isCharged({ ...pair[0], tension: 100 }, TENSE)).toBe(true);
    expect(isCharged({ ...pair[0], tension: 99 }, TENSE)).toBe(false);
    expect(isCharged({ ...pair[0], tension: 100 }, NAYO)).toBe(false);
  });

  it('is checked', () => {
    expect(validateTemplate(TENSE)).toEqual([]);
    expect(validateTemplate({ ...NAYO, tension: { ...RULES, decayEvery: 0 } })).not.toEqual([]);
  });

  it('in a fight: a jab taken charges it', () => {
    let state = step(facingOff(40, MATCH), [0, Input.Light], MATCH);
    for (let i = 0; i < 10 && state.fighters[0].tension === 0; i++) {
      state = step(state, [0, 0], MATCH);
    }
    // On the tick the jab lands.
    expect(state.contacts.map(({ kind }) => kind)).toEqual(['hit']);
    expect(state.fighters[0].tension).toBe(RULES.gains.hit);
    expect(state.fighters[1].tension).toBe(0);
  });
});
