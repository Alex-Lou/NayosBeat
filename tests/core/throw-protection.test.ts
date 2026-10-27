import { describe, expect, it } from 'vitest';
import { findHit } from '../../src/core/combat';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import { THROW_PROTECTION_FRAMES } from '../../src/core/rules';
import type { FighterAction, FighterState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { facingOff, makeFighter, MIRROR_MATCH, repeat } from './helpers';

/** The grab of a fighter right in front, on its active frame. */
const GRABBER = makeFighter({ action: 'attack', move: 'grab', actionFrame: 3 });
const JAB = makeFighter({ action: 'attack', move: 'standLight', actionFrame: 4 });

/** A defender ending `action` (its last stun tick), then left alone: its state on each tick. */
function leaving(action: FighterAction, ticks: number): FighterState[] {
  let defender = makeFighter({ x: px(420), facing: -1, action, stunFrames: 0 });
  const states: FighterState[] = [];
  for (let i = 0; i < ticks; i++) {
    defender = updateFighter(defender, 0, NAYO, px(400));
    states.push(defender);
  }
  return states;
}

describe('throw protection (§3.8)', () => {
  it.each(['hitstun', 'blockstun', 'knockdown'] as const)(
    'makes grabs whiff for %s ticks out of %s',
    (action) => {
      const states = leaving(action, THROW_PROTECTION_FRAMES + 2);
      const grabbed = states.map((state) => findHit(GRABBER, NAYO, state, NAYO) !== null);
      expect(states[0]?.action).toBe('idle');
      expect(grabbed).toEqual([...repeat(false, THROW_PROTECTION_FRAMES), true, true]);
    },
  );

  it('lets strikes hit all along: a blow placed on the wake-up still works', () => {
    for (const state of leaving('knockdown', THROW_PROTECTION_FRAMES)) {
      expect(findHit(JAB, NAYO, state, NAYO)).not.toBeNull();
    }
  });

  it('follows a tech too (both grabbing on the same tick)', () => {
    let state = facingOff(30, MIRROR_MATCH);
    state = step(state, [Input.Grab, Input.Grab], MIRROR_MATCH);
    // Both pushed apart in a short stun, then a moment safe from a grab.
    for (let i = 0; i < 40 && state.fighters[0].action !== 'idle'; i++) {
      state = step(state, [0, 0], MIRROR_MATCH);
    }
    const [a, b] = state.fighters;
    expect(a.action).toBe('idle');
    expect(a.throwImmuneFrames).toBe(THROW_PROTECTION_FRAMES);
    expect(b.throwImmuneFrames).toBe(THROW_PROTECTION_FRAMES);
  });

  it('does not count down during hitstop', () => {
    let state = facingOff(200, MIRROR_MATCH, [{ throwImmuneFrames: 3 }, {}]);
    state = { ...state, hitstop: 5 };
    for (let i = 0; i < 5; i++) state = step(state, [0, 0], MIRROR_MATCH);
    expect(state.fighters[0].throwImmuneFrames).toBe(3);
    state = step(state, [0, 0], MIRROR_MATCH);
    expect(state.fighters[0].throwImmuneFrames).toBe(2);
  });
});
