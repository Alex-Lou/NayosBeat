import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import type { Comfort } from '../../src/app/comfort';
import { TickPacer } from '../../src/loop/tick-pacer';
import { LEGACY_ANIM } from '../../src/render/anim-options';
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
import { CLOSE_UP_EFFECTS } from '../../src/render/camera-framing';
import { TRAUMA } from '../../src/render/shake';
import { STAMP_TEXTS } from '../../src/render/stamps';
import type { GameState } from '../../src/core/state';
import { facingOff } from '../core/helpers';
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
  lightJolt: vi.fn(),
  scrape: vi.fn(),
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
    scrape = shown.scrape;
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
    jolt = shown.lightJolt;
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
  const comfort: Comfort = { flashes, shake: 'normal', staging: 'full' };
  const budget = new FlashBudget(flashes);
  return { width: 640, colors: GREYBOX_COLORS, budget, comfort, mode: 'full' };
}

/** Each tick's events go in, then its blows light up together. */
class Fight {
  readonly feedback: FightFeedback;
  /** The tick its next events play on. */
  private tick = 0;
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
    this.feedback.beginTick(this.tick++);
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

describe('the weight of a blow on the screen (docs/polish/AUDIT-ET-PLAN.md, P2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('jolts the picture 1 px with a light blow, shakes it with a heavy one, never both', () => {
    feedback().react(blow('hit', false));
    expect(shown.lightJolt).toHaveBeenCalledWith(1);
    expect(shown.jolt).not.toHaveBeenCalled();
    vi.clearAllMocks();
    feedback().react(blow('hit', false, true));
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.heavy, 1);
    expect(shown.lightJolt).not.toHaveBeenCalled();
  });
});

describe('the trail of a fighter pushed along the floor (P7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Riff on the floor (or `y` up), `action`, sliding at `vx` px a tick, on `frame`. */
  const sliding = (
    action: 'hitstun' | 'blockstun' | 'idle',
    vx: number,
    frame = 8,
    hitstop = 0,
    y = 0,
  ): GameState => {
    const state = facingOff(60);
    const riff = { ...state.fighters[1], action, vx: px(vx), y } as const;
    return { ...state, frame, hitstop, fighters: [state.fighters[0], riff] };
  };

  it('leaves dust behind the heels every 4 ticks while hit or guarding, 2 px a tick or faster', () => {
    const fight = feedback();
    fight.feedback.trail(sliding('hitstun', 3.5));
    expect(shown.scrape).toHaveBeenCalledWith(sliding('hitstun', 3.5).fighters[1].x, 1);
    fight.feedback.trail(sliding('blockstun', -2));
    expect(shown.scrape).toHaveBeenLastCalledWith(expect.any(Number), -1);
    expect(shown.scrape).toHaveBeenCalledTimes(2);
  });

  it('leaves none between, slower, in the air, frozen, or walking', () => {
    const fight = feedback();
    fight.feedback.trail(sliding('hitstun', 3.5, 9));
    fight.feedback.trail(sliding('hitstun', 1.75));
    fight.feedback.trail(sliding('hitstun', 3.5, 8, 0, px(10)));
    fight.feedback.trail(sliding('hitstun', 3.5, 8, 5));
    fight.feedback.trail(sliding('idle', 3.5));
    expect(shown.scrape).not.toHaveBeenCalled();
  });
});

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
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1, 1);
    expect(shown.graze).not.toHaveBeenCalled();
    expect(shown.kick).not.toHaveBeenCalled();
    expect(shown.bleed).toHaveBeenCalledOnce();
  });

  it('keeps the burst of a low KO, the final blow, with the grazing spark and no blood', () => {
    feedback().react(blow('ko', true));
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'ko', px(200), px(9), 1, 1);
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
      expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1, 1);
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

