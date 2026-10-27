import { describe, expect, it } from 'vitest';
import { applyHit, canBeHit } from '../../src/core/combat';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { moveOf } from '../../src/core/moves';
import { chipDamage, isCounterHit, scaledDamage } from '../../src/core/damage';
import { Input, type InputBits } from '../../src/core/input';
import { COUNTER_HITSTOP, COUNTER_HITSTUN } from '../../src/core/rules';
import type { Contact, GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo } from './combo-helpers';
import { expectMirrored, facingOff, makeFighter, MIRROR_MATCH, repeat } from './helpers';
import { play } from './hold-helpers';

/**
 * CONTRE and PUNITION (docs/combat-v2.md §7.4), the chip (§7.5) and the juggle (§7.6), on the
 * real engine, and the one damage formula they share (§7.7).
 */

const { Light, Heavy, Special, Down, Left, Right, Dash } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

function exchange(
  distancePx: number,
  nayo: (tick: number) => InputBits,
  riff: (tick: number) => InputBits,
  config: MatchConfig = NAYO_VS_RIFF,
  ticks = 80,
): GameState[] {
  return play(facingOff(distancePx, config), ticks, (t) => [nayo(t), riff(t)], config);
}

const once = (tick: number, input: InputBits) => (t: number) => (t === tick ? input : 0);

function firstContact(states: readonly GameState[], by: 0 | 1): [Contact, GameState] {
  for (const state of states) {
    const contact = state.contacts.find((c) => c.by === by);
    if (contact) return [contact, state];
  }
  throw new Error(`Player ${by + 1} touched nothing`);
}

describe('isCounterHit', () => {
  const attacking = (move: 'standHeavy' | 'dashForward' | 'grab', actionFrame: number) =>
    makeFighter({ action: 'attack', move, actionFrame });

  it('is a CONTRE while the move starts up or is out, a PUNITION once it recovers', () => {
    const { startup, active } = NAYO.moves.standHeavy;
    expect(isCounterHit(attacking('standHeavy', 0), NAYO)).toBe('counter');
    expect(isCounterHit(attacking('standHeavy', startup + active - 1), NAYO)).toBe('counter');
    expect(isCounterHit(attacking('standHeavy', startup + active), NAYO)).toBe('punish');
    expect(isCounterHit(attacking('grab', 10), NAYO)).toBe('punish');
  });

  it('is nothing on a dash, a guard, a fighter in hitstun', () => {
    expect(isCounterHit(attacking('dashForward', 3), NAYO)).toBeNull();
    expect(isCounterHit(makeFighter({ action: 'guard' }), NAYO)).toBeNull();
    expect(isCounterHit(makeFighter({ action: 'hitstun' }), NAYO)).toBeNull();
  });
});

describe('CONTRE (§7.4)', () => {
  // Riff starts her elbow; Nayo's jab lands in its startup.
  const states = exchange(40, once(0, Light), once(1, Heavy));
  const [contact, hit] = firstContact(states, 0);

  it('hurts 20 % more, stuns 4 ticks longer and freezes 3 ticks longer', () => {
    const jab = NAYO.moves.standLight;
    expect(contact).toMatchObject({ move: 'standLight', kind: 'hit', counter: 'counter' });
    expect(contact.damage).toBe(Math.trunc((jab.damage * 120) / 100));
    expect(hit.fighters[1].stunFrames).toBe(jab.hitstun + COUNTER_HITSTUN);
    expect(hit.hitstop).toBe(jab.hitstop + COUNTER_HITSTOP);
  });

  it('counts on the first hit of a combo only', () => {
    const start = facingOff(40, NAYO_VS_RIFF);
    const riff = once(1, Heavy);
    const result = playCombo(start, NAYO_VS_RIFF, [Light, Light, Light], riff);
    expect(result.hits.map((h) => h.counter)).toEqual(['counter', null, null]);
    expect(result.hits.map((h) => h.damage)).toEqual([
      scaledDamage(30, 1, true),
      scaledDamage(40, 2),
      scaledDamage(50, 3),
    ]);
  });

  it('is not given on a fighter caught dashing', () => {
    const dashing = exchange(120, () => 0, once(0, Dash), MIRROR_MATCH);
    expect(dashing.some((s) => s.contacts.length > 0)).toBe(false);
    const caught = exchange(90, once(4, Down | Heavy), once(0, Dash));
    expect(firstContact(caught, 0)[0].counter).toBeNull();
  });

  it('is never on a blocked blow', () => {
    // Riff's jab is out when Nayo's lands, but she blocks nothing: Nayo's own blow is blocked.
    const blocked = exchange(40, once(0, Light), () => Right);
    expect(firstContact(blocked, 0)[0]).toMatchObject({ kind: 'block', counter: null });
  });

  it('plays the same on both sides', () => {
    const script = repeat<readonly [number, number]>([0, 0], 40).map(
      (_, t) => [t === 0 ? Light : 0, t === 1 ? Heavy : 0] as const,
    );
    const states = expectMirrored(script, MIRROR_MATCH, 40);
    expect(states.some((s) => s.contacts.some((c) => c.counter === 'counter'))).toBe(true);
  });
});

