import { describe, expect, it } from 'vitest';
import { matchConfigOf, DEFAULT_SETUP } from '../../src/app/match-setup';
import type { MatchConfig, TrainingFinisher } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { finisherLocked, finisherState } from '../../src/core/finisher';
import { Input } from '../../src/core/input';
import { BOOST_MAX } from '../../src/core/rules';
import {
  createInitialState,
  FLAG_DANGER,
  FLAG_LIMIT,
  type FighterState,
  type GameState,
} from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import { comboText } from '../../src/render/hud-text';
import { VIEW_SIZE } from '../../src/render/view';
import {
  lightsNote,
  NO_COMBO,
  noteText,
  trackCombo,
  type ComboLine,
  type FinisherNote,
} from '../../src/render/training-combo';
import { playCombo, type ComboRun } from '../core/combo-helpers';
import { fightState } from '../core/helpers';
import { NOTES } from './finisher-notes';

/**
 * The Finisher in training (docs/finisher.md §1.12, §5.8 test 16), on the real core: the dummy
 * kept at 1 HP, the last blow's event, and the « Combo » line, which says the Finisher, or why
 * not, in 480 px at most, with the plain super's damage when it is « toujours prêt ». The short
 * scene in training is played by tests/render/finisher-scene.test.ts (« plays short in training,
 * on the dummy kept at 1 HP »).
 */

const { Light: L, Heavy: H, Left: B, Boost: X } = Input;
const NAYO_ON_RIFF = [L, L, H, H, B | X] as const;

/** Training, Nayo on Riff (or `fighters`), as the menu sets it up. */
function training(
  finisher: TrainingFinisher,
  fighters: MatchConfig['fighters'] = [NAYO, RIFF],
): MatchConfig {
  return { ...matchConfigOf({ ...DEFAULT_SETUP, mode: 'training', finisher }), fighters };
}

/** Both fighters `distance` px apart in the middle of the stage, the gauges full. */
function facing(
  config: MatchConfig,
  distance: number,
  dummy: Partial<FighterState> = {},
): GameState {
  const state = fightState(config);
  const center = config.stage.width / 2;
  const [a, b] = state.fighters;
  return {
    ...state,
    fighters: [
      { ...a, x: center - px(distance) / 2, boost: BOOST_MAX },
      { ...b, x: center + px(distance) / 2, boost: BOOST_MAX, ...dummy },
    ],
  };
}

/** The line once `run` has played from `start`, and the events of its ticks. */
function lineOf(start: GameState, run: ComboRun, config: MatchConfig) {
  let meter = NO_COMBO;
  const events: FightEvent[] = [];
  const tick: FightEvent[] = [];
  let prev = start;
  for (const state of run.states) {
    meter = trackCombo(meter, prev, state, config);
    detectEvents(prev, state, config, tick);
    events.push(...tick);
    prev = state;
  }
  return { line: meter.line, events };
}

const written = (line: ComboLine | null): string =>
  line ? comboText(line.hits, line.damage, line.note ? noteText(line.note) : undefined) : '';

