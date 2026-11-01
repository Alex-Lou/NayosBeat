import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { finisherState } from '../../src/core/finisher';
import {
  createInitialState,
  FLAG_DANGER,
  FLAG_FINISHER,
  FLAG_MOVE_HIT,
  type GameState,
  type RoundState,
} from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import {
  BLOCKED_ALPHA,
  BOOST_WORD,
  FINISH_PLATE_AREA,
  FINISH_WORD,
  GAUGE_WIDTH,
  LIGHTS_AT,
  MAX_WORD,
  WORD_WIDTH,
} from '../../src/render/boost-gauge';
import type { KoFinish } from '../../src/render/fight-events';
import {
  FinisherSignal,
  finisherSignalOf,
  SIGNAL_FADE_TICKS,
} from '../../src/render/finisher-signal';
import {
  FLASH_MARGIN,
  FLASH_MERGE,
  FLASH_RULES,
  FlashBudget,
  type FlashMode,
} from '../../src/render/flash-budget';
import { Hud, HUD_MARGIN } from '../../src/render/hud';
import { DISC_SIZE } from '../../src/render/hud-discs';
import { FX_DARK } from '../../src/render/veils';
import { VIEW_SIZE } from '../../src/render/view';
import { armedStart } from '../core/finisher-helpers';
import { fakeScene, type FakeText } from './hud-fakes';

const CONFIG: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const DARK = `#${FX_DARK.toString(16)}`;

/** The HUD of a fight whose flashes are `mode`, at the closest framing, and what it draws. */
function hudOf(mode: FlashMode) {
  const { scene, graphics, texts } = fakeScene();
  const budget = new FlashBudget(mode);
  const comfort = { flashes: mode === 'normal', motion: true };
  const hud = new Hud(scene, CONFIG, [0x30e8ff, 0xff3ca0], comfort, budget);
  return { hud, budget, graphics, texts };
}

/** The fight on tick `frame`, its round `round`, the fighters' health `health`. */
function stateAt(frame: number, round: Partial<RoundState>, health = [1000, 1000]): GameState {
  const start = createInitialState(CONFIG);
  const [a, b] = start.fighters;
  return {
    ...start,
    frame,
    round: { ...start.round, phase: 'fight', ...round },
    fighters: [
      { ...a, health: health[0] ?? 0 },
      { ...b, health: health[1] ?? 0 },
    ],
  };
}

const KO: Partial<RoundState> = { phase: 'roundEnd', result: { winner: 0, reason: 'ko' } };

describe('the HUD asks the flash budget for what it lights (docs/flashs.md §4)', () => {
  it('writes an announcement white when it makes no flash, dark when the budget refuses it', () => {
    const lit = hudOf('normal');
    lit.hud.update(stateAt(1, KO));
    const white = lit.texts.find((text) => text.text === 'K.O.');
    expect(white?.style.color).toBe('#ffffff');
    // With the flashes off, its white letters would flash on their own: dark.
    const off = hudOf('off');
    off.hud.update(stateAt(1, KO));
    expect(off.texts.find((text) => text.text === 'K.O.')?.style.color).toBe(DARK);
    // Back to white for the next one the budget lets light.
    const reduced = hudOf('reduced');
    reduced.hud.update(stateAt(1, { phase: 'intro', phaseFrame: 0 }));
    expect(reduced.texts.find((text) => text.text === 'ROUND 1')?.style.color).toBe('#ffffff');
    reduced.budget.advance(10);
    reduced.hud.update(stateAt(2, KO));
    expect(reduced.texts.find((text) => text.text === 'K.O.')?.style.color).toBe(DARK);
  });

  it('lights the white of a hit on a bar only when the budget lets it', () => {
    const white = (mode: FlashMode, spent: boolean) => {
      const { hud, budget, graphics } = hudOf(mode);
      for (let frame = 0; frame <= 60; frame++) hud.update(stateAt(frame, {}));
      if (spent) {
        // A flash just counted, and something lit that the blow's white would add up with.
        budget.request(5000);
        budget.advance(3);
        budget.show(1000);
      }
      hud.update(stateAt(61, {}, [500, 1000]));
      return graphics.some((view) => view.spans.some((span) => span.color === 0xffffff));
    };
    expect(white('normal', false)).toBe(true);
    expect(white('normal', true)).toBe(false);
    expect(white('reduced', false)).toBe(false);
  });

  it('breaks the gauges of a fighter still when the feedback says no room is left', () => {
    /** How many more see-through spans (the shards, fading) the HUD shows after the KO. */
    const shards = (still: boolean, finish: KoFinish = 'ultimate') => {
      const { hud, graphics } = hudOf('off');
      const faded = () =>
        graphics.reduce(
          (count, view) => count + view.spans.filter((span) => (span.alpha ?? 1) < 1).length,
          0,
        );
      for (let frame = 0; frame <= 60; frame++) hud.update(stateAt(frame, {}, [1000, 100]));
      const before = faded();
      hud.knockOut(1, finish, still);
      hud.update(stateAt(61, KO, [1000, 0]));
      hud.update(stateAt(63, KO, [1000, 0]));
      return faded() - before;
    };
    expect(shards(false)).toBeGreaterThan(40);
    expect(shards(true)).toBe(0);
    // The Finisher's KO shatters it too, as an Ultime's until its scene (docs/finisher.md §5.10).
    expect(shards(false, 'finale')).toBe(shards(false));
  });
});

