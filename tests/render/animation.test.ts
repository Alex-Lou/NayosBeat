import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { clipOf, type Clip } from '../../src/art/types';
import type { FighterState, RoundState } from '../../src/core/state';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import {
  clipFrameAt,
  clipIdOf as clipIdIn,
  clipTickOf,
  frontFighter,
  showFighter,
  stunTick,
  type Shown,
} from '../../src/render/animation';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, fightState, makeFighter, MIRROR_MATCH } from '../core/helpers';
import { atHoldTick, grabbed, play } from '../core/hold-helpers';

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
      const clip = clipOf(NAYO, id);
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

  it('loads a jump forward its own way when forward is held', () => {
    const preJump = (facing: 1 | -1, input: number) =>
      clipIdOf(makeFighter({ action: 'preJump', facing, input }));
    expect(preJump(1, Input.Up | Input.Right)).toBe('preJumpForward');
    expect(preJump(-1, Input.Up | Input.Left)).toBe('preJumpForward');
    expect(preJump(1, Input.Up | Input.Left)).toBe('preJump');
    expect(preJump(1, Input.Up)).toBe('preJump');
  });

  /** ko.ts of both fighters: sent flying, the fall, then the ko from where the body lands. */
  it('flies a fighter knocked out in the air, then plays its ko from the floor', () => {
    expect(clipIdOf(makeFighter({ action: 'ko', reaction: 'mid' }))).toBe('ko');
    // On the tick the blow lands, the lift is given but the body has not left the floor yet.
    expect(clipIdOf(makeFighter({ action: 'ko', reaction: 'launch', vy: 300 }))).toBe('airHit');
    expect(clipIdOf(makeFighter({ action: 'ko', reaction: 'trip', y: 900 }))).toBe('trip');
    expect(clipIdOf(makeFighter({ action: 'ko', reaction: 'thrown', y: 900 }))).toBe('airHit');
    for (const reaction of ['launch', 'trip', 'thrown'] as const) {
      expect(clipIdOf(makeFighter({ action: 'ko', reaction }))).toBe('koLanding');
    }
    // Knocked out by a pummel, it drops where it was held.
    expect(clipIdOf(makeFighter({ action: 'ko', reaction: null }))).toBe('ko');
  });
});

describe('a knockout in the air, through the game', () => {
  /** Riff's Retourné launches and knocks out a Nayo on his last point. */
  const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF_TEMPLATE, NAYO_TEMPLATE] };
  const start = facingOff(30, config, [{}, { health: 1 }]);
  const states = play(start, 80, (tick) => [tick === 0 ? Input.Left | Input.Heavy : 0, 0], config);
  const ko = states.filter((state) => state.fighters[1].action === 'ko');
  const landing = ko.findIndex((state) => state.fighters[1].y === 0 && state.fighters[1].vy === 0);

  it('flies until the body lands, then the ko starts from the floor, on its own clock', () => {
    expect(ko.length).toBeGreaterThan(0);
    expect(landing).toBeGreaterThan(0);
    const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
    ko.forEach((state, index) => {
      showFighter(state, 1, config, NAYO, shown);
      if (index < landing) expect(shown.clip).toBe('airHit');
      else expect(shown).toMatchObject({ clip: 'koLanding', tick: index - landing });
    });
  });
});

describe('a knockout by a throw backward', () => {
  /** Nayo throws a Riff on her last points over his shoulder: the throw's flight, then her ko. */
  const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO_TEMPLATE, RIFF_TEMPLATE] };
  const start = atHoldTick(grabbed(config, [{}, { health: 1 }]), 12, config);
  const states = play(start, 60, (tick) => [tick === 0 ? Input.Left | Input.Heavy : 0, 0], config);
  const ko = states.filter((state) => state.fighters[1].action === 'ko');

  it('flies as any throw does, then lands into the ko from the floor', () => {
    expect(ko.length).toBeGreaterThan(0);
    const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
    const clips = ko.map((state) => {
      showFighter(state, 1, config, RIFF, shown);
      return shown.clip;
    });
    const landed = clips.indexOf('koLanding');
    expect(new Set(clips.slice(0, landed))).toEqual(new Set(['thrownBack', 'thrownFall']));
    expect(clips.slice(landed).every((clip) => clip === 'koLanding')).toBe(true);
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
