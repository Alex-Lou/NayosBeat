import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import { EMPTY_CONTACTS, NO_PROJECTILES, type Contact, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO as P } from '../../src/data/fighters/nayo';
import { facingOff, fightState, MIRROR_MATCH, repeat } from './helpers';

const { Right, Light, Heavy, Special } = Input;

/** Plays scripted ticks and gathers every contact made along the way. */
function contactsOf(
  start: GameState,
  ticks: [number, number][],
  config: MatchConfig = MIRROR_MATCH,
): Contact[] {
  const contacts: Contact[] = [];
  let state = start;
  for (const inputs of ticks) {
    state = step(state, inputs, config);
    contacts.push(...state.contacts);
  }
  return contacts;
}

const idle = (ticks: number): [number, number][] => repeat<[number, number]>([0, 0], ticks);

describe('contacts', () => {
  it('share one empty list, and projectiles another, while nothing happens', () => {
    let state = fightState(MIRROR_MATCH);
    for (let i = 0; i < 10; i++) state = step(state, [Right, 0], MIRROR_MATCH);
    expect(state.contacts).toBe(EMPTY_CONTACTS);
    expect(state.projectiles).toBe(NO_PROJECTILES);
  });

  it('report a hit: who struck, with what, the damage, and the middle of the overlap', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const contacts = contactsOf(start, [[Light, 0], ...idle(20)]);
    expect(contacts).toHaveLength(1);
    // The jab (10 to 40 px in front, 46 to 58 px high) meets the body 13.5 px in front of a
    // fighter 30 px away (its hurtbox calibrated on the drawing, §9.2): 16.5 to 40 px.
    expect(contacts[0]).toEqual({
      by: 0,
      kind: 'hit',
      move: 'standLight',
      x: start.fighters[0].x + px(28.25),
      y: px(52),
      damage: P.moves.standLight.damage,
      counter: null,
    });
  });

  it('report a block, which deals no damage', () => {
    const contacts = contactsOf(facingOff(30, MIRROR_MATCH), [
      [Light, Right],
      ...repeat<[number, number]>([0, Right], 20),
    ]);
    expect(contacts).toEqual([expect.objectContaining({ by: 0, kind: 'block', damage: 0 })]);
  });

  it("place a projectile's contact on the projectile's box", () => {
    const contacts = contactsOf(facingOff(200, MIRROR_MATCH), [[Special, 0], ...idle(90)]);
    expect(contacts).toEqual([
      // The Vinyle's box spans 32 to 52 px high (§10.1).
      expect.objectContaining({ by: 0, kind: 'hit', move: 'special', y: px(42) }),
    ]);
  });

  it('report both blows of a trade', () => {
    const contacts = contactsOf(facingOff(30, MIRROR_MATCH), [[Light, Light], ...idle(20)]);
    expect(contacts.map((contact) => [contact.by, contact.kind])).toEqual([
      [1, 'hit'],
      [0, 'hit'],
    ]);
  });

  // Combat v2 (§4.1): a tech is a contact of its own, no longer a block.
  it('report a grab tech as a tech on both sides', () => {
    const both = Light | Heavy;
    const contacts = contactsOf(facingOff(30, MIRROR_MATCH), [[both, both], ...idle(20)]);
    expect(contacts).toHaveLength(2);
    for (const contact of contacts) {
      expect(contact).toMatchObject({ kind: 'tech', move: 'grab', damage: 0 });
    }
  });

  it('still report a hit on a training dummy at its 1 HP floor', () => {
    const training: MatchConfig = { ...MIRROR_MATCH, training: true };
    const start = facingOff(30, training, [{}, { health: 1 }]);
    const contacts = contactsOf(start, [[Light, 0], ...idle(20)], training);
    expect(contacts).toEqual([expect.objectContaining({ kind: 'hit', damage: 0 })]);
  });
});
