import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import { moveDuration } from '../../src/core/moves';
import { updateRound } from '../../src/core/round';
import { BOOST_MAX, ROUND_END_FRAMES } from '../../src/core/rules';
import {
  createInitialState,
  FLAG_SPENT_CANCEL,
  FLAG_SPENT_SUPER,
  SEQUENCE_FLAGS,
  type GameState,
} from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo, startsMove, type ComboRun } from './combo-helpers';
import {
  expectMirrored,
  facingOff,
  fightState,
  makeFighter,
  MATCH,
  MIRROR_MATCH,
  playAlone,
  type TickInputs,
} from './helpers';

/**
 * The Boost gauge on the real engine (docs/combos-v3.md §1.8, §1.9, §6.2): what fills it, its
 * cap and its carry-over, the DASH that rewinds only after a contact, what it pays for once a
 * sequence, the ladder of the Remixes and the supers, the flash that freezes everything, and the
 * symmetry of every Boost move. Nayo plays player 1 on Riff unless told.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Up: U, Dash, Boost: X } = Input;

const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };
/** A training match whose gauge is refilled on every tick: what a match can never afford. */
const REFILLED: MatchConfig = { ...MATCH, training: true, trainingGauge: 'infinite' };

/** Riff, on the right, guards: she holds back, away from Nayo. */
const guarding = (): InputBits => F;

const gauges = (run: ComboRun): number[] => run.end.fighters.map((fighter) => fighter.boost);

/** The moves player 1 started, in order. */
function movesOf(states: readonly GameState[], start: GameState): MoveId[] {
  const moves: MoveId[] = [];
  states.forEach((state, tick) => {
    const before = (states[tick - 1] ?? start).fighters[0];
    const fighter = state.fighters[0];
    if (fighter.move && startsMove(before, fighter)) moves.push(fighter.move);
  });
  return moves;
}

/** Plays one input pair per tick from `start`; returns the state after each tick. */
function played(start: GameState, inputs: readonly TickInputs[], config = MATCH): GameState[] {
  const states: GameState[] = [];
  let state = start;
  for (const pair of inputs) {
    state = step(state, pair, config);
    states.push(state);
  }
  return states;
}

describe('the gauge fills (§1.8.2)', () => {
  it('3/2 of the scaled damage to the attacker, half of it to the one hit', () => {
    // D1: 30, 36, 40.
    const combo = playCombo(facingOff(40), MATCH, [L, L, L]);
    expect(combo.hits.map((hit) => hit.damage)).toEqual([30, 36, 40]);
    expect(gauges(combo)).toEqual([45 + 54 + 60, 15 + 18 + 20]);
  });

  it('on the first six hits of a combo only, for the attacker', () => {
    // A2, the Quatre temps: nine hits, the last three give Nayo nothing.
    const combo = playCombo(facingOff(40), MATCH, [L, L, B | H, L, L, F | H, L, L, L]);
    expect(combo.hits.map((hit) => hit.damage)).toEqual([30, 36, 48, 21, 24, 30, 15, 20, 25]);
    expect(gauges(combo)).toEqual([
      45 + 54 + 72 + 31 + 36 + 45,
      15 + 18 + 24 + 10 + 12 + 15 + 7 + 10 + 12,
    ]);
  });

  it('a little to both on a block, and to a plain special thrown out of a combo only', () => {
    expect(gauges(playCombo(facingOff(40), MATCH, [L], guarding))).toEqual([20, 10]);
    // The Vinyle: 20 as it is thrown, 20 more once blocked.
    expect(gauges(playCombo(facingOff(150), MATCH, [S], guarding))).toEqual([40, 10]);
    // I1: the Pied fendu that ends a combo gives its damage's share, nothing more.
    const combo = playCombo(facingOff(40), MATCH, [L, L, H, F | S]);
    expect(combo.hits.map((hit) => hit.damage)).toEqual([30, 36, 64, 52]);
    expect(gauges(combo)).toEqual([45 + 54 + 96 + 78, 15 + 18 + 32 + 26]);
  });

  it('nothing to the one who plays a Boost move, hit or blocked: to the one it touches only', () => {
    // I9: the Vinyle platine ends the string; its 48 give Riff her half.
    const combo = playCombo(facingOff(40, MATCH, [{ boost: 1000 }, {}]), MATCH, [L, L, H, H, X]);
    expect(combo.hits.map((hit) => hit.damage)).toEqual([30, 36, 64, 42, 48]);
    expect(gauges(combo)).toEqual([45 + 54 + 96 + 63, 15 + 18 + 32 + 21 + 24]);
    const blocked = playCombo(facingOff(150, MATCH, [{ boost: 1000 }, {}]), MATCH, [X], guarding);
    expect(gauges(blocked)).toEqual([0, 10]);
  });

  it('up to three bars, no more', () => {
    const combo = playCombo(facingOff(40, MATCH, [{ boost: 2990 }, {}]), MATCH, [L, L, L]);
    expect(gauges(combo)[0]).toBe(BOOST_MAX);
  });
});

