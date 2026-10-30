import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import { FightFeedback, type FeedbackStage } from '../../src/render/fight-feedback';
import { HAPTICS, SHATTER_RUMBLE, type FightEvent } from '../../src/render/fight-events';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { hitStyleOf } from '../../src/render/hit-styles';
import { TRAUMA } from '../../src/render/shake';
import { STAMP_TEXTS } from '../../src/render/stamps';
import { DIM_COLOR, HALO_COLOR, type VeilLook } from '../../src/render/veils';

/**
 * The effects stand in for the engine's game objects: each one records what it was asked to
 * show, so the test reads which effects a blow plays.
 */
const shown = vi.hoisted(() => ({
  burst: vi.fn(),
  graze: vi.fn(),
  kick: vi.fn(),
  bleed: vi.fn(),
  stamp: vi.fn(),
  word: vi.fn(),
  jolt: vi.fn(),
  veil: vi.fn(),
}));

vi.mock('../../src/render/hit-fx', () => ({
  HitFx: class {
    play = shown.burst;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/graze', () => ({
  Graze: class {
    play = shown.graze;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/dust', () => ({
  Dust: class {
    kick = shown.kick;
    puff = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/blood', () => ({
  BLEEDS: { heavyHit: {}, ko: {} },
  Blood: class {
    bleed = shown.bleed;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/effects', () => ({
  Effects: class {
    kick = shown.jolt;
    veil = shown.veil;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/stamps', async (original) => ({
  ...(await original<typeof import('../../src/render/stamps')>()),
  Stamps: class {
    show = shown.stamp;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/onomatopoeia', () => ({
  Onomatopoeia: class {
    blow = shown.word;
    beginTick = vi.fn();
    reset = vi.fn();
    update = vi.fn();
  },
}));

const NAYO_STYLE = hitStyleOf('nayo');
/** The sounds asked for. */
const played = vi.fn();
const SILENT = { play: played } as unknown as Sfx;

const STAGE: FeedbackStage = { width: 640, colors: GREYBOX_COLORS, shake: true };

function feedback(): FightFeedback {
  return new FightFeedback({} as Phaser.Scene, 400, SILENT, [NAYO_STYLE, NAYO_STYLE], STAGE);
}

/** The veils asked for, by kind. */
function veils(): VeilLook[] {
  return shown.veil.mock.calls.map(([look]) => look as VeilLook);
}

/** A blow landing at `y` px above the ground, low (at the feet) or not. */
function blow(type: 'hit' | 'ko', low: boolean, heavy = false): FightEvent {
  const impact = {
    x: px(200),
    y: px(low ? 9 : 50),
    away: 1,
    by: 0,
    low,
    held: false,
    counter: null,
    pulse: false,
  } as const;
  return type === 'hit'
    ? { type, damage: 25, heavy, ...impact }
    : { type, finish: 'plain', ...impact };
}

describe('the spark of a blow (docs/combat-v2.md §9.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skims the floor on a low hit: grazing spark and dust, no burst, no blood', () => {
    feedback().react(blow('hit', true), 0);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'light', px(200), px(9), 1);
    expect(shown.kick).toHaveBeenCalledWith(px(200), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('throws the heavy grazing spark on a sweep, still without the burst', () => {
    feedback().react(blow('hit', true, true), 0);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(9), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('bursts on a hit higher up, without the grazing spark', () => {
    feedback().react(blow('hit', false, true), 0);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
    expect(shown.graze).not.toHaveBeenCalled();
    expect(shown.kick).not.toHaveBeenCalled();
    expect(shown.bleed).toHaveBeenCalledOnce();
  });

  it('keeps the burst of a low KO, the final blow, with the grazing spark and no blood', () => {
    feedback().react(blow('ko', true), 0);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'ko', px(200), px(9), 1);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(9), 1);
    expect(shown.bleed).not.toHaveBeenCalled();
  });
});

describe('a counter-hit (docs/combat-v2.md §7.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bursts like a heavy blow under its stamp, CONTRE or PUNITION', () => {
    for (const counter of ['counter', 'punish'] as const) {
      const hit: FightEvent = {
        type: 'hit',
        damage: 36,
        heavy: false,
        x: px(200),
        y: px(50),
        away: 1,
        by: 0,
        low: false,
        held: false,
        counter,
        pulse: false,
      };
      feedback().react(hit, 0);
      expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
      expect(shown.stamp).toHaveBeenLastCalledWith(STAMP_TEXTS[counter], hit, 0);
    }
  });

  it('stamps nothing on a plain hit', () => {
    feedback().react(blow('hit', false), 0);
    expect(shown.stamp).not.toHaveBeenCalled();
  });
});

describe('the Boost (docs/combos-v3.md §1.8.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const at = { by: 0, x: px(200), y: 0 } as const;
  const overHead = { by: 0, x: px(200), y: px(60) };

  it('stamps REMIX over the head of the one who spends, its bass boost heard', () => {
    feedback().react({ type: 'boost', ...at }, 0);
    expect(shown.stamp).toHaveBeenCalledWith('REMIX !', overHead, 0);
    expect(played).toHaveBeenCalledWith('remix');
  });

  it('stamps the Rewind and the super by their names', () => {
    feedback().react({ type: 'rewind', name: 'Pogo', toward: 1, ...at }, 0);
    expect(shown.stamp).toHaveBeenLastCalledWith('POGO !', overHead, 0);
    expect(played).toHaveBeenLastCalledWith('rewind');
    feedback().react({ type: 'super', name: 'Mégabasse', ...at }, 0);
    expect(shown.stamp).toHaveBeenLastCalledWith('MÉGABASSE !', overHead, 0);
    expect(played).toHaveBeenLastCalledWith('super');
  });
});

describe('a KO that blows a Boost gauge up (docs/combos-v3.md §1.8.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** The final blow, landed by player 1, `finish` saying how. */
  const ko = (finish: 'plain' | 'combo' | 'finisher'): FightEvent => ({
    type: 'ko',
    finish,
    x: px(200),
    y: px(50),
    away: 1,
    by: 0,
    low: false,
    held: false,
    counter: null,
    pulse: false,
  });
  const withHaptics = (vibrate: () => void, rumble: () => void) =>
    new FightFeedback(
      {} as Phaser.Scene,
      400,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      STAGE,
      vibrate,
      rumble,
    );

  it('rumbles the gamepads and buzzes the phone hard, an Ultime only', () => {
    const vibrate = vi.fn();
    const rumble = vi.fn();
    withHaptics(vibrate, rumble).react(ko('finisher'), 0);
    expect(rumble).toHaveBeenCalledWith(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
    // Player 1 landed it: their phone buzzes all the same.
    expect(vibrate).toHaveBeenCalledWith(HAPTICS.shatter);
    rumble.mockClear();
    vibrate.mockClear();
    withHaptics(vibrate, rumble).react(ko('plain'), 0);
    withHaptics(vibrate, rumble).react(ko('combo'), 0);
    expect(rumble).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe('the veils and the shake, never a flash over the whole screen (docs/flashs.md)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ko = (finish: 'plain' | 'combo' | 'finisher'): FightEvent => ({
    type: 'ko',
    finish,
    x: px(200),
    y: px(50),
    away: -1,
    by: 0,
    low: false,
    held: false,
    counter: null,
    pulse: false,
  });

  it('veils a KO by how it fell: nothing alone, a vignette for a combo, the éclat for an Ultime', () => {
    feedback().react(ko('plain'), 0);
    expect(shown.veil).not.toHaveBeenCalled();
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.plain, -1);
    feedback().react(ko('combo'), 0);
    expect(veils()).toMatchObject([{ kind: 'vignette', color: NAYO_STYLE.energy }]);
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.combo, -1);
    shown.veil.mockClear();
    feedback().react(ko('finisher'), 0);
    expect(veils()).toMatchObject([{ kind: 'eclat', color: NAYO_STYLE.energy }]);
    // The éclat bursts from the impact, in world pixels.
    expect(shown.veil).toHaveBeenLastCalledWith(expect.anything(), { x: 200, y: 350 });
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.finisher, -1);
  });

  it("darkens the stage on the super's freeze, a platine halo behind its fighter", () => {
    const at = { by: 0, x: px(200), y: 0 } as const;
    feedback().react({ type: 'super', name: 'Mégabasse', ...at }, 0);
    expect(shown.veil).not.toHaveBeenCalled();
    feedback().react({ type: 'freeze', toward: -1, ...at }, 0);
    expect(veils()).toMatchObject([
      { kind: 'dim', color: DIM_COLOR },
      { kind: 'halo', color: HALO_COLOR },
    ]);
    expect(shown.veil).toHaveBeenLastCalledWith(expect.anything(), { x: 200, y: 360 });
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.super, -1);
  });

  it("plays a super's blows before its last smaller: their spark, a small BOUM", () => {
    const hit = blow('hit', false, true);
    feedback().react({ ...hit, pulse: true } as FightEvent, 0);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'pulse', px(200), px(50), 1);
    expect(shown.word).toHaveBeenCalledWith('pulse', expect.anything(), 0);
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.heavy, 1);
    feedback().react(hit, 0);
    expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
    expect(shown.word).toHaveBeenLastCalledWith('heavy', expect.anything(), 0);
  });
});
