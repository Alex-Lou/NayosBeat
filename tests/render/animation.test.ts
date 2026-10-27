import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import type { Clip } from '../../src/art/types';
import type { FighterState, RoundState } from '../../src/core/state';
import { NAYO } from '../../src/art/nayo';
import {
  clipFrameAt,
  clipIdOf as clipIdIn,
  clipTickOf,
  frontFighter,
  showFighter,
  stunTick,
  type Shown,
} from '../../src/render/animation';
import { fightState, makeFighter, MIRROR_MATCH } from '../core/helpers';

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

  it('holds the last pose of the block in the proximity guard, standing or crouching', () => {
    // The first pose is the impact: shown before anything touches, it would read as a hit.
    for (const crouching of [false, true]) {
      const guard = makeFighter({ action: 'guard', actionFrame: 0, crouching });
      const id = clipIdOf(guard);
      expect(id).toBe(crouching ? 'blockCrouch' : 'blockStand');
      const clip = NAYO_CLIPS[id];
      expect(clipFrameAt(clip, clipTickOf(id, guard, FIGHTING))).toBe(clip.frames.length - 1);
    }
  });

  it('shows a dash with the clip of its move', () => {
    expect(clipIdOf(makeFighter({ action: 'attack', move: 'dashBack' }))).toBe('dashBack');
  });

  it('uses the crouching variants of hit and block reactions', () => {
    expect(clipIdOf(makeFighter({ action: 'hitstun', crouching: true }))).toBe('hitCrouch');
    expect(clipIdOf(makeFighter({ action: 'blockstun', crouching: false }))).toBe('blockStand');
  });

  it('shows a hit standing by its height, whole for a long stun, quick otherwise (§9.4)', () => {
    const hit = (reaction: 'high' | 'mid' | 'low', reactionHeavy: boolean) =>
      clipIdOf(makeFighter({ action: 'hitstun', reaction, reactionHeavy }));
    expect(hit('high', true)).toBe('hitHigh');
    expect(hit('high', false)).toBe('hitHighLight');
    expect(hit('mid', true)).toBe('hitMid');
    expect(hit('mid', false)).toBe('hitMidLight');
    expect(hit('low', true)).toBe('hitLow');
    expect(hit('low', false)).toBe('hitLowLight');
  });

  it('plays frames 0, 1 and 4 of a reaction for a light hit (§11.4)', () => {
    for (const id of ['hitHighLight', 'hitMidLight', 'hitLowLight'] as const) {
      expect(NAYO_CLIPS[id].frames).toEqual([0, 1, 4]);
    }
  });

  it('shows a fighter swept off its legs falling on its back', () => {
    expect(clipIdOf(makeFighter({ action: 'airHit', reaction: 'trip' }))).toBe('trip');
    expect(clipIdOf(makeFighter({ action: 'airHit', reaction: 'launch' }))).toBe('airHit');
  });
});

describe('stunTick (§11.4)', () => {
  const clip = NAYO_CLIPS.hitHighLight;

  it('keeps the pace of the frames before the last, which ends with the stun', () => {
    expect(stunTick(clip, 3, 14)).toBe(3);
    expect(clipFrameAt(clip, stunTick(clip, 13, 14))).toBe(clip.frames.length - 1);
    expect(clipFrameAt(clip, stunTick(clip, 14, 14))).toBe(clip.frames.length - 1);
  });

  it('squeezes the whole clip into a stun too short for it', () => {
    expect(stunTick(clip, 2, 4)).toBe(4);
    expect(clipFrameAt(clip, stunTick(clip, 3, 4))).toBe(1);
  });

  it('leaves a clip without endFrames alone', () => {
    expect(stunTick(NAYO_CLIPS.idle, 7, 3)).toBe(7);
  });
});

describe('the knockdown (§3.8)', () => {
  const state = fightState(MIRROR_MATCH);
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  const down = (stunFrames: number, actionFrame: number) => {
    const fighter = makeFighter({ action: 'knockdown', stunFrames, actionFrame });
    showFighter({ ...state, fighters: [fighter, state.fighters[1]] }, 0, MIRROR_MATCH, NAYO, shown);
    return { clip: shown.clip, tick: shown.tick };
  };

  it('falls and lies, then gets up on its last ticks', () => {
    expect(down(40, 0)).toEqual({ clip: 'knockdown', tick: 0 });
    expect(down(11, 29)).toEqual({ clip: 'knockdown', tick: 29 });
    expect(down(10, 30)).toEqual({ clip: 'getup', tick: 0 });
    expect(down(0, 40)).toEqual({ clip: 'getup', tick: 10 });
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