describe('the gauge across a match (§1.8.1)', () => {
  it('starts a match empty and keeps its bars from one round to the next', () => {
    expect(createInitialState(MATCH).fighters.map((fighter) => fighter.boost)).toEqual([0, 0]);
    const fight = fightState();
    const [a, b] = fight.fighters;
    let state = updateRound(
      {
        ...fight,
        fighters: [
          { ...a, health: 0, boost: 1234 },
          { ...b, boost: 2500 },
        ],
      },
      MATCH,
    );
    for (let tick = 0; tick < ROUND_END_FRAMES; tick++) state = updateRound(state, MATCH);
    expect(state.round.number).toBe(2);
    expect(state.fighters.map((fighter) => fighter.boost)).toEqual([1234, 2500]);
  });
});

describe('DASH after a contact (§1.1)', () => {
  it('a double tap forward in the middle of →L, L, →H is a dash, never the Rewind', () => {
    // Forward tapped as →L connects, then L and →H.
    const taps: InputBits[] = [F | L, F, 0, F, 0, F, 0, F, 0, F, 0, L, 0, L, 0, L];
    const inputs = [...taps, ...Array<InputBits>(16).fill(0), F | H, F, F | H, F]
      .concat(Array<InputBits>(40).fill(0))
      .map((input): TickInputs => [input, 0]);
    const start = facingOff(60, MATCH, [{ boost: 3000 }, {}]);
    const states = played(start, inputs);
    const tapped = states.some(
      ({ fighters: [nayo] }) => nayo.moveConnected && nayo.bufferedCommand === 'dash',
    );
    expect(tapped).toBe(true);
    expect(movesOf(states, start)).toEqual(['forwardLight', 'chainLight', 'chainHigh']);
    expect(states.every(({ fighters: [nayo] }) => nayo.boost === 3000)).toBe(true);
  });

  it('pressed before the Direct connects, it stays a dash: nothing is spent', () => {
    const start = facingOff(40, MATCH, [{ boost: 1000 }, {}]);
    const inputs = [L, Dash, ...Array<InputBits>(60).fill(0)].map((i): TickInputs => [i, 0]);
    const states = played(start, inputs);
    expect(movesOf(states, start)).toEqual(['standLight']);
    expect(states.at(-1)?.fighters[0].boost).toBe(1000 + 45);
  });

  it('without a bar, pressed in the last 6 ticks of a blocked Direct, a plain dash after it', () => {
    const start = facingOff(40);
    const jab = moveDuration(NAYO.moves.standLight);
    const states: GameState[] = [];
    let state = start;
    for (let tick = 0; tick < 60; tick++) {
      const nayo = state.fighters[0];
      const late = nayo.move === 'standLight' && nayo.actionFrame === jab - 5;
      state = step(state, [tick === 0 ? L : late ? Dash : 0, F], MATCH);
      states.push(state);
      if (late) expect(state.fighters[0].bufferedCommand).toBe('boostDash');
    }
    expect(movesOf(states, start)).toEqual(['standLight', 'dashForward']);
    // The block's gain, nothing spent.
    expect(states.at(-1)?.fighters[0].boost).toBe(20);
  });
});