describe('PUNITION (§7.4)', () => {
  it('is a blow on a fighter recovering from a whiffed move, with the bonus of a CONTRE', () => {
    // Riff whiffs her elbow from afar; Nayo's Pied fendu catches its recovery.
    const states = exchange(70, once(4, Right | Special), once(0, Heavy));
    const [contact] = firstContact(states, 0);
    expect(contact).toMatchObject({ move: 'specialForward', counter: 'punish' });
    expect(contact.damage).toBe(scaledDamage(NAYO.moves.specialForward.damage, 1, true));
  });
});

describe('chip (§7.5)', () => {
  it('takes 15 % of a special blocked, nothing of a normal', () => {
    expect(chipDamage(NAYO.moves.specialForward)).toBe(11);
    expect(chipDamage(NAYO.moves.special)).toBe(9);
    expect(chipDamage(RIFF.moves.specialAntiAir)).toBe(14);
    expect(chipDamage(NAYO.moves.standHeavy)).toBe(0);
    const blocked = exchange(50, once(0, Right | Special), () => Right);
    expect(firstContact(blocked, 0)[0]).toMatchObject({ kind: 'block', damage: 11 });
  });

  it('never takes the last point', () => {
    const guard = makeFighter({ health: 5, input: Right, facing: -1, x: px(500) });
    const chipped = applyHit(guard, px(400), NAYO.moves.special);
    expect(chipped).toMatchObject({ action: 'blockstun', health: 1 });
    expect(applyHit({ ...guard, health: 1 }, px(400), NAYO.moves.special).health).toBe(1);
  });
});

describe('the juggle (§7.6)', () => {
  it('lets one blow hit a fighter launched by a launcher, and one only', () => {
    const sent = applyHit(makeFighter({ health: 900 }), px(370), moveOf(NAYO, 'backHeavy'));
    expect(sent).toMatchObject({ action: 'airHit', juggle: 1, reaction: 'launch' });
    // A moment later, in the air.
    const launched = { ...sent, y: px(20) };
    expect(canBeHit(launched, RIFF)).toBe(true);
    const juggled = applyHit(launched, px(370), NAYO.moves.standLight);
    expect(juggled).toMatchObject({ action: 'airHit', juggle: 0, comboCount: 2 });
    expect(canBeHit(juggled, RIFF)).toBe(false);
    // A second launcher on a juggled fighter launches again, without a new juggle.
    expect(applyHit(launched, px(370), moveOf(NAYO, 'backHeavy')).juggle).toBe(0);
  });

  it('is not given by any other blow in the air', () => {
    const jumping = makeFighter({ action: 'air', y: px(40), health: 900 });
    const hit = applyHit(jumping, px(370), NAYO.moves.standHeavy);
    expect(hit).toMatchObject({ action: 'airHit', juggle: 0 });
    expect(canBeHit(hit, RIFF)).toBe(false);
  });

  it('ends on the ground: the juggle is gone when the fighter lands', () => {
    const result = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, [Left | Heavy]);
    const down = result.states.find((s) => s.fighters[1].action === 'knockdown');
    expect(down?.fighters[1].juggle).toBe(0);
    expect(result.hits).toHaveLength(1);
  });

  it('takes the launcher and its follow-up, and nothing more', () => {
    // ←H, the Uppercut, then a jab as soon as he can: she is out of reach, falling then down.
    const steps = [Left | Heavy, Down | Special, Light];
    const result = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, steps);
    expect(result.hits.map((h) => h.move)).toEqual(['backHeavy', 'specialAntiAir']);
  });
});