describe('a body that lands on its back (docs/art/animation-plan.md §2, V1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fall = (ko: boolean): FightEvent => ({ type: 'fall', x: px(200), away: 1, ko });
  /** The final blow, `finish` saying how. */
  const knockOut = (finish: KoFinish): FightEvent => ({
    ...(blow('ko', false) as Extract<FightEvent, { type: 'ko' }>),
    finish,
  });
  /** What the landing made seen, heard and felt. */
  const landing = () => ({
    dust: shown.kick.mock.calls.length,
    jolt: shown.jolt.mock.calls.filter(([trauma]) => trauma === TRAUMA.fall).length,
    thud: played.mock.calls.filter(([sound]) => sound === 'fall').length,
  });

  it('lands a fighter sent flying in its dust, with a thud', () => {
    new Fight().react(fall(false));
    expect(landing()).toEqual({ dust: 1, jolt: 1, thud: 1 });
  });

  it('claps a body knocked out in the air onto the floor: its ko draws the dust, once', () => {
    const fight = new Fight();
    fight.react(knockOut('plain'));
    vi.clearAllMocks();
    fight.react(fall(true));
    expect(landing()).toEqual({ dust: 0, jolt: 1, thud: 1 });
  });

  it("lands in silence after the Finisher, whose scene plays the landing, until the next round's", () => {
    const fight = new Fight();
    fight.react(knockOut('finale'));
    vi.clearAllMocks();
    fight.react(fall(true));
    expect(landing()).toEqual({ dust: 0, jolt: 0, thud: 0 });
    fight.react({ type: 'phase', phase: 'intro' });
    fight.react(knockOut('ultimate'));
    vi.clearAllMocks();
    fight.react(fall(true));
    expect(landing()).toEqual({ dust: 0, jolt: 1, thud: 1 });
  });

  it('lands in silence with the animation of before, as it did, a fighter sent flying as ever', () => {
    const fight = new Fight();
    fight.feedback.setAnimOptions(LEGACY_ANIM);
    fight.react(knockOut('plain'));
    vi.clearAllMocks();
    fight.react(fall(true));
    expect(landing()).toEqual({ dust: 0, jolt: 0, thud: 0 });
    fight.react(fall(false));
    expect(landing()).toEqual({ dust: 1, jolt: 1, thud: 1 });
  });
});

describe("the KO's slow motion, the game slowed down to watch it (docs/art/animation-plan.md §2, V0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The ticks the KO's slow motion plays, and the display frames it lasts, as FightScene plays
   * them one display frame after the other: the game paced at 1 frame of its own for `slowdown`.
   */
  function slowMotion(slowdown: number): { ticks: number; frames: number } {
    const fight = new Fight();
    fight.react(blow('ko', false));
    const pacer = new TickPacer(1, slowdown);
    let ticks = 0;
    let frames = 0;
    while (fight.feedback.timeScale() < 1) {
      const gameFrames = pacer.advance(1);
      ticks += fight.feedback.ticksFor(gameFrames);
      fight.stage.budget.advance(1);
      fight.feedback.update(1, gameFrames);
      frames += 1;
    }
    return { ticks, frames };
  }

  it('slows a slowed game as much as the game itself: its ticks, over twice or four times the frames', () => {
    // The game's own: 50 frames at 0.35 (7 ticks every 20).
    expect(slowMotion(1)).toEqual({ ticks: 17, frames: 50 });
    expect(slowMotion(2)).toEqual({ ticks: 17, frames: 100 });
    expect(slowMotion(4)).toEqual({ ticks: 17, frames: 200 });
  });

  it('plays every frame of game time a tick outside of it, and lasts 50 frames unpaced', () => {
    const fight = new Fight();
    expect(fight.feedback.ticksFor(3)).toBe(3);
    fight.react(blow('ko', false));
    fight.wait(49);
    expect(fight.feedback.timeScale()).toBe(0.35);
    fight.wait(1);
    expect(fight.feedback.timeScale()).toBe(1);
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

  it('rumbles the gamepads and buzzes the phone hard, an Ultime, or the Finisher on its landing', () => {
    const vibrate = vi.fn();
    const rumble = vi.fn();
    withHaptics(vibrate, rumble).react(ko('ultimate'));
    expect(rumble).toHaveBeenCalledWith(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
    // Player 1 landed it: their phone buzzes all the same.
    expect(vibrate).toHaveBeenCalledWith(HAPTICS.shatter);
    rumble.mockClear();
    vibrate.mockClear();
    // The Finisher's waits for its landing, which its scene plays (docs/finisher.md §1.13).
    withHaptics(vibrate, rumble).react(ko('finale'));
    expect(rumble).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
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
    // The Finisher's, nothing on its contact: its scene veils and shakes (docs/finisher.md §5.2).
    shown.veil.mockClear();
    shown.jolt.mockClear();
    feedback().react(ko('finale'));
    expect(shown.veil).not.toHaveBeenCalled();
    expect(shown.jolt).not.toHaveBeenCalled();
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
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'pulse', px(200), px(50), 1, 1);
    expect(shown.word).toHaveBeenCalledWith('pulse', expect.anything(), 0, 0, false);
    expect(shown.jolt).toHaveBeenCalledWith(TRAUMA.heavy, 1);
    feedback().react(hit);
    expect(shown.burst).toHaveBeenLastCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1, 1);
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
    fight.feedback.setComfort({ flashes: 'reduced', shake: 'reduced', staging: 'full' });
    expect(shown.shake).toHaveBeenLastCalledWith(0.5);
    fight.feedback.setComfort({ flashes: 'normal', shake: 'off', staging: 'full' });
    expect(shown.shake).toHaveBeenLastCalledWith(0);
  });
});