describe('what the gauge pays for, once a sequence (§1.8.3, §1.8.4)', () => {
  it('the Rewind once: a second DASH comes out as a plain dash once the blow is over, unpaid', () => {
    const start = facingOff(40, MATCH, [{ boost: 3000 }, {}]);
    const combo = playCombo(start, MATCH, [L, L, H, Dash, L, L, H, Dash]);
    expect(movesOf(combo.states, start)).toEqual([
      'standLight',
      'chainLight',
      'standHeavy',
      'boostCancel',
      'standLight',
      'chainLight',
      'standHeavy',
      'dashForward',
    ]);
    // One bar paid; then the gains of hits 4 to 6 (21, 24, 40).
    expect(combo.end.fighters[0].boost).toBe(2000 + 31 + 36 + 60);
  });

  it('marks the Rewind spent while the opponent is in the sequence, freed once she is out', () => {
    const start = facingOff(40, MATCH, [{ boost: 1000 }, {}]);
    const combo = playCombo(start, MATCH, [L, L, H, Dash, L, L, H, H, F | S]);
    const rewound = combo.states.find(({ fighters: [nayo] }) => nayo.move === 'boostCancel');
    expect((rewound?.fighters[0].flags ?? 0) & FLAG_SPENT_CANCEL).toBe(FLAG_SPENT_CANCEL);
    expect(combo.end.fighters[1].action).not.toBe('hitstun');
    expect(combo.end.fighters[0].flags & SEQUENCE_FLAGS).toBe(0);
  });

  it('never a second super in one sequence, whatever the gauge', () => {
    const full = makeFighter({ boost: BOOST_MAX });
    expect(playAlone(NAYO, [B | X], full)[0]?.move).toBe('super');
    const spent = makeFighter({ boost: BOOST_MAX, flags: FLAG_SPENT_SUPER });
    expect(playAlone(NAYO, [B | X], spent)[0]?.move).toBeNull();
    expect(playAlone(RIFF, [B | X], spent)[0]?.move).toBeNull();
  });

  it('Rewind and super in one combo take four bars: the last ←BOOST does not come out', () => {
    const start = facingOff(40, MATCH, [{ boost: 3000 }, {}]);
    const steps = [L, L, H, Dash, L, L, H, H];
    // Two bars left, and the gains of hits 4 to 6: the seventh gives nothing.
    expect(playCombo(start, MATCH, steps).end.fighters[0].boost).toBe(2000 + 31 + 36 + 60);
    expect(() => playCombo(start, MATCH, [...steps, B | X])).toThrow('Step 8 never came out');
  });
});

/** Whether player 1's `from` was cut short by `to`: a cancel, not the next move after it. */
function cancelled(states: readonly GameState[], from: MoveId, to: MoveId): boolean {
  const duration = moveDuration(NAYO.moves[from] ?? NAYO.moves.standLight);
  return states.some((state, tick) => {
    const before = states[tick - 1]?.fighters[0];
    const now = state.fighters[0];
    return (
      before?.move === from &&
      before.actionFrame + 1 < duration &&
      now.move === to &&
      now.actionFrame === 0
    );
  });
}

/** Presses `press` (direction held between) on the `ticks` ticks after player 1's move landed. */
function pressedOnContact(
  start: GameState,
  opening: InputBits,
  press: InputBits,
  config: MatchConfig,
  opponent: () => InputBits = () => 0,
  ticks = 6,
): GameState[] {
  const states: GameState[] = [];
  let state = start;
  let since = -1;
  for (let tick = 0; tick < 120; tick++) {
    const landed = state.contacts.some((contact) => contact.by === 0);
    if (since < 0 && landed) since = 0;
    const pressing = since >= 0 && since < ticks;
    const input = tick === 0 ? opening : pressing ? (since % 2 === 0 ? press : press & ~X) : 0;
    if (since >= 0) since++;
    state = step(state, [input, opponent()], config);
    states.push(state);
  }
  return states;
}

