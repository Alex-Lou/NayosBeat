import { describe, expect, it } from 'vitest';
import { findHit } from '../../src/core/combat';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { PROJECTILE_THREAT_RANGE, THREAT_MARGIN } from '../../src/core/rules';
import type { GameState, ProjectileState } from '../../src/core/state';
import { step } from '../../src/core/step';
import {
  isThreatened,
  projectileThreatens,
  strikeThreatens,
  threatReach,
  upcomingMove,
} from '../../src/core/threat';
import { NAYO } from '../../src/data/fighters/nayo';
import { facingOff, makeFighter, MIRROR_MATCH, repeat } from './helpers';

const { Down, Left, Right, Heavy, Dash, Grab } = Input;

describe('threat reach', () => {
  it('is the front edge of the hitbox, plus the motion up to the last active frame', () => {
    expect(threatReach(NAYO.moves.standLight)).toBe(px(40));
    // The flying kick strikes 8..44 px ahead after stepping 2.5 px a tick on frames 3 to 14.
    expect(threatReach(NAYO.moves.specialForward)).toBe(px(44) + 12 * px(2.5));
  });

  it('reaches where a projectile appears', () => {
    // The Vinyle's box (−10..10 px) appears 24 px ahead: its front edge 34 px ahead (§10.1).
    expect(threatReach(NAYO.moves.special)).toBe(px(24 + 10));
  });
});

describe('upcoming move', () => {
  const attacking = (move: 'standHeavy' | 'dashForward', actionFrame: number) =>
    makeFighter({ action: 'attack', move, actionFrame });

  it('is the move starting up or out, not its recovery', () => {
    const { startup, active } = NAYO.moves.standHeavy;
    expect(upcomingMove(attacking('standHeavy', 0), NAYO)).toBe(NAYO.moves.standHeavy);
    expect(upcomingMove(attacking('standHeavy', startup + active - 1), NAYO)).not.toBeNull();
    expect(upcomingMove(attacking('standHeavy', startup + active), NAYO)).toBeNull();
  });

  it('ignores the dashes: they never strike', () => {
    expect(upcomingMove(attacking('dashForward', 3), NAYO)).toBeNull();
  });

  it('threatens up to its reach plus the margin', () => {
    const attacker = attacking('standHeavy', 0);
    const edge = attacker.x + threatReach(NAYO.moves.standHeavy) + THREAT_MARGIN;
    expect(strikeThreatens(attacker, NAYO, edge)).toBe(true);
    expect(strikeThreatens(attacker, NAYO, edge + 1)).toBe(false);
  });
});

describe('projectile threat', () => {
  const projectile = (x: number, facing: 1 | -1): ProjectileState => ({
    owner: 1,
    move: 'special',
    x,
    facing,
  });

  it('comes from an opponent projectile flying toward the fighter, closer than 96 px', () => {
    const x = px(400);
    expect(projectileThreatens([projectile(x + px(95), -1)], 0, x)).toBe(true);
    expect(projectileThreatens([projectile(x + PROJECTILE_THREAT_RANGE, -1)], 0, x)).toBe(false);
    // Flying away, or the fighter's own.
    expect(projectileThreatens([projectile(x + px(50), 1)], 0, x)).toBe(false);
    expect(projectileThreatens([projectile(x + px(50), -1)], 1, x)).toBe(false);
  });
});

describe('proximity guard (§3.6)', () => {
  /** Player 2 starts `move` from `distancePx` away; player 1 holds `held` meanwhile. */
  function underAttack(
    distancePx: number,
    attack: InputBits,
    held: InputBits,
    ticks: number,
  ): GameState[] {
    const states: GameState[] = [];
    let state = facingOff(distancePx, MIRROR_MATCH);
    for (let tick = 0; tick < ticks; tick++) {
      state = step(state, [held, tick === 0 ? attack : 0], MIRROR_MATCH);
      states.push(state);
    }
    return states;
  }

  it('stops in guard instead of walking back when a blow is coming', () => {
    const states = underAttack(60, Heavy, Left, 6);
    const start = facingOff(60, MIRROR_MATCH).fighters[0].x;
    // The threat is read from the tick before: the first tick still walks back.
    expect(states[0]?.fighters[0].action).toBe('walkBack');
    expect(states.slice(1).every((state) => state.fighters[0].action === 'guard')).toBe(true);
    expect(states.at(-1)?.fighters[0].x).toBe(start - NAYO.walkBackSpeed);
  });

  it('crouches in guard when down is held, and blocks the blow', () => {
    const states = underAttack(50, Down | Heavy, Down | Left, 30);
    expect(states[3]?.fighters[0]).toMatchObject({ action: 'guard', crouching: true });
    expect(states.some((state) => state.fighters[0].action === 'blockstun')).toBe(true);
    expect(states.at(-1)?.fighters[0].health).toBe(NAYO.maxHealth);
  });

  it('walks back as usual when nothing threatens, or out of reach', () => {
    expect(underAttack(60, 0, Left, 6).at(-1)?.fighters[0].action).toBe('walkBack');
    const far = 2 * (threatReach(NAYO.moves.standHeavy) + THREAT_MARGIN);
    expect(underAttack(far / px(1), Heavy, Left, 6).at(-1)?.fighters[0].action).toBe('walkBack');
  });

  it('does not guard against a dash', () => {
    const states = underAttack(120, Dash, Left, 6);
    expect(states.at(-1)?.fighters[0].action).toBe('walkBack');
  });

  it('guards against a projectile closing in', () => {
    let state = facingOff(200, MIRROR_MATCH);
    let guarded = false;
    for (let tick = 0; tick < 120; tick++) {
      state = step(state, [Left, tick === 0 ? Input.Special : 0], MIRROR_MATCH);
      guarded ||= state.fighters[0].action === 'guard';
    }
    expect(guarded).toBe(true);
  });

  it('can be grabbed, like standing still', () => {
    const grabber = makeFighter({ action: 'attack', move: 'grab', actionFrame: 3 });
    const guarding = makeFighter({ x: px(420), facing: -1, action: 'guard', input: Right });
    expect(findHit(grabber, NAYO, guarding, NAYO)).not.toBeNull();
  });

  it('reads the threat once per tick, from the previous state, the same for both players', () => {
    const state = facingOff(60, MIRROR_MATCH, [{}, { action: 'attack', move: 'standLight' }]);
    expect(isThreatened(0, state.fighters, state.projectiles, MIRROR_MATCH)).toBe(true);
    expect(isThreatened(1, state.fighters, state.projectiles, MIRROR_MATCH)).toBe(false);
    const mirrored = facingOff(60, MIRROR_MATCH, [{ action: 'attack', move: 'standLight' }, {}]);
    expect(isThreatened(1, mirrored.fighters, mirrored.projectiles, MIRROR_MATCH)).toBe(true);
  });

  it('lets the grab button grab a fighter in guard', () => {
    let state = facingOff(36, MIRROR_MATCH);
    let guarded = false;
    for (const input of [Grab, ...repeat(0, 10)]) {
      state = step(state, [Left, input], MIRROR_MATCH);
      guarded ||= state.fighters[0].action === 'guard';
    }
    expect(guarded).toBe(true);
    expect(state.fighters[0].health).toBeLessThan(NAYO.maxHealth);
  });
});