describe('the Finisher in training (docs/finisher.md §1.12, test 16)', () => {
  it('« toujours prêt »: locks, keeps the dummy at 1 HP, sends its last blow, and says FINISHER', () => {
    const config = training('always');
    const start = facing(config, 40);
    const run = playCombo(start, config, NAYO_ON_RIFF);
    const { line, events } = lineOf(start, run, config);
    expect(run.states.some((state) => finisherLocked(state, 0))).toBe(true);
    expect(Math.min(...run.states.map((state) => state.fighters[1].health))).toBe(1);
    expect(events.filter((event) => event.type === 'finisherBlow')).toHaveLength(1);
    expect(line?.note).toEqual({ kind: 'finisher' });
    expect(written(line)).toMatch(/^Combo : 7 coups · \d+ dégâts · FINISHER$/);
  });

  it('« toujours prêt » on a dummy at 100 %: the plain super’s damage, not the whole health', () => {
    const always = training('always');
    const start = facing(always, 40);
    const armed = lineOf(start, playCombo(start, always, NAYO_ON_RIFF), always).line;
    // The same combo, the Finisher off: back + BOOST, the plain super.
    const off = training('off');
    const plain = lineOf(start, playCombo(start, off, NAYO_ON_RIFF), off).line;
    expect(plain?.note).toBeNull();
    expect(armed?.damage).toBe(plain?.damage);
    expect(armed?.hits).toBe(plain?.hits);
    // About 1000 otherwise: Riff down to her 1 HP floor.
    expect(armed?.damage).toBeLessThan(RIFF.maxHealth / 2);
  });

  it('« comme en match »: a combo begun above 30 % says so; at 30 %, the dummy refilled to it, FINISHER', () => {
    const match = training('match');
    const start = facing(match, 40);
    expect(lineOf(start, playCombo(start, match, NAYO_ON_RIFF), match).line?.note).toEqual({
      kind: 'start',
    });
    // « Vie du mannequin : 30 % »: rested, it goes back to 270 HP, the threshold.
    const low = { ...match, trainingDummyHealth: 30 } as const;
    let rested = facing(low, 40);
    for (let tick = 0; tick < 70; tick++) rested = step(rested, [0, 0], low);
    expect(rested.fighters[1].health).toBe(270);
    expect(finisherState(rested, 0, low)).toBe('ready');
    expect(lineOf(rested, playCombo(rested, low, NAYO_ON_RIFF), low).line?.note).toEqual({
      kind: 'finisher',
    });
  });

  it('says « paré » for a super blocked, its chip as the damage', () => {
    const config = training('always');
    const start = facing(config, 40);
    // The dummy holds back (right): it blocks the Mégabasse let go from neutral.
    const run = playCombo(start, config, [B | X], () => Input.Right);
    const { line } = lineOf(start, run, config);
    expect(line).toEqual({ hits: 0, damage: 45, note: { kind: 'blocked' } });
    expect(written(line)).toBe('Combo : 0 coup · 45 dégâts · paré');
  });

  it("says « en l'air » for Riff's Slam on a body juggled by her Retourné sauté (§1.1, rule b)", () => {
    const config = training('always', [RIFF, NAYO]);
    const start = facing(config, 30);
    const { line } = lineOf(start, playCombo(start, config, [B | H, B | X]), config);
    expect(line?.note).toEqual({ kind: 'air' });
  });

  it('says « échange » when the dummy’s own super trades with the first blow (§1.6)', () => {
    const config = training('always', [NAYO, NAYO]);
    const start = facing(config, 40);
    // Both Mégabasses on the same tick: they trade at f8, 96 HP each, nothing locks.
    const run = playCombo(start, config, [B | X], (tick) => (tick === 0 ? Input.Right | X : 0));
    const { line } = lineOf(start, run, config);
    expect(run.states.some((state) => finisherLocked(state, 0))).toBe(false);
    expect(line?.note).toEqual({ kind: 'trade' });
  });

  it('says « hors de portée » when the Mégabasse touches from too far to lock (§1.5)', () => {
    const config = training('always');
    const start = facing(config, 72);
    const run = playCombo(start, config, [B | X]);
    const { line } = lineOf(start, run, config);
    expect(run.hits.length).toBeGreaterThan(0);
    expect(line?.note).toEqual({ kind: 'reach' });
  });

  it('says « 2 barres » when back + BOOST asks for the super without the gauge for it', () => {
    const config = { ...training('always'), trainingGauge: 'normal' } as const;
    const full = facing(config, 40);
    const start: GameState = {
      ...full,
      fighters: [{ ...full.fighters[0], boost: 2000 }, full.fighters[1]],
    };
    const combo = playCombo(start, config, [L, L, H, H]);
    // The fourth blow lands; back + BOOST pressed from then on: nothing comes out, two bars.
    const landed = combo.states.findIndex((state) => state.fighters[1].comboCount === 4);
    let state = combo.states[landed] ?? start;
    const presses: GameState[] = [];
    for (const input of [B | X, B, B | X, B]) {
      state = step(state, [input, 0], config);
      presses.push(state);
    }
    expect(presses.some(({ fighters: [nayo] }) => nayo.move === 'super')).toBe(false);
    const run = { ...combo, states: [...combo.states.slice(0, landed + 1), ...presses] };
    expect(lineOf(start, run, config).line?.note).toEqual({ kind: 'bars', bars: 2 });
  });

  /**
   * `run`, played on with nothing pressed, cut at its first state from tick `from` on where `at`
   * holds, then back + BOOST pressed twice: the line, and the states of the presses.
   */
  function pressedAgain(
    start: GameState,
    run: ComboRun,
    config: MatchConfig,
    from: number,
    at: (state: GameState) => boolean,
  ) {
    const states = [...run.states];
    let state = run.end;
    for (let tick = 0; tick < 120; tick++) {
      state = step(state, [0, 0], config);
      states.push(state);
    }
    const index = states.findIndex((played, tick) => tick >= from && at(played));
    expect(index).toBeGreaterThan(-1);
    state = states[index] ?? start;
    const presses: GameState[] = [];
    for (const input of [B | X, B, B | X, B]) {
      state = step(state, [input, 0], config);
      presses.push(state);
    }
    const cut = [...states.slice(0, index + 1), ...presses];
    return { line: lineOf(start, { ...run, states: cut }, config).line, presses };
  }
  const playsSuper = ({ action, move }: FighterState) => action === 'attack' && move === 'super';
  const superStart = (run: ComboRun) =>
    run.states.findIndex(({ fighters }) => playsSuper(fighters[0]));

  it('keeps the super’s note when back + BOOST is pressed again in its combo, the bars spent', () => {
    // Regression: pressed again once the super was out and had spent the three bars, the line
    // said « 0 barre » instead of why the super was a plain one, or added it with it off.
    for (const [finisher, note] of [
      ['match', { kind: 'start' }],
      ['off', null],
    ] as const) {
      const config = training(finisher);
      const start = facing(config, 40);
      const run = playCombo(start, config, NAYO_ON_RIFF);
      // Nayo out of his super, Riff still in its combo, knocked down.
      const after = pressedAgain(start, run, config, superStart(run), ({ fighters }) => {
        return !playsSuper(fighters[0]) && fighters[1].comboCount > 0;
      });
      expect(after.presses.every(({ fighters }) => fighters[1].comboCount > 0)).toBe(true);
      expect(after.presses.some(({ fighters }) => playsSuper(fighters[0]))).toBe(false);
      expect(after.line?.note ?? null, finisher).toEqual(note);
    }
  });

  it('keeps « hors de portée » when the super opens the combo and back + BOOST is pressed again', () => {
    // The combo starts at the super's first contact, after it started: still its own.
    const config = training('always');
    const start = facing(config, 72);
    const run = playCombo(start, config, [B | X]);
    const after = pressedAgain(start, run, config, superStart(run) + 30, ({ fighters }) => {
      return fighters[1].comboCount > 0;
    });
    expect(after.line?.note).toEqual({ kind: 'reach' });
  });

  it('writes every line in 480 px at most, its longest with 12 hits and 1000 damage', () => {
    const longest = Math.max(...NOTES.map((note) => comboText(12, 1000, noteText(note)).length));
    expect(longest * 8).toBeLessThanOrEqual(VIEW_SIZE.width);
  });
});

