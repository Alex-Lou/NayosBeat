import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import type { Comfort } from '../../src/app/comfort';
import { FightFeedback, MUTED_DELAY, type FeedbackStage } from '../../src/render/fight-feedback';
import {
  HAPTICS,
  SHATTER_RUMBLE,
  type FightEvent,
  type KoFinish,
} from '../../src/render/fight-events';
import { FlashBudget, PLACE_STEP, type FlashMode } from '../../src/render/flash-budget';
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
  shake: vi.fn(),
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
    setShake = shown.shake;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/stamps', async (original) => ({
  ...(await original<typeof import('../../src/render/stamps')>()),
  Stamps: class {
    show = shown.stamp;
    update = vi.fn();
    settle = vi.fn();
  },
}));
vi.mock('../../src/render/onomatopoeia', async (original) => ({
  ...(await original<typeof import('../../src/render/onomatopoeia')>()),
  Onomatopoeia: class {
    blow = shown.word;
    countOf = () => 1;
    beginTick = vi.fn();
    reset = vi.fn();
    update = vi.fn();
    settle = vi.fn();
  },
}));

const NAYO_STYLE = hitStyleOf('nayo');
/** The sounds asked for. */
const played = vi.fn();
const SILENT = { play: played } as unknown as Sfx;

/** The fight of a test, the flashes in `flashes`, its own budget at the closest framing. */
function stageOf(flashes: FlashMode = 'normal'): FeedbackStage {
  const comfort: Comfort = { flashes, shake: 'normal' };
  const budget = new FlashBudget(flashes);
  return { width: 640, colors: GREYBOX_COLORS, budget, comfort };
}

/** Each tick's events go in, then its blows light up together. */
class Fight {
  readonly feedback: FightFeedback;
  constructor(readonly stage: FeedbackStage = stageOf()) {
    this.feedback = new FightFeedback(
      {} as Phaser.Scene,
      400,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      stage,
    );
  }

  react(...events: FightEvent[]): void {
    this.feedback.beginTick();
    for (const event of events) this.feedback.react(event, 0);
    this.feedback.endTick();
  }

  /** `frames` of the visual clock go by. */
  wait(frames: number): void {
    this.stage.budget.advance(frames);
    this.feedback.update(frames);
  }
}

function feedback(): Fight {
  return new Fight();
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
    damage: 25,
    held: false,
    counter: null,
    tier: 1,
    pulse: false,
  } as const;
  return type === 'hit' ? { type, heavy, ...impact } : { type, finish: 'plain', ...impact };
}

describe('the spark of a blow (docs/combat-v2.md §9.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skims the floor on a low hit: grazing spark and dust, no burst, no blood', () => {
    feedback().react(blow('hit', true));
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'light', px(200), px(9), 1);
    expect(shown.kick).toHaveBeenCalledWith(px(200), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('throws the heavy grazing spark on a sweep, still without the burst', () => {
    feedback().react(blow('hit', true, true));
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(9), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('bursts on a hit higher up, without the grazing spark', () => {
    feedback().react(blow('hit', false, true));
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
    expect(shown.graze).not.toHaveBeenCalled();
    expect(shown.kick).not.toHaveBeenCalled();
    expect(shown.bleed).toHaveBeenCalledOnce();
  });

  it('keeps the burst of a low KO, the final blow, with the grazing spark and no blood', () => {
    feedback().react(blow('ko', true));
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
        tier: 1,
        pulse: false,
      };
      feedback().react(hit);
      expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
      expect(shown.stamp).toHaveBeenLastCalledWith(STAMP_TEXTS[counter], hit, 0, 0, false);
    }
  });

  it('stamps nothing on a plain hit', () => {
    feedback().react(blow('hit', false));
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
    feedback().react({ type: 'boost', ...at });
    expect(shown.stamp).toHaveBeenCalledWith('REMIX !', overHead, 0, 0, false);
    expect(played).toHaveBeenCalledWith('remix');
  });

  it('stamps the Rewind and the super by their names', () => {
    feedback().react({ type: 'rewind', name: 'Pogo', toward: 1, ...at });
    expect(shown.stamp).toHaveBeenLastCalledWith('POGO !', overHead, 0, 0, false);
    expect(played).toHaveBeenLastCalledWith('rewind');
    feedback().react({ type: 'super', name: 'Mégabasse', ...at });
    expect(shown.stamp).toHaveBeenLastCalledWith('MÉGABASSE !', overHead, 0, 0, false);
    expect(played).toHaveBeenLastCalledWith('super');
  });
});

