import { describe, expect, it } from 'vitest';
import type { Clip } from '../../src/art/types';
import type { FighterState, RoundState } from '../../src/core/state';
import {
  clipFrameAt,
  clipIdOf as clipIdIn,
  clipTickOf,
  frontFighter,
} from '../../src/render/animation';
import { makeFighter } from '../core/helpers';

const FIGHTING: RoundState = {
  number: 1,
  wins: [0, 0],
  timer: 5000,
  phase: 'fight',
  phaseFrame: 30,
  result: null,
};

/** Clip of player 1 during the fight. */
function clipIdOf(fighter: FighterState) {
  return clipIdIn(fighter, 0, FIGHTING);
}

describe('clipIdOf', () => {
  it('shows each state with its own clip', () => {
    expect(clipIdOf(makeFighter({ action: 'idle' }))).toBe('idle');
    expect(clipIdOf(makeFighter({ action: 'walkBack' }))).toBe('walkBack');
    expect(clipIdOf(makeFighter({ action: 'knockdown' }))).toBe('knockdown');
  });

  it('shows an attack with the clip of its move', () => {
    expect(clipIdOf(makeFighter({ action: 'attack', move: 'crouchHeavy' }))).toBe('crouchHeavy');
    expect(clipIdOf(makeFighter({ action: 'airAttack', move: 'jumpLight' }))).toBe('jumpLight');
  });

  it('flips only on jumps toward the side the fighter faces', () => {
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: 180 }))).toBe('jumpForward');
    expect(clipIdOf(makeFighter({ action: 'air', facing: -1, vx: -180 }))).toBe('jumpForward');
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: -160 }))).toBe('jump');
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: 0 }))).toBe('jump');
  });

  it('uses the crouching variants of hit and block reactions', () => {
    expect(clipIdOf(makeFighter({ action: 'hitstun', crouching: true }))).toBe('hitCrouch');
    expect(clipIdOf(makeFighter({ action: 'blockstun', crouching: false }))).toBe('blockStand');
  });
});

describe('round poses', () => {
  const idle = makeFighter({ action: 'idle', actionFrame: 400 });

  it('shows the entrance during the intro, on the round clock', () => {
    const intro: RoundState = { ...FIGHTING, phase: 'intro', phaseFrame: 12 };
    expect(clipIdIn(idle, 1, intro)).toBe('intro');
    expect(clipTickOf('intro', idle, intro)).toBe(12);
  });

  it('shows the winner celebrating and the loser on time out of breath', () => {
    const roundEnd: RoundState = {
      ...FIGHTING,
      phase: 'roundEnd',
      phaseFrame: 20,
      result: { winner: 0, reason: 'timeout' },
    };
    expect(clipIdIn(idle, 0, roundEnd)).toBe('victory');
    expect(clipIdIn(idle, 1, roundEnd)).toBe('timeOver');
  });

  it('leaves a knocked-out or still-moving fighter in its own animation', () => {
    const roundEnd: RoundState = {
      ...FIGHTING,
      phase: 'roundEnd',
      result: { winner: 0, reason: 'ko' },
    };
    expect(clipIdIn(makeFighter({ action: 'ko' }), 1, roundEnd)).toBe('ko');
    expect(clipIdIn(idle, 1, roundEnd)).toBe('idle');
    const recovering = makeFighter({ action: 'attack', move: 'standHeavy' });
    expect(clipIdIn(recovering, 0, roundEnd)).toBe('standHeavy');
  });

  it('keeps the victory pose running from the round end into the match end', () => {
    const roundEnd: RoundState = {
      ...FIGHTING,
      phase: 'roundEnd',
      phaseFrame: 149,
      result: { winner: 0, reason: 'ko' },
    };
    const matchEnd: RoundState = { ...roundEnd, phase: 'matchEnd', phaseFrame: 0 };
    expect(clipTickOf('victory', idle, matchEnd)).toBe(clipTickOf('victory', idle, roundEnd) + 1);
  });

  it('follows the action clock for everything else', () => {
    expect(clipTickOf('idle', idle, FIGHTING)).toBe(400);
  });
});

describe('clipFrameAt', () => {
  const once: Clip = { sheet: 's', frames: [0, 1, 2], ticks: [2, 3, 4] };

  it('shows each frame for its number of ticks', () => {
    const shown = Array.from({ length: 9 }, (_, tick) => clipFrameAt(once, tick));
    expect(shown).toEqual([0, 0, 1, 1, 1, 2, 2, 2, 2]);
  });

  it('holds the last frame once over', () => {
    expect(clipFrameAt(once, 9)).toBe(2);
    expect(clipFrameAt(once, 500)).toBe(2);
  });

  it('plays again from loopFrom once over', () => {
    // Crouch: two transition frames, then a two-frame loop.
    const crouch: Clip = { sheet: 's', frames: [0, 1, 2, 3], ticks: [2, 2, 3, 3], loopFrom: 2 };
    const shown = Array.from({ length: 16 }, (_, tick) => clipFrameAt(crouch, tick));
    expect(shown).toEqual([0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3]);
  });

  it('loops a whole clip from its start', () => {
    const idle: Clip = { sheet: 's', frames: [0, 1], ticks: [2, 2], loopFrom: 0 };
    const shown = Array.from({ length: 9 }, (_, tick) => clipFrameAt(idle, tick));
    expect(shown).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 0]);
  });
});

describe('frontFighter', () => {
  const idle = makeFighter({ action: 'idle' });
  const jab = makeFighter({ action: 'attack', move: 'standLight' });

  it('draws the attacker in front of the other fighter', () => {
    expect(frontFighter(1, jab, idle)).toBe(0);
    expect(frontFighter(0, idle, jab)).toBe(1);
  });

  it('keeps the order while both or neither attack', () => {
    expect(frontFighter(1, idle, idle)).toBe(1);
    expect(frontFighter(0, jab, jab)).toBe(0);
  });
});