describe("the training dummy's breakage (docs/finisher.md §1.12, test 16)", () => {
  const TRAINING: MatchConfig = { ...CONFIG, training: true };

  /**
   * What the HUD paints on each frame of a training session where the dummy is down to its 1 HP
   * floor from frame 60 and refills at frame 200, the Finisher's landing on frame 61 (`landed`).
   */
  function paints(landed: boolean): string[] {
    const { scene, graphics } = fakeScene();
    const hud = new Hud(
      scene,
      TRAINING,
      [0x30e8ff, 0xff3ca0],
      { flashes: true, motion: false },
      new FlashBudget('normal'),
    );
    const shots: string[] = [];
    for (let frame = 0; frame <= 260; frame++) {
      const health = frame < 60 ? 900 : frame < 200 ? 1 : 900;
      if (landed && frame === 61) hud.knockOut(1, 'finale', true);
      hud.update(stateAt(frame, {}, [1000, health]));
      shots.push(JSON.stringify(graphics.map((view) => view.spans)));
    }
    return shots;
  }

  it('stays broken, kept at 1 HP, until it refills, then comes back whole', () => {
    const plain = paints(false);
    const broken = paints(true);
    // Regression: the HUD repaired it at once, its health above 0.
    expect(broken[120]).not.toBe(plain[120]);
    expect(broken[199]).not.toBe(plain[199]);
    expect(broken[260]).toBe(plain[260]);
  });
});