describe('a KO that blows a Boost gauge up (docs/combos-v3.md §1.8.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** The final blow, landed by player 1, `finish` saying how. */
  const ko = (finish: KoFinish): FightEvent => ({
    type: 'ko',
    finish,
    x: px(200),
    y: px(50),
    away: 1,
    by: 0,
    low: false,
    damage: 120,
    held: false,
    counter: null,
    tier: 3,
    pulse: false,
  });
  const withHaptics = (vibrate: () => void, rumble: () => void) => {
    const haptic = new FightFeedback(
      {} as Phaser.Scene,
      400,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      stageOf(),
      vibrate,
      rumble,
    );
    return {
      react: (event: FightEvent) => {
        haptic.react(event, 0);
        haptic.endTick();
      },
    };
  };

  it('rumbles the gamepads and buzzes the phone hard, an Ultime or a Finisher only', () => {
    const vibrate = vi.fn();
    const rumble = vi.fn();
    // The Finisher's KO plays as an Ultime's until its scene comes (docs/finisher.md §5.10).
    for (const finish of ['ultimate', 'finale'] as const) {
      withHaptics(vibrate, rumble).react(ko(finish));
      expect(rumble, finish).toHaveBeenCalledWith(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
      // Player 1 landed it: their phone buzzes all the same.
      expect(vibrate, finish).toHaveBeenCalledWith(HAPTICS.shatter);
      rumble.mockClear();
      vibrate.mockClear();
    }
    withHaptics(vibrate, rumble).react(ko('plain'));
    withHaptics(vibrate, rumble).react(ko('combo'));
    expect(rumble).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe('the veils and the shake, never a flash over the whole screen (docs/flashs.md)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ko = (finish: KoFinish): FightEvent => ({
    type: 'ko',
    finish,
    x: px(200),
    y: px(50),
    away: -1,
    by: 0,
    low: false,
    damage: 120,
    held: false,
    counter: null,
    tier: 3,
    pulse: false,
  });

  it('veils a KO by how it fell: nothing alone, a vignette for a combo, the éclat for an Ultime', () => {
    feedback().react(ko('plain'));
    expect(shown.veil).not.toHaveBeenCalled();
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.plain, -1);
    feedback().react(ko('combo'));
    expect(veils()).toMatchObject([{ kind: 'vignette', color: NAYO_STYLE.energy }]);
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.combo, -1);
    shown.veil.mockClear();
    feedback().react(ko('ultimate'));
    expect(veils()).toMatchObject([{ kind: 'eclat', color: NAYO_STYLE.energy }]);
    // The éclat bursts from the impact, in world pixels.
    expect(shown.veil).toHaveBeenLastCalledWith(expect.anything(), { x: 200, y: 350 });
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.ultimate, -1);
    // The Finisher's, as an Ultime's until its scene comes (docs/finisher.md §5.10).
    shown.veil.mockClear();
    feedback().react(ko('finale'));
    expect(veils()).toMatchObject([{ kind: 'eclat', color: NAYO_STYLE.energy }]);
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.ko.finale, -1);
  });

  it("darkens the stage on the super's freeze, a platine halo behind its fighter", () => {
    const at = { by: 0, x: px(200), y: 0 } as const;
    feedback().react({ type: 'super', name: 'Mégabasse', ...at });
    expect(shown.veil).not.toHaveBeenCalled();
    feedback().react({ type: 'freeze', toward: -1, ...at });
    expect(veils()).toMatchObject([
      { kind: 'dim', color: DIM_COLOR },
      { kind: 'halo', color: HALO_COLOR },
    ]);
    expect(shown.veil).toHaveBeenLastCalledWith(expect.anything(), { x: 200, y: 360 });
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.super, -1);
  });

  it("plays a super's blows before its last smaller: their spark, a small BOUM", () => {
    const hit = blow('hit', false, true);
    feedback().react({ ...hit, pulse: true } as FightEvent);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'pulse', px(200), px(50), 1);
    expect(shown.word).toHaveBeenCalledWith('pulse', expect.anything(), 0, 0, false);
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.heavy, 1);
    feedback().react(hit);
    expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
    expect(shown.word).toHaveBeenLastCalledWith('heavy', expect.anything(), 0, 0, false);
  });
});

