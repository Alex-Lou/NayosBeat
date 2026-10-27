import { describe, expect, it } from 'vitest';
import { canBeGrabbed, canBeHit } from '../../src/core/combat';
import type { MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { isActiveFrame } from '../../src/core/moves';
import type { Contact, GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, makeFighter } from './helpers';
import { play } from './hold-helpers';

/**
 * The moves of combat v2's phase 3 that change who wins an exchange (docs/combat-v2.md §5,
 * §6.4, §10): the Glissade under the Vinyle and losing to the Coup bas, the Saut de l'ange over
 * the Balayage and losing to the Uppercut, the Genou montant's invincibility against the air
 * only, the launchers that whiff on a crouching opponent, the overheads.
 */

const { Light, Heavy, Special, Down, Left, Right } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

/** Nayo (player 1) and Riff (player 2) `distancePx` apart, each pressing on given ticks. */
function exchange(
  distancePx: number,
  nayo: (tick: number) => InputBits,
  riff: (tick: number) => InputBits,
  ticks = 80,
): GameState[] {
  return play(facingOff(distancePx, NAYO_VS_RIFF), ticks, (t) => [nayo(t), riff(t)], NAYO_VS_RIFF);
}

/** Pressed on tick `at` (its direction held two ticks more), nothing otherwise. */
function at(tick: number, input: InputBits): (t: number) => InputBits {
  return (t) =>
    t === tick ? input : t > tick && t <= tick + 2 ? input & ~(Light | Heavy | Special) : 0;
}

/** Every contact `by` made over the states. */
function contactsBy(states: readonly GameState[], by: 0 | 1): Contact[] {
  return states.flatMap((state) => state.contacts.filter((contact) => contact.by === by));
}

describe('Glissade (§5.5)', () => {
  it('slides under the Vinyle, then sweeps Nayo, caught recovering', () => {
    const states = exchange(110, at(0, Special), at(12, Special));
    expect(states.some((state) => state.projectiles.length > 0)).toBe(true);
    expect(contactsBy(states, 0)).toEqual([]);
    const [sweep] = contactsBy(states, 1);
    expect(sweep).toMatchObject({ move: 'special', kind: 'hit', counter: 'punish' });
    expect(states.some((state) => state.fighters[0].reaction === 'trip')).toBe(true);
  });

  it('is hit by the same Vinyle when she stands still', () => {
    const states = exchange(110, at(0, Special), () => 0);
    expect(contactsBy(states, 0).map((contact) => contact.move)).toEqual(['special']);
  });

  it('loses to the Coup bas, which hits her along the floor', () => {
    const states = exchange(80, at(4, Down | Light), at(0, Special));
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'crouchLight', counter: 'counter' }]);
    expect(contactsBy(states, 1)).toEqual([]);
  });

  it('is a low: blocked crouching, not standing', () => {
    const crouching = exchange(60, () => Left | Down, at(0, Special));
    expect(contactsBy(crouching, 1)).toMatchObject([{ kind: 'block' }]);
    const standing = exchange(60, () => Left, at(0, Special));
    expect(contactsBy(standing, 1)).toMatchObject([{ kind: 'hit' }]);
  });
});