describe('the FINISH plate on the HUD (docs/finisher.md §1.2, §5.8 test 12)', () => {
  /** The future track of the Crossfader, under the timer's disc (docs/finisher.md §1.2). */
  const CROSSFADER = { from: 192, to: 288 };

  /** Both gauges' words, left then right, as the HUD makes them (BOOST before any update). */
  function wordsOf(texts: readonly FakeText[]): [FakeText, FakeText] {
    const [left, right] = texts.filter((text) => text.text === BOOST_WORD);
    if (!left || !right) throw new Error('The HUD writes BOOST under each name');
    return [left, right];
  }

  /** Plays `state` from tick `from` for `frames` frames, as FightScene does, its signal read each. */
  function play(
    run: ReturnType<typeof hudOf>,
    signal: FinisherSignal,
    state: GameState,
    from: number,
    frames: number,
  ): void {
    for (let frame = from; frame < from + frames; frame++) {
      run.budget.advance(1);
      const shown = { ...state, frame };
      signal.update(shown);
      run.hud.update(shown, signal.states);
    }
  }

  it('touches neither the timer disc nor the Crossfader track, 38 px from the disc', () => {
    const [left, right] = wordsOf(hudOf('normal').texts);
    expect([left.originX, right.originX]).toEqual([0, 1]);
    // Each gauge, from its outer end to the end of its word, FINISH at its longest.
    const gauges = [
      { from: HUD_MARGIN, to: left.x + WORD_WIDTH },
      { from: right.x - WORD_WIDTH, to: VIEW_SIZE.width - HUD_MARGIN },
    ];
    expect(gauges).toEqual([
      { from: 8, to: 182 },
      { from: 298, to: 472 },
    ]);
    for (const gauge of gauges) expect(gauge.to - gauge.from).toBe(GAUGE_WIDTH);
    const disc = { from: (VIEW_SIZE.width - DISC_SIZE) / 2, to: (VIEW_SIZE.width + DISC_SIZE) / 2 };
    expect(disc.from).toBe(220);
    for (const gauge of gauges) {
      for (const other of [disc, CROSSFADER]) {
        expect(gauge.to <= other.from || gauge.from >= other.to).toBe(true);
      }
    }
    expect([disc.from - (gauges[0]?.to ?? 0), (gauges[1]?.from ?? 0) - disc.to]).toEqual([38, 38]);
  });

  it("follows the predicate's state, for either player: ready, blocked, off", () => {
    const states = {
      ready: armedStart(CONFIG, 0, { distance: 60 }),
      // Every light but the room: 11 blows in, the Mégabasse's 3 would pass the limit of 12.
      blocked: armedStart(CONFIG, 0, {
        distance: 60,
        victim: { comboCount: 11, flags: FLAG_DANGER },
      }),
      off: armedStart(CONFIG, 0, { distance: 60, wins: [0, 0] }),
    } as const;
    for (const [expected, state] of Object.entries(states)) {
      expect(finisherState(state, 0, CONFIG), expected).toBe(expected);
    }
    const run = hudOf('normal');
    const [left, right] = wordsOf(run.texts);
    const signal = new FinisherSignal(CONFIG, () => undefined);
    play(run, signal, states.off, 0, 80);
    expect(left.text).toBe(MAX_WORD);
    play(run, signal, states.ready, 80, 80);
    expect([left.text, left.alpha, left.style.stroke]).toEqual([FINISH_WORD, 1, '#30e8ff']);
    play(run, signal, states.blocked, 160, 80);
    expect([left.text, left.alpha]).toEqual([FINISH_WORD, BLOCKED_ALPHA]);
    play(run, signal, states.off, 240, 10);
    expect(left.text).toBe(MAX_WORD);
    // Riff's gauge, empty, never showed a signal.
    expect(right.text).toBe(BOOST_WORD);
    // Player 2 armed: the right gauge's plate.
    const mirrored = armedStart(CONFIG, 1, { distance: 60 });
    expect(finisherState(mirrored, 1, CONFIG)).toBe('ready');
    play(run, signal, mirrored, 250, 80);
    expect([right.text, right.alpha, right.style.stroke]).toEqual([FINISH_WORD, 1, '#ff3ca0']);
    expect(left.text).toBe(BOOST_WORD);
  });

  it('shows no signal between rounds, though the lights stay on', () => {
    const ready = armedStart(CONFIG, 0, { distance: 60 });
    const over: GameState = { ...ready, round: { ...ready.round, ...KO } };
    expect(finisherState(over, 0, CONFIG)).toBe('ready');
    expect(finisherSignalOf(over, 0, CONFIG)).toBe('off');
    const run = hudOf('normal');
    const [left] = wordsOf(run.texts);
    play(run, new FinisherSignal(CONFIG, () => undefined), over, 0, 80);
    expect(left.text).not.toBe(FINISH_WORD);
  });

  it('lights the plate when the flash budget has room for it only', () => {
    const run = hudOf('reduced');
    const [left] = wordsOf(run.texts);
    const signal = new FinisherSignal(CONFIG, () => undefined);
    play(run, signal, armedStart(CONFIG, 0, { distance: 60, wins: [0, 0] }), 0, 80);
    const ready = armedStart(CONFIG, 0, { distance: 60 });
    // MAX fades out; on the frame FINISH would start to light, something lit just now, which
    // the plate would add up with into a flash: it waits, unseen.
    play(run, signal, ready, 80, LIGHTS_AT);
    const frame = 80 + LIGHTS_AT;
    run.budget.advance(1);
    run.budget.show(
      run.budget.toWorld(FLASH_RULES.reduced.area * FLASH_MARGIN - FINISH_PLATE_AREA),
    );
    signal.update({ ...ready, frame });
    run.hud.update({ ...ready, frame }, signal.states);
    expect([left.text, left.alpha]).toEqual([FINISH_WORD, 0]);
    play(run, signal, ready, frame + 1, 20);
    expect([left.text, left.alpha]).toEqual([FINISH_WORD, 1]);
  });

  it('keeps the plate counted on the frames FINISH lights on, not the frame the signal turns', () => {
    // A piece of the fight that fits alone, not with the plate (a muted spray at the closest
    // framing), asked as FightScene asks the fight's effects: before the HUD, on each frame from
    // the one the signal turns on.
    const piece = FLASH_RULES.reduced.area * FLASH_MARGIN - FINISH_PLATE_AREA / 2;
    const ready = armedStart(CONFIG, 0, { distance: 60 });
    const fits = Array.from({ length: SIGNAL_FADE_TICKS + 3 }, (_, age) => {
      const run = hudOf('reduced');
      const [left] = wordsOf(run.texts);
      const signal = new FinisherSignal(CONFIG, () => undefined);
      play(run, signal, armedStart(CONFIG, 0, { distance: 60, wins: [0, 0] }), 0, 80);
      play(run, signal, ready, 80, age);
      const shown = { ...ready, frame: 80 + age };
      run.budget.advance(1);
      const room = run.budget.fits(run.budget.toWorld(piece));
      signal.update(shown);
      run.hud.update(shown, signal.states);
      // Whatever the budget says, the plate settles on FINISH.
      play(run, signal, ready, 81 + age, 20);
      expect(left.text).toBe(FINISH_WORD);
      return room;
    });
    // MAX fading out lights nothing: room, so nothing is muted for it. FINISH lighting up, the
    // FLASH_MERGE frames after LIGHTS_AT: no room, the two would add up into a flash the budget
    // did not count. (On LIGHTS_AT the piece, asked first, would light, and the plate wait.)
    fits.forEach((room, age) => {
      const lighting = age > LIGHTS_AT && age <= LIGHTS_AT + FLASH_MERGE;
      expect(room, `${age} frames in`).toBe(!lighting);
    });
  });
});

