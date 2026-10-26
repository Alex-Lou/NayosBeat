import { describe, expect, it } from 'vitest';
import { applyHit, findHit } from '../../src/core/combat';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { FighterState } from '../../src/core/state';
import { POLYVALENT as T } from '../../src/data/fighters';
import { facingOff, makeFighter, MIRROR_MATCH, run } from './helpers';

const LIGHT = T.moves.standLight;

/** Attacker at 400 px facing right, in the first active tick of `move`. */
function attacking(move: keyof typeof T.moves = 'standLight') {
  return makeFighter({ action: 'attack', move, actionFrame: T.moves[move].startup });
}

describe('findHit', () => {
  it('hits a defender inside the hitbox during active frames', () => {
    expect(findHit(attacking(), T, makeFighter({ x: px(430), facing: -1 }), T)).toBe(LIGHT);
  });

  it('does not hit before the active frames', () => {
    const early = makeFighter({ action: 'attack', move: 'standLight', actionFrame: 0 });
    expect(findHit(early, T, makeFighter({ x: px(430) }), T)).toBeNull();
  });

  it('does not hit out of range', () => {
    expect(findHit(attacking(), T, makeFighter({ x: px(480) }), T)).toBeNull();
  });

  it('does not hit twice with the same move', () => {
    const connected = { ...attacking(), moveConnected: true };
    expect(findHit(connected, T, makeFighter({ x: px(430) }), T)).toBeNull();
  });

  it('does not hit a knocked-down defender', () => {
    const down = makeFighter({ x: px(430), action: 'knockdown' });
    expect(findHit(attacking(), T, down, T)).toBeNull();
  });

  it('mirrors the hitbox when facing left', () => {
    const left = { ...attacking(), facing: -1 as const };
    expect(findHit(left, T, makeFighter({ x: px(370) }), T)).toBe(LIGHT);
    expect(findHit(left, T, makeFighter({ x: px(430) }), T)).toBeNull();
  });
});

describe('applyHit', () => {
  const ATTACKER_X = px(370);

  it('deals damage, hitstun and pushback away from the attacker', () => {
    const hit = applyHit(makeFighter(), ATTACKER_X, LIGHT);
    expect(hit.action).toBe('hitstun');
    expect(hit.health).toBe(1000 - LIGHT.damage);
    expect(hit.stunFrames).toBe(LIGHT.hitstun);
    expect(hit.vx).toBe(LIGHT.pushback);
  });

  it('is blocked when holding back, without damage', () => {
    const blocked = applyHit(makeFighter({ input: Input.Right }), ATTACKER_X, LIGHT);
    expect(blocked.action).toBe('blockstun');
    expect(blocked.health).toBe(1000);
    expect(blocked.stunFrames).toBe(LIGHT.blockstun);
  });

  it('requires a crouching block against low moves', () => {
    const low = T.moves.crouchLight;
    expect(applyHit(makeFighter({ input: Input.Right }), ATTACKER_X, low).action).toBe('hitstun');
    const crouchBlock = makeFighter({ input: Input.Right | Input.Down, crouching: true });
    expect(applyHit(crouchBlock, ATTACKER_X, low).action).toBe('blockstun');
  });

  it('requires a standing block against overheads', () => {
    const overhead = T.moves.jumpHeavy;
    const crouchBlock = makeFighter({ input: Input.Right | Input.Down, crouching: true });
    expect(applyHit(crouchBlock, ATTACKER_X, overhead).action).toBe('hitstun');
    expect(applyHit(makeFighter({ input: Input.Right }), ATTACKER_X, overhead).action).toBe(
      'blockstun',
    );
  });

  it('cannot block while attacking', () => {
    const busy = makeFighter({ action: 'attack', move: 'standHeavy', input: Input.Right });
    expect(applyHit(busy, ATTACKER_X, LIGHT).action).toBe('hitstun');
  });

  it('launches an airborne defender', () => {
    const hit = applyHit(makeFighter({ action: 'air', y: px(40) }), ATTACKER_X, LIGHT);
    expect(hit.action).toBe('airHit');
    expect(hit.vy).toBeGreaterThan(0);
  });

  it('KOs at zero health', () => {
    const ko = applyHit(makeFighter({ health: 10 }), ATTACKER_X, LIGHT);
    expect(ko.action).toBe('ko');
    expect(ko.health).toBe(0);
  });

  it('cancels the defender’s own attack', () => {
    const busy = makeFighter({ action: 'attack', move: 'standHeavy' });
    expect(applyHit(busy, ATTACKER_X, LIGHT).move).toBeNull();
  });
});