describe("Saut de l'ange (§5.5)", () => {
  const leap = at(0, Left | Special);

  it('leaves the ground on frames 3 to 19, 34 px high at frame 11', () => {
    const states = exchange(200, () => 0, leap);
    const heights = states.slice(0, 34).map((state) => toPx(state.fighters[1].y));
    expect(heights.slice(0, 3)).toEqual([0, 0, 0]);
    expect(heights[11]).toBe(34);
    expect(heights.slice(3, 20).every((height) => height > 0)).toBe(true);
    expect(heights[20]).toBe(0);
  });

  it('goes over the Balayage, then lands on Nayo recovering', () => {
    const states = exchange(60, at(4, Down | Heavy), leap);
    expect(contactsBy(states, 0)).toEqual([]);
    // While the sweep could hit, she flies above its box (14 px high).
    const sweeping = states.filter((state) => {
      const nayo = state.fighters[0];
      return nayo.move === 'crouchHeavy' && isActiveFrame(NAYO.moves.crouchHeavy, nayo.actionFrame);
    });
    expect(sweeping.length).toBeGreaterThan(0);
    for (const state of sweeping) expect(toPx(state.fighters[1].y)).toBeGreaterThan(14);
    expect(contactsBy(states, 1)).toMatchObject([{ move: 'specialForward', kind: 'hit' }]);
  });

  it('loses to the Uppercut, which brings her down', () => {
    const states = exchange(50, at(8, Down | Special), leap);
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'specialAntiAir', counter: 'counter' }]);
    expect(contactsBy(states, 1)).toEqual([]);
  });

  it('keeps her body against a crouching guard: pushes it, never sinks in then pops out', () => {
    const motion = RIFF.moves.specialForward.motion;
    if (!motion) throw new Error("The Saut de l'ange must move");
    const stride = Math.max(...motion.dx.map(Math.abs));
    for (const distance of [28, 35, 45, 50]) {
      const states = exchange(distance, () => Left | Down, leap, 40);
      const impact = states.findIndex((state) => state.contacts.some((c) => c.by === 1));
      // The overhead still lands on its first active frame.
      expect(states[impact]?.fighters[1].actionFrame, `${distance} px`).toBe(16);
      const gaps = states.slice(0, impact + 1).map((s) => s.fighters[1].x - s.fighters[0].x);
      const jumps = gaps.slice(1).map((gap, tick) => Math.abs(gap - (gaps[tick] ?? gap)));
      expect(Math.max(...jumps), `${distance} px`).toBeLessThanOrEqual(stride);
    }
  });

  it('cannot be grabbed while in the air', () => {
    const states = exchange(200, () => 0, leap);
    states.slice(3, 20).forEach((state, frame) => {
      expect(canBeGrabbed(state.fighters[1], RIFF), `frame ${frame + 3}`).toBe(false);
    });
  });

  it('is an overhead: blocked standing, not crouching', () => {
    const crouching = exchange(50, () => Left | Down, leap);
    expect(contactsBy(crouching, 1)).toMatchObject([{ kind: 'hit' }]);
    const standing = exchange(50, () => Left, leap);
    expect(contactsBy(standing, 1)).toMatchObject([{ kind: 'block' }]);
  });
});

describe('Genou montant (§5.5)', () => {
  const knee = makeFighter({ action: 'attack', move: 'specialAntiAir', health: 900 });

  it('is invincible to attacks from the air on frames 0 to 5, not to blows on the ground', () => {
    for (let frame = 0; frame < 6; frame++) {
      const starting = { ...knee, actionFrame: frame };
      expect(canBeHit(starting, RIFF, true), `f${frame} from the air`).toBe(false);
      expect(canBeHit(starting, RIFF, false), `f${frame} on the ground`).toBe(true);
    }
    expect(canBeHit({ ...knee, actionFrame: 6 }, RIFF, true)).toBe(true);
  });

  it('loses to a jab on the ground, unlike the Uppercut', () => {
    const uppercut = makeFighter({ action: 'attack', move: 'specialAntiAir' });
    expect(canBeHit(uppercut, NAYO, false)).toBe(false);
    const states = exchange(40, at(0, Light), at(2, Down | Special));
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'standLight', counter: 'counter' }]);
  });
});

describe('launchers (← + H)', () => {
  for (const [name, config] of [
    ['Nayo', NAYO_VS_RIFF],
    ['Riff', { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] }],
  ] as const) {
    it(`${name}'s launches a standing opponent for a juggle, whiffs on a crouching one`, () => {
      const launch = (t: number): InputBits => (t === 0 ? Left | Heavy : 0);
      const standing = play(facingOff(32, config), 40, (t) => [launch(t), 0], config);
      expect(standing.some((s) => s.fighters[1].action === 'airHit' && s.fighters[1].juggle)).toBe(
        true,
      );
      const crouching = play(facingOff(32, config), 40, (t) => [launch(t), Down], config);
      expect(contactsBy(crouching, 0)).toEqual([]);
    });
  }
});

describe('overheads (→ + H)', () => {
  it('hit a crouching guard, are blocked standing', () => {
    const crouching = exchange(36, at(0, Right | Heavy), () => Right | Down);
    expect(contactsBy(crouching, 0)).toMatchObject([{ move: 'forwardHeavy', kind: 'hit' }]);
    const standing = exchange(36, at(0, Right | Heavy), () => Right);
    expect(contactsBy(standing, 0)).toMatchObject([{ move: 'forwardHeavy', kind: 'block' }]);
  });
});

describe('the Pied fendu', () => {
  it('knocks down', () => {
    const states = exchange(50, at(0, Right | Special), () => 0);
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'specialForward', kind: 'hit' }]);
    expect(states.some((state) => state.fighters[1].action === 'knockdown')).toBe(true);
  });

  it('flies 30 px forward', () => {
    const states = exchange(300, at(0, Right | Special), () => 0);
    const start = facingOff(300, NAYO_VS_RIFF).fighters[0].x;
    expect(states[40]?.fighters[0].x).toBe(start + px(30));
  });
});