describe("the Finisher's blows, its scene's (docs/finisher.md §1.14, §5.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    played.mockClear();
  });

  /** A blow of player 1's super: `pulse`, before its last; its KO, the Finisher's. */
  const superBlow = (pulse: boolean): FightEvent => ({
    ...(blow('hit', false, true) as Extract<FightEvent, { type: 'hit' }>),
    tier: 3,
    pulse,
  });
  const finale: FightEvent = {
    ...(blow('ko', false) as Extract<FightEvent, { type: 'ko' }>),
    tier: 3,
    finish: 'finale',
  };
  const lock: FightEvent = {
    type: 'finisherLock',
    by: 0,
    name: 'Le Quatre',
    x: px(200),
    y: px(50),
  };

  it('plays its KO small and leaves the rest to the scene: no blood, veil, shake, slow motion nor KO sound', () => {
    const knockOut = vi.fn();
    const fight = new Fight({ ...stageOf(), knockOut });
    fight.react(lock);
    fight.react(finale);
    // The pulse's spark (the KO's first key is a flash), at × 0.725 for the close up.
    expect(shown.burst).toHaveBeenLastCalledWith(
      NAYO_STYLE,
      'pulse',
      px(200),
      px(50),
      1,
      CLOSE_UP_EFFECTS,
    );
    expect(shown.bleed).not.toHaveBeenCalled();
    expect(shown.veil).not.toHaveBeenCalled();
    expect(shown.jolt).not.toHaveBeenCalled();
    expect(played).not.toHaveBeenCalledWith('ko');
    expect(fight.feedback.timeScale()).toBe(1);
    expect(fight.feedback.ticksFor(10)).toBe(10);
    // The HUD breaks on its landing, not now.
    expect(knockOut).not.toHaveBeenCalled();
    // With the screen kept still, the camera never closes in, and still × 0.725: that room keeps
    // the registry (TROIS's rings lit, Larsen's KO no flash; finisher-flashes.test.ts).
    const still = new Fight({
      ...stageOf(),
      comfort: { flashes: 'normal', shake: 'off', staging: 'full' },
    });
    still.react(finale);
    expect(shown.burst).toHaveBeenLastCalledWith(
      NAYO_STYLE,
      'pulse',
      px(200),
      px(50),
      1,
      CLOSE_UP_EFFECTS,
    );
  });

  it('leaves the last blow on the training dummy, kept at 1 HP, to the scene: no heavy sound nor shake of its own (§1.12)', () => {
    const fight = new Fight();
    fight.react(superBlow(true), lock);
    // UN: its own heavy sound and shake, as in a match.
    expect(played).toHaveBeenLastCalledWith('heavyHit');
    expect(shown.jolt).toHaveBeenCalledTimes(1);
    played.mockClear();
    shown.jolt.mockClear();
    // The last blow, a hit on the dummy: the scene sounds it and shakes it (finisherShake).
    fight.react(superBlow(false));
    expect(played).not.toHaveBeenCalled();
    expect(shown.jolt).not.toHaveBeenCalled();
    expect(shown.burst).toHaveBeenLastCalledWith(
      NAYO_STYLE,
      'pulse',
      px(200),
      px(50),
      1,
      CLOSE_UP_EFFECTS,
    );
  });

  it('counts the lock’s blows in the scene’s stamps, not in words, until the next super', () => {
    const fight = new Fight();
    fight.react(superBlow(true), lock);
    fight.react(superBlow(true));
    expect(shown.word).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
    expect(shown.burst).toHaveBeenLastCalledWith(
      NAYO_STYLE,
      'pulse',
      px(200),
      px(50),
      1,
      CLOSE_UP_EFFECTS,
    );
    // A new super is a new sequence: its blows are its own again.
    fight.react({ type: 'super', by: 0, name: 'Mégabasse', x: px(200), y: 0 });
    fight.react(superBlow(true));
    expect(shown.word).toHaveBeenCalledWith('pulse', expect.anything(), 0, 0, false);
  });

  it('lands it: its one éclat with the gauges breaking, a climax, the HUD broken, the phones', () => {
    const knockOut = vi.fn();
    const vibrate = vi.fn();
    const rumble = vi.fn();
    const stage = { ...stageOf(), knockOut };
    const feedback = new FightFeedback(
      {} as Phaser.Scene,
      400,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      stage,
      vibrate,
      rumble,
    );
    feedback.finisherLanding(0, px(240), 1, CLOSE_UP_EFFECTS, { quiet: false, dust: true });
    expect(veils()).toMatchObject([{ kind: 'eclat', color: NAYO_STYLE.energy }]);
    expect(shown.veil).toHaveBeenLastCalledWith(
      expect.anything(),
      { x: 240, y: 400 },
      CLOSE_UP_EFFECTS,
    );
    expect(knockOut).toHaveBeenLastCalledWith(1, 'finale', false);
    expect(shown.kick).toHaveBeenCalledWith(px(240), 1);
    expect(vibrate).toHaveBeenCalledWith(HAPTICS.shatter);
    expect(rumble).toHaveBeenCalledWith(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
    // Skipped past: the HUD breaks still, nothing else.
    vi.clearAllMocks();
    feedback.finisherLanding(0, px(240), 1, CLOSE_UP_EFFECTS, { quiet: true, dust: true });
    expect(knockOut).toHaveBeenLastCalledWith(1, 'finale', true);
    expect(shown.veil).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    // The flashes off: no éclat at all (§4.5).
    const off = new FightFeedback({} as Phaser.Scene, 400, SILENT, [NAYO_STYLE, NAYO_STYLE], {
      ...stageOf('off'),
      knockOut,
    });
    off.finisherLanding(0, px(240), 1, 1, { quiet: false, dust: false });
    expect(shown.veil).not.toHaveBeenCalled();
    expect(shown.kick).not.toHaveBeenCalled();
  });

  it('asks the budget for the éclat at × 0.725 as a climax: it takes the last slot of the second', () => {
    const stage = stageOf();
    const feedback = new FightFeedback(
      {} as Phaser.Scene,
      400,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      stage,
    );
    // Two ordinary flashes in this second already.
    expect(stage.budget.request(5000)).toBe('lit');
    stage.budget.advance(30);
    expect(stage.budget.request(5000)).toBe('lit');
    stage.budget.advance(30 - 1);
    feedback.finisherLanding(0, px(240), 1, CLOSE_UP_EFFECTS, { quiet: false, dust: false });
    expect(veils()).toMatchObject([{ kind: 'eclat', color: NAYO_STYLE.energy }]);
  });
});