describe('the flash budget, asked once a tick (docs/flashs.md §4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const heavy = (by: 0 | 1, counter: 'counter' | null = null): FightEvent => {
    const hit = blow('hit', false, true) as Extract<FightEvent, { type: 'hit' }>;
    return { ...hit, by, counter };
  };
  const ko = (by: 0 | 1, finish: 'plain' | 'ultimate' = 'plain'): FightEvent => {
    const final = blow('ko', false) as Extract<FightEvent, { type: 'ko' }>;
    return { ...final, by, finish };
  };
  /** The kinds of spark played, in order. */
  const sparks = () => shown.burst.mock.calls.map(([, kind]) => kind as string);

  it('lights a trade up together, then mutes a blow too soon after: its word and stamp later', () => {
    const fight = new Fight();
    fight.react(heavy(0), heavy(1));
    expect(sparks()).toEqual(['heavy', 'heavy']);
    expect(shown.word).toHaveBeenLastCalledWith('heavy', expect.anything(), 0, 0, false);
    fight.wait(10);
    fight.react(heavy(0, 'counter'));
    expect(sparks()).toEqual(['heavy', 'heavy', 'pulse']);
    // Calm, a moment later: the word, then the stamp after it.
    expect(shown.word).toHaveBeenLastCalledWith(
      'heavy',
      expect.anything(),
      0,
      MUTED_DELAY.word,
      true,
    );
    expect(shown.stamp).toHaveBeenLastCalledWith(
      'CONTRE !',
      expect.anything(),
      0,
      MUTED_DELAY.stamp,
      true,
    );
    // The blow itself is felt the same: the shake, the sound.
    expect(shown.jolt).toHaveBeenLastCalledWith(TRAUMA.heavy, 1);
    expect(played).toHaveBeenLastCalledWith('heavyHit');
  });

  it('keeps the last slot of a second for a KO', () => {
    const fight = new Fight();
    fight.react(heavy(0));
    fight.wait(21);
    fight.react(heavy(0));
    fight.wait(21);
    fight.react(heavy(0));
    fight.react(ko(0));
    expect(sparks()).toEqual(['heavy', 'heavy', 'pulse', 'ko']);
  });

  it('drops a muted spark that would still flash with the others: a double KO, all spent', () => {
    const fight = new Fight(stageOf('reduced'));
    fight.stage.budget.request(5000, true);
    fight.wait(3);
    fight.stage.budget.request(5000, true);
    fight.wait(3);
    fight.react(ko(0), ko(1));
    expect(sparks()).toEqual(['koMuted']);
    // Both still fall: the words, the shake, the slow motion.
    expect(shown.word).toHaveBeenCalledTimes(2);
    expect(fight.feedback.timeScale()).toBeLessThan(1);
  });

  it('plays every blow muted with the flashes off, the éclat in ink', () => {
    const fight = new Fight(stageOf('off'));
    fight.react(heavy(0));
    fight.wait(60);
    fight.react(ko(0));
    expect(sparks()).toEqual(['pulse', 'koMuted']);
    fight.wait(60);
    fight.react(ko(0, 'ultimate'));
    expect(veils()).toMatchObject([{ kind: 'eclat', color: DIM_COLOR }]);
    // An Ultime's: the gauges it blows up on the HUD leave no room for its spark.
    expect(sparks()).toEqual(['pulse', 'koMuted']);
  });

  it('places the words and stamps of the muted blows of a tick one after the other', () => {
    const fight = new Fight(stageOf('off'));
    fight.react(heavy(0, 'counter'), heavy(1, 'counter'));
    const delays = (mock: typeof shown.word) => mock.mock.calls.map((call) => call[3] as number);
    expect(delays(shown.word)).toEqual([MUTED_DELAY.word, MUTED_DELAY.word + PLACE_STEP]);
    expect(delays(shown.stamp)).toEqual([MUTED_DELAY.stamp, MUTED_DELAY.stamp + PLACE_STEP]);
  });

  it('tells the HUD how a fighter fell: its gauges break still when no room is left', () => {
    const knockOut = vi.fn();
    const fight = new Fight({ ...stageOf('off'), knockOut });
    fight.react(ko(0, 'ultimate'));
    expect(knockOut).toHaveBeenLastCalledWith(1, 'ultimate', false);
    fight.wait(60);
    // What already lights there (another piece that waited) leaves no room for the shards.
    fight.stage.budget.show(400);
    fight.react(ko(1, 'ultimate'));
    expect(knockOut).toHaveBeenLastCalledWith(0, 'ultimate', true);
  });

  it('asks for the stamps that are no blow, and for a guard spark: refused, calm, or none', () => {
    const at = { by: 0, x: px(200), y: 0 } as const;
    const fight = new Fight();
    fight.stage.budget.request(5000);
    fight.wait(3);
    fight.react({ type: 'boost', ...at });
    // Too soon after a flash: calm, at once, since that makes none.
    expect(shown.stamp).toHaveBeenLastCalledWith('REMIX !', expect.anything(), 0, 0, true);
    const spent = new Fight(stageOf('off'));
    spent.stage.budget.show(450);
    spent.react({ type: 'block', away: 1, low: false, ...at });
    expect(shown.burst).not.toHaveBeenCalled();
    spent.wait(3);
    spent.react({ type: 'block', away: 1, low: false, ...at });
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'block', px(200), 0, 1);
  });

  it("lets the super's halo flash with the flashes normal, if the budget lets it", () => {
    const at = { by: 0, x: px(200), y: 0 } as const;
    // Nayo's super freezes on its first frame: its stamp and its halo light up together.
    const superAndFreeze: FightEvent[] = [
      { type: 'super', name: 'Mégabasse', ...at },
      { type: 'freeze', toward: 1, ...at },
    ];
    const kinds = () => veils().map(({ kind }) => kind);
    new Fight().react(...superAndFreeze);
    expect(kinds()).toEqual(['dim', 'halo']);
    shown.veil.mockClear();
    new Fight(stageOf('reduced')).react(...superAndFreeze);
    expect(kinds()).toEqual(['dim']);
    shown.veil.mockClear();
    const spent = new Fight();
    spent.stage.budget.request(5000);
    spent.wait(3);
    spent.react(...superAndFreeze);
    expect(kinds()).toEqual(['dim']);
  });

  it('applies the options at once: the shake', () => {
    const fight = new Fight();
    expect(shown.shake).toHaveBeenLastCalledWith(1);
    fight.feedback.setComfort({ flashes: 'reduced', shake: 'reduced' });
    expect(shown.shake).toHaveBeenLastCalledWith(0.5);
    fight.feedback.setComfort({ flashes: 'normal', shake: 'off' });
    expect(shown.shake).toHaveBeenLastCalledWith(0);
  });
});