describe('exchanges in a match', () => {
  it('lands a standing light at close range and freezes the game', () => {
    const state = run(
      LIGHT.startup + 1,
      [Input.Light, 0],
      facingOff(30, MIRROR_MATCH),
      MIRROR_MATCH,
    );
    const [, defender] = state.fighters;
    expect(defender.action).toBe('hitstun');
    expect(defender.health).toBe(T.maxHealth - LIGHT.damage);
    expect(state.hitstop).toBe(LIGHT.hitstop);
  });

  it('freezes both fighters during hitstop', () => {
    const hit = run(LIGHT.startup + 1, [Input.Light, 0], facingOff(30, MIRROR_MATCH), MIRROR_MATCH);
    const frozen = run(LIGHT.hitstop - 1, [0, 0], hit, MIRROR_MATCH);
    const withoutInputs = (f: FighterState) => ({
      ...f,
      input: 0,
      directionHistory: [],
      bufferedAttack: null,
      bufferFrames: 0,
      bufferedInput: 0,
      bufferedMotion: null,
      bufferedFacing: f.facing,
    });
    expect(frozen.fighters.map(withoutInputs)).toEqual(hit.fighters.map(withoutInputs));
  });

  it('trades when both attacks connect on the same tick', () => {
    const state = run(
      LIGHT.startup + 1,
      [Input.Light, Input.Light],
      facingOff(30, MIRROR_MATCH),
      MIRROR_MATCH,
    );
    expect(state.fighters.map((f) => f.action)).toEqual(['hitstun', 'hitstun']);
  });

  it('hits only once per attack', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const state = run(60, [Input.Light, 0], start, MIRROR_MATCH);
    expect(state.fighters[1].health).toBe(T.maxHealth - LIGHT.damage);
  });

  it('gives frame advantage to a standing light on hit', () => {
    let state = run(LIGHT.startup + 1, [Input.Light, 0], facingOff(30, MIRROR_MATCH), MIRROR_MATCH);
    let attackerFree = -1;
    let defenderFree = -1;
    for (let tick = 0; tick < 60 && (attackerFree < 0 || defenderFree < 0); tick++) {
      state = run(1, [0, 0], state, MIRROR_MATCH);
      const [a, b] = state.fighters;
      if (attackerFree < 0 && a.action === 'idle') attackerFree = tick;
      if (defenderFree < 0 && b.action === 'idle') defenderFree = tick;
    }
    expect(defenderFree - attackerFree).toBeGreaterThan(0);
  });

  it('pushes the attacker back when the defender is cornered', () => {
    const wall = T.standingPushbox.width / 2;
    const cornered = facingOff(0, MIRROR_MATCH);
    const state = {
      ...cornered,
      cameraX: px(240),
      fighters: [
        { ...cornered.fighters[0], x: wall + px(30), facing: -1 as const },
        { ...cornered.fighters[1], x: wall, facing: 1 as const },
      ] as const,
    };
    const after = run(
      LIGHT.startup + 1 + LIGHT.hitstop + 10,
      [Input.Light, 0],
      state,
      MIRROR_MATCH,
    );
    expect(after.fighters[1].x).toBe(wall);
    expect(after.fighters[0].x).toBeGreaterThan(wall + px(30));
  });
});