describe('the ladder of the Boost (§1.3)', () => {
  it('a special climbs to the super once it hit, never blocked, never from its projectile', () => {
    const start = (distance: number): GameState =>
      facingOff(distance, MATCH, [{ boost: BOOST_MAX }, {}]);
    // E6: the Uppercut that hit.
    const hit = pressedOnContact(start(30), D | S, B | X, MATCH);
    expect(cancelled(hit, 'specialAntiAir', 'super')).toBe(true);
    const blocked = pressedOnContact(start(30), D | S, B | X, MATCH, guarding);
    expect(blocked.some(({ contacts }) => contacts.some(({ kind }) => kind === 'block'))).toBe(
      true,
    );
    expect(blocked.some(({ fighters: [nayo] }) => nayo.move === 'super')).toBe(false);
    // The Vinyle hits Riff while Nayo still recovers from the throw.
    const thrown = pressedOnContact(start(80), S, B | X, MATCH);
    expect(thrown.some(({ contacts }) => contacts.some(({ kind }) => kind === 'hit'))).toBe(true);
    expect(cancelled(thrown, 'special', 'super')).toBe(false);
  });

  it('a Remix climbs to the super only, and the super to nothing', () => {
    // Only a gauge refilled on every tick pays for a Remix and a super in one combo.
    const start = facingOff(40, REFILLED);
    const kicked = (press: InputBits): GameState[] =>
      pressedOnContact(start, F | X, press, REFILLED);
    for (const press of [L, H, S, F | S, X, D | X]) {
      expect(movesOf(kicked(press), start).slice(0, 2), String(press)).toEqual([
        'specialForwardBoost',
      ]);
    }
    expect(cancelled(kicked(B | X), 'specialForwardBoost', 'super')).toBe(true);
    for (const press of [L, H, S, X, B | X, Dash]) {
      const states = pressedOnContact(start, B | X, press, REFILLED, () => 0, 30);
      expect(movesOf(states, start).slice(0, 2), String(press)).toEqual(['super']);
    }
  });
});

describe('the flash (§1.9)', () => {
  const superAt = (distance: number, riff: (tick: number) => InputBits = () => 0) => {
    const start = facingOff(distance, MATCH, [{ boost: BOOST_MAX }, { boost: 1000 }]);
    const states: GameState[] = [];
    let state = start;
    for (let tick = 0; tick < 150; tick++) {
      state = step(state, [tick === 0 ? B | X : 0, riff(tick)], MATCH);
      states.push(state);
    }
    return states;
  };

  it('freezes the whole game 20 ticks as the Mégabasse starts: the round timer too', () => {
    const states = superAt(40);
    const timers = states.map(({ round }) => round.timer);
    const first = timers[0] ?? 0;
    expect(timers.slice(0, 21)).toEqual(Array<number>(21).fill(first));
    expect(timers[21]).toBe(first - 1);
    expect(states.slice(0, 21).every(({ fighters: [nayo] }) => nayo.actionFrame === 0)).toBe(true);
  });

  it('a jump, a backdash or a reversal pressed in the flash does not escape the Mégabasse', () => {
    // On the flash's ticks, pressed again every other tick, the direction held between.
    const during =
      (press: InputBits) =>
      (tick: number): InputBits =>
        tick >= 1 && tick <= 20 ? (tick % 2 === 1 ? press : press & (U | D | F | B)) : 0;
    for (const [what, press] of [
      ['jump', U],
      ['backdash', F | Dash],
      ['Genou à fond', D | X],
    ] as const) {
      const states = superAt(50, during(press));
      const struck = states.some(({ contacts }) =>
        contacts.some((contact) => contact.by === 0 && contact.kind === 'hit'),
      );
      expect(struck, what).toBe(true);
    }
  });

  it('leaves Nayo 16 ticks behind once blocked, Riff 15 behind once her Slam is', () => {
    const behind = (config: MatchConfig, guard: InputBits): number => {
      const start = facingOff(40, config, [{ boost: BOOST_MAX }, {}]);
      let state = start;
      let attackerFree = -1;
      let defenderFree = -1;
      let blocked = false;
      for (let tick = 0; tick < 200 && (attackerFree < 0 || defenderFree < 0); tick++) {
        state = step(state, [tick === 0 ? B | X : 0, guard], config);
        const [attacker, defender] = state.fighters;
        if (state.contacts.some(({ kind }) => kind === 'block')) blocked = true;
        if (blocked && defenderFree < 0 && defender.action !== 'blockstun') defenderFree = tick;
        if (tick > 0 && attackerFree < 0 && attacker.move === null) attackerFree = tick;
      }
      expect(blocked).toBe(true);
      return defenderFree - attackerFree;
    };
    expect(behind(MATCH, F)).toBe(-16);
    expect(behind(RIFF_VS_NAYO, F)).toBe(-15);
  });
});

