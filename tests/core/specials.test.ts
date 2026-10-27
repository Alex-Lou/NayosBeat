import { describe, expect, it } from 'vitest';
import { canBeHit, scaledDamage } from '../../src/core/combat';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import { detectMotion } from '../../src/core/motion';
import { moveDuration } from '../../src/core/moves';
import type { GameState } from '../../src/core/state';
import { NAYO as P } from '../../src/data/fighters/nayo';
import { RIFF as R } from '../../src/data/fighters/riff';
import { facingOff, makeFighter, MIRROR_MATCH, repeat, run } from './helpers';

const { Up, Down, Left, Right, Light, Heavy, Special } = Input;
const OPPONENT_X = px(500);

/** Feeds one input per tick to a fighter facing right. */
function play(inputs: number[], fighter = makeFighter()) {
  return inputs.reduce((f, input) => updateFighter(f, input, P, OPPONENT_X), fighter);
}

/** Runs a mirror match with per-tick scripted inputs for both players. */
function script(state: GameState, ticks: [number, number][]): GameState {
  return ticks.reduce((current, inputs) => run(1, inputs, current, MIRROR_MATCH), state);
}

const idle = (ticks: number): [number, number][] => repeat<[number, number]>([0, 0], ticks);

describe('detectMotion', () => {
  it('recognizes a quarter circle forward', () => {
    expect(detectMotion([Down, Down | Right, Right], 1)).toBe('quarterCircleForward');
  });

  it('mirrors motions when facing left', () => {
    expect(detectMotion([Down, Down | Left, Left], -1)).toBe('quarterCircleForward');
    expect(detectMotion([Down, Down | Right, Right], -1)).toBeNull();
  });

  it('recognizes a dragon punch', () => {
    expect(detectMotion([Right, Down, Down | Right], 1)).toBe('dragonPunch');
    expect(detectMotion([Right, Down, Down | Right, Down | Right], 1)).toBe('dragonPunch');
  });

  it('prefers the motion completed most recently', () => {
    // Walking forward, then a quarter circle: the walk must not turn it into a dragon punch.
    const walkThenFireball = [Right, Right, Right, Right, 0, Down, Down | Right, Right];
    expect(detectMotion(walkThenFireball, 1)).toBe('quarterCircleForward');
  });

  it('tolerates noise between steps', () => {
    expect(detectMotion([Down, 0, Down | Right, Down | Right, Right], 1)).toBe(
      'quarterCircleForward',
    );
  });

  it('ignores a motion finished too long ago', () => {
    expect(detectMotion([Down, Down | Right, Right, 0, 0, 0, 0, 0], 1)).toBeNull();
  });
});

describe('special moves', () => {
  it('uses simplified inputs: special, forward + special, down + special', () => {
    expect(play([Special]).move).toBe('special');
    expect(play([Right | Special]).move).toBe('specialForward');
    expect(play([Down | Special]).move).toBe('specialAntiAir');
  });

  it('also comes out with classic motions and a light or heavy press', () => {
    expect(play([Down, Down | Right, Right, Right | Light]).move).toBe('special');
    expect(play([Right, Down, Down | Right, Down | Right | Heavy]).move).toBe('specialAntiAir');
  });

  it('makes the anti-air invincible during its first frames only', () => {
    const uppercut = play([Down | Special]);
    expect(canBeHit(uppercut, P)).toBe(false);
    const late = play(repeat(0, P.moves.specialAntiAir.invincible?.to ?? 0), uppercut);
    expect(canBeHit(late, P)).toBe(true);
  });

  it('moves the rushdown forward during its rush', () => {
    const start = makeFighter();
    const rush = [Special, ...Array<number>(15).fill(0)].reduce(
      (f, input) => updateFighter(f, input, R, OPPONENT_X),
      start,
    );
    expect(rush.x).toBeGreaterThan(start.x + px(40));
  });
});

describe('projectiles', () => {
  const FIREBALL = P.moves.special;

  it('spawns on the first active frame, then travels forward', () => {
    const start = facingOff(300, MIRROR_MATCH);
    const fired = script(start, [[Special, 0], ...idle(FIREBALL.startup)]);
    expect(fired.projectiles).toHaveLength(1);
    const later = script(fired, idle(10));
    expect(later.projectiles[0]?.x).toBe((fired.projectiles[0]?.x ?? 0) + 10 * px(3));
  });

  it('hits the opponent and disappears', () => {
    const start = facingOff(120, MIRROR_MATCH);
    const after = script(start, [[Special, 0], ...idle(60)]);
    expect(after.projectiles).toHaveLength(0);
    expect(after.fighters[1].health).toBe(P.maxHealth - FIREBALL.damage);
  });

  it('can be blocked', () => {
    const start = facingOff(120, MIRROR_MATCH);
    const after = script(start, [[Special, Right], ...repeat<[number, number]>([0, Right], 60)]);
    expect(after.fighters[1].health).toBe(P.maxHealth);
    expect(after.projectiles).toHaveLength(0);
  });

  it('allows only one projectile per player at a time', () => {
    const start = facingOff(300, MIRROR_MATCH);
    const duration = moveDuration(FIREBALL);
    const twice = script(start, [
      [Special, 0],
      ...idle(duration),
      [Special, 0],
      ...idle(FIREBALL.startup + 1),
    ]);
    expect(twice.projectiles).toHaveLength(1);
  });

  it('cancels out with an opposing projectile', () => {
    const start = facingOff(300, MIRROR_MATCH);
    const after = script(start, [[Special, Special], ...idle(60)]);
    expect(after.projectiles).toHaveLength(0);
    expect(after.fighters.map((f) => f.health)).toEqual([P.maxHealth, P.maxHealth]);
  });
});