describe('the lights the training line reads (docs/finisher.md §1.1)', () => {
  const config = training('match');
  /** Nayo, three bars, the dummy `victim` in front of him. */
  const stateWith = (victim: Partial<FighterState>, boost = BOOST_MAX): GameState => {
    const state = createInitialState(config);
    const [a, b] = state.fighters;
    return {
      ...state,
      fighters: [
        { ...a, boost },
        { ...b, ...victim },
      ],
    };
  };
  const cases: readonly {
    victim: Partial<FighterState>;
    boost?: number;
    note: FinisherNote | null;
  }[] = [
    { victim: { health: 270 }, note: null },
    { victim: { health: 271 }, note: { kind: 'start' } },
    { victim: { health: 270 }, boost: 2999, note: { kind: 'bars', bars: 2 } },
    { victim: { action: 'hitstun', comboCount: 3, flags: FLAG_DANGER }, note: null },
    { victim: { action: 'hitstun', comboCount: 3, flags: 0 }, note: { kind: 'start' } },
    { victim: { action: 'hitstun', comboCount: 10, flags: FLAG_DANGER }, note: { kind: 'room' } },
    {
      victim: { action: 'hitstun', comboCount: 2, flags: FLAG_DANGER | FLAG_LIMIT },
      note: { kind: 'room' },
    },
  ];

  it('names the light that is off, and none exactly when the core says ready', () => {
    for (const { victim, boost, note } of cases) {
      const state = stateWith(victim, boost);
      expect(lightsNote(state, config), JSON.stringify(victim)).toEqual(note);
      expect(finisherState(state, 0, config) === 'ready').toBe(note === null);
    }
  });

  it("names « en l'air » the body up for a super that leaves the ground (the Slam)", () => {
    const riff = { ...config, fighters: [RIFF, NAYO] } as const;
    const state = createInitialState(riff);
    const [a, b] = state.fighters;
    const up: GameState = {
      ...state,
      fighters: [
        { ...a, boost: BOOST_MAX },
        { ...b, action: 'airHit', y: px(30), comboCount: 2, flags: FLAG_DANGER },
      ],
    };
    expect(finisherState(up, 0, riff)).toBe('blocked');
    expect(lightsNote(up, riff)).toEqual({ kind: 'air' });
  });

  it('notes nothing with the Finisher off: back + BOOST is the plain super there', () => {
    const off = training('off');
    expect(lightsNote(createInitialState(off), off)).toBeNull();
  });
});