/**
 * L, L blocked, then the Marteau (L, L, → + H), Nayo on Nayo: the one who blocked guards until
 * the Marteau starts, then plays `answer`, pressed again every other tick. Who hits first.
 */
function marteauGap(answer: InputBits, boost = 0): string {
  let state = facingOff(40, MIRROR_MATCH, [{}, { boost }]);
  const steps = [L, L, F | H];
  let index = 0;
  for (let tick = 0; tick < 160; tick++) {
    const press = steps[index];
    const a = press === undefined ? 0 : tick % 2 === 0 ? press : press & DIRECTIONS;
    const marteau = state.fighters[0].move === 'chainHigh';
    const guards = state.fighters[1].action === 'blockstun' || !marteau;
    const b = guards ? F : tick % 2 === 0 ? answer : answer & DIRECTIONS;
    const before = state.fighters[0];
    state = step(state, [a, b], MIRROR_MATCH);
    if (press !== undefined && startsMove(before, state.fighters[0])) index++;
    const hit = state.contacts.find(({ kind }) => kind === 'hit');
    if (hit) return `${hit.by === 0 ? 'Marteau' : 'answer'}: ${hit.move}`;
  }
  return 'nothing';
}

describe("the Marteau's gap (§0.4, 8)", () => {
  it('after a blocked Cross, it beats a mashed Direct, and loses to the invincible reversals', () => {
    expect(marteauGap(L)).toBe('Marteau: chainHigh');
    expect(marteauGap(D | S)).toBe('answer: specialAntiAir');
    expect(marteauGap(D | X, 1000)).toBe('answer: specialAntiAirBoost');
  });
});

describe('P1/P2 symmetry of the Boost moves (§6.2)', () => {
  const NAYO_VS_RIFF = MATCH;
  const routes: readonly [string, MatchConfig, number, number, readonly InputBits[]][] = [
    ['Vinyle platine', NAYO_VS_RIFF, 40, 1000, [L, L, H, H, X]],
    ['Pied fendu platine', NAYO_VS_RIFF, 48, 1000, [L, L, H, H, F | X, L, D | S]],
    ['Montée platine', NAYO_VS_RIFF, 30, 1000, [B | H, D | X]],
    ['Rewind', NAYO_VS_RIFF, 40, 1000, [L, L, H, Dash, L, L, H, H, F | S]],
    ['Mégabasse', NAYO_VS_RIFF, 40, 3000, [L, L, H, H, B | X]],
    ['Glissade à fond', RIFF_VS_NAYO, 36, 1000, [L, L, H, H, X]],
    ["Saut de l'ange à fond", RIFF_VS_NAYO, 36, 1000, [L, L, H, H, F | X]],
    ['Genou à fond', RIFF_VS_NAYO, 36, 1000, [L, L, H, H, D | X]],
    ['Pogo', RIFF_VS_NAYO, 36, 1000, [L, L, H, Dash, L, L, H, H, D | S]],
    ['Slam', RIFF_VS_NAYO, 36, 3000, [L, L, H, H, B | X]],
  ];
  for (const [name, config, distance, boost, steps] of routes) {
    it(`${name}: the same on either side`, () => {
      const start = facingOff(distance, config, [{ boost }, {}]);
      const combo = playCombo(start, config, steps);
      const states = expectMirrored(combo.inputs, config, distance, [{ boost }, {}]);
      const spent = states.some(({ fighters: [attacker] }) => {
        const move = attacker.move ? config.fighters[0].moves[attacker.move] : undefined;
        return (move?.boostCost ?? 0) > 0;
      });
      expect(spent).toBe(true);
    });
  }
});