describe('throws', () => {
  const THROW = P.moves.grab;

  it('is light + heavy, even with the second button a tick late', () => {
    expect(play([Light | Heavy]).move).toBe('grab');
    expect(play([Light, Light | Heavy]).move).toBe('grab');
  });

  it('throws a nearby opponent, even when blocking, and knocks them down', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const after = script(start, [
      [Light | Heavy, Right],
      ...repeat<[number, number]>([0, Right], 10),
    ]);
    const [, thrown] = after.fighters;
    expect(thrown.health).toBe(P.maxHealth - THROW.damage);
    expect(['airHit', 'knockdown']).toContain(thrown.action);
  });

  it('cannot throw an opponent in hitstun', () => {
    const start = facingOff(30, MIRROR_MATCH, [{}, { action: 'hitstun', stunFrames: 30 }]);
    const after = script(start, [[Light | Heavy, 0], ...idle(10)]);
    expect(after.fighters[1].health).toBe(P.maxHealth);
  });

  it('is teched when both players throw on the same tick', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const after = script(start, [[Light | Heavy, Light | Heavy], ...idle(5)]);
    expect(after.fighters.map((f) => f.health)).toEqual([P.maxHealth, P.maxHealth]);
    expect(after.fighters[1].x - after.fighters[0].x).toBeGreaterThan(px(30));
  });
});

describe('cancels and combos', () => {
  const LIGHT = P.moves.standLight;

  it('cancels a light into a special once it connects', () => {
    const start = facingOff(30, MIRROR_MATCH);
    // Down + special pressed during the hit freeze, then released: the intent is kept.
    const after = script(start, [
      [Light, 0],
      ...idle(LIGHT.startup),
      [Down | Special, 0],
      ...idle(LIGHT.hitstop),
    ]);
    const [attacker] = after.fighters;
    expect(attacker.move).toBe('specialAntiAir');
  });

  it('does not cancel a move that whiffed', () => {
    const start = facingOff(200, MIRROR_MATCH);
    const after = script(start, [[Light, 0], ...idle(LIGHT.startup + 1), [Special, 0]]);
    expect(after.fighters[0].move).toBe('standLight');
  });

  it('counts hits in a combo and scales their damage', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const after = script(start, [
      [Light, 0],
      ...idle(LIGHT.startup + LIGHT.hitstop + 1),
      [Heavy, 0],
      ...idle(P.moves.standHeavy.startup + 2),
    ]);
    const [, defender] = after.fighters;
    expect(defender.comboCount).toBe(2);
    expect(defender.health).toBe(
      P.maxHealth - LIGHT.damage - scaledDamage(P.moves.standHeavy.damage, 2),
    );
  });

  it('resets the combo counter once the defender can act again', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const after = script(start, [[Light, 0], ...idle(60)]);
    expect(after.fighters[1].comboCount).toBe(0);
  });

  it('never scales damage below the floor', () => {
    expect(scaledDamage(100, 1)).toBe(100);
    expect(scaledDamage(100, 3)).toBe(80);
    expect(scaledDamage(100, 20)).toBe(50);
  });

  it('knocks down with a sweep', () => {
    const start = facingOff(40, MIRROR_MATCH);
    const after = script(start, [[Down | Heavy, 0], ...idle(P.moves.crouchHeavy.startup + 3)]);
    expect(['airHit', 'knockdown']).toContain(after.fighters[1].action);
  });

  it('beats a jump-in with the invincible anti-air', () => {
    // Player 2 jumps in with a heavy; player 1 answers with down + special as it comes down.
    const ticks: [number, number][] = Array.from({ length: 60 }, (_, t) => [
      t === 16 ? Down | Special : 0,
      t < 6 ? Up | Left : t === 10 ? Heavy : 0,
    ]);
    const after = script(facingOff(80, MIRROR_MATCH), ticks);
    expect(after.fighters[0].health).toBe(P.maxHealth);
    expect(after.fighters[1].health).toBe(P.maxHealth - P.moves.specialAntiAir.damage);
  });

  it('loses to the same jump-in when pressed too early', () => {
    const ticks: [number, number][] = Array.from({ length: 60 }, (_, t) => [
      t === 4 ? Down | Special : 0,
      t < 6 ? Up | Left : t === 10 ? Heavy : 0,
    ]);
    const after = script(facingOff(80, MIRROR_MATCH), ticks);
    expect(after.fighters[0].health).toBeLessThan(P.maxHealth);
  });
});