describe('the advantage in training (docs/polish/AUDIT-ET-PLAN.md, P19)', () => {
  /** The HUD of a training session, and its texts. */
  function trainingHud() {
    const { scene, texts } = fakeScene();
    const comfort = { flashes: true, motion: true };
    const hud = new Hud(
      scene,
      { ...CONFIG, training: true },
      [0x30e8ff, 0xff3ca0],
      comfort,
      new FlashBudget('normal'),
    );
    return { hud, texts };
  }

  it('writes the last exchange, its sign in words, green ahead and orange behind', () => {
    const { hud, texts } = trainingHud();
    hud.showAdvantage(-23);
    const behind = texts.find((text) => text.text === 'Avantage : -23');
    expect(behind?.style.color).toBe('#ffa04a');
    hud.showAdvantage(2);
    const ahead = texts.find((text) => text.text === 'Avantage : +2');
    expect(ahead?.style.color).toBe('#7bea8a');
  });

  it('keeps it until the next exchange, and says nothing before the first', () => {
    const { hud, texts } = trainingHud();
    hud.showAdvantage(null);
    expect(texts.some((text) => text.text.startsWith('Avantage'))).toBe(false);
    hud.showAdvantage(-5);
    hud.showAdvantage(null);
    expect(texts.some((text) => text.text === 'Avantage : -5')).toBe(true);
  });

  it('shows nothing out of training', () => {
    const { hud, texts } = hudOf('normal');
    hud.showAdvantage(-23);
    expect(texts.some((text) => text.text.startsWith('Avantage'))).toBe(false);
  });
});

describe("the Finisher's KO on the HUD (docs/finisher.md §1.14)", () => {
  /** A KO by player 1's locked super: it still plays it, the victim knocked out. */
  const locked = (frame: number, phase: 'roundEnd' | 'intro' = 'roundEnd'): GameState => {
    const state = stateAt(frame, { ...KO, phase }, [1000, 0]);
    const [a, b] = state.fighters;
    return {
      ...state,
      fighters: [
        { ...a, action: 'attack', move: 'super', flags: FLAG_FINISHER | FLAG_MOVE_HIT },
        { ...b, action: 'ko' },
      ],
    };
  };

  it('announces no K.O.: its card does, through the round end, the lock over or not', () => {
    const { hud, texts } = hudOf('normal');
    hud.update(locked(1));
    expect(texts.some((text) => text.text === 'K.O.')).toBe(false);
    // Once the winner is out of its super, still nothing: the KO was the Finisher's.
    hud.update(stateAt(2, KO, [1000, 0]));
    expect(texts.some((text) => text.text === 'K.O.')).toBe(false);
    // The next round announces as ever.
    hud.update(stateAt(3, { phase: 'intro', phaseFrame: 0, number: 2 }));
    hud.update(stateAt(4, KO, [1000, 0]));
    expect(texts.some((text) => text.text === 'K.O.')).toBe(true);
  });

  it('announces the K.O. of an Ultime, the super unlocked', () => {
    const { hud, texts } = hudOf('normal');
    hud.update(stateAt(1, KO, [1000, 0]));
    expect(texts.some((text) => text.text === 'K.O.')).toBe(true);
  });
});
