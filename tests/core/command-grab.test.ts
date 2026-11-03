import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { kd, throwMove } from '../../src/data/fighters/shared';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff } from './helpers';

/**
 * The command grabs (docs/watt-arsenal.md §4): a special of kind `grab` that names its throw.
 * Caught, the held fighter cannot break free, and the throw plays at once. Nobody has one yet:
 * Nayo with Watt's Branchement (S close up) and Plafonnier saisi (↓ + S, an air catch) stands in
 * for him.
 */

const { Up, Down, Special, Grab, Left } = Input;

const GRAB = NAYO.moves.grab;
const SLAM = throwMove({
  name: 'Branchement',
  startup: 10,
  recovery: 24,
  damage: 140,
  hitstop: 16,
  knockdown: kd(4, 3),
});
const COMMAND: FighterTemplate = {
  ...NAYO,
  moves: {
    ...NAYO.moves,
    specialClose: {
      ...GRAB,
      name: 'Branchement',
      startup: 5,
      active: 2,
      recovery: 40,
      closeRange: px(40),
      throw: 'throwClose',
    },
    throwClose: SLAM,
    specialAntiAir: {
      ...GRAB,
      name: 'Plafonnier saisi',
      startup: 4,
      active: 8,
      recovery: 26,
      hitbox: { x: px(-4), y: px(40), width: px(36), height: px(60) },
      catches: 'air',
      throw: 'throwCatch',
    },
    throwCatch: { ...SLAM, name: 'Plaqué', damage: 110 },
  },
};
/** `value` without its field `key`. */
function omit<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key)) as Omit<T, K>;
}

// A Remix keeps the timing of its special (D18): the stand-in has none for its catch.
const STAND_IN: FighterTemplate = { ...COMMAND, moves: omit(COMMAND.moves, 'specialAntiAirBoost') };
const MATCH: MatchConfig = { stage: TRAINING_STAGE, fighters: [STAND_IN, NAYO] };

/** Plays `ticks` ticks, one pair of inputs each, and returns every state. */
function play(state: GameState, ticks: readonly (readonly [number, number])[]): GameState[] {
  const states: GameState[] = [];
  let current = state;
  for (const inputs of ticks) {
    current = step(current, inputs, MATCH);
    states.push(current);
  }
  return states;
}

const idle = (count: number): (readonly [number, number])[] =>
  Array.from({ length: count }, () => [0, 0] as const);

describe('the command grabs (watt-arsenal §4)', () => {
  it('S close up catches, cannot be broken free of, and plays its throw at once', () => {
    // Player 2 presses PRISE through the whole clinch: a plain grab would tech.
    const states = play(facingOff(36, MATCH), [
      [Special, 0],
      ...Array.from({ length: 40 }, (_, t) => [0, t % 2 ? Grab : 0] as const),
    ]);
    const caught = states.findIndex((s) => s.hold !== null);
    expect(caught).toBeGreaterThan(-1);
    const at = states[caught];
    expect(at?.hold?.techable).toBe(false);
    expect(at?.fighters[0]).toMatchObject({ action: 'holding', move: 'throwClose' });
    expect(at?.contacts).toMatchObject([{ kind: 'grab', move: 'specialClose' }]);
    expect(states.some((s) => s.contacts.some((c) => c.kind === 'tech'))).toBe(false);
    const thrown = states.find((s) => s.contacts.some((c) => c.kind === 'throw'));
    expect(thrown?.contacts).toMatchObject([{ kind: 'throw', move: 'throwClose', damage: 140 }]);
    expect(thrown?.hold).toBeNull();
  });

  it('beyond its range, S stays the special', () => {
    const [first] = play(facingOff(60, MATCH), [[Special, 0]]);
    expect(first?.fighters[0].move).toBe('special');
  });

  it('whiffs on a jumper, and on a fighter reeling', () => {
    // Player 2 jumps away on the same tick: the catch on the ground misses.
    const states = play(facingOff(36, MATCH), [[Special, Up | Left], ...idle(20)]);
    expect(states.some((s) => s.hold !== null)).toBe(false);
  });

  it('an air catch takes a jumper, and brings the pair down to the ground', () => {
    // Player 2 jumps in; player 1 answers with ↓ + S as it comes down on him.
    const ticks = Array.from(
      { length: 70 },
      (_, t) => [t === 18 ? Down | Special : 0, t < 6 ? Up | Left : 0] as const,
    );
    const states = play(facingOff(70, MATCH), ticks);
    const caught = states.find((s) => s.hold !== null);
    expect(caught, 'the catch').toBeDefined();
    expect(caught?.fighters[0]).toMatchObject({ y: 0, move: 'throwCatch' });
    expect(caught?.fighters[1]).toMatchObject({ y: 0, action: 'held' });
    const thrown = states.find((s) => s.contacts.some((c) => c.kind === 'throw'));
    expect(thrown?.contacts).toMatchObject([{ move: 'throwCatch', damage: 110 }]);
  });

  it('an air catch never takes a fighter on the ground', () => {
    const states = play(facingOff(30, MATCH), [[Down | Special, 0], ...idle(20)]);
    expect(states.some((s) => s.hold !== null)).toBe(false);
  });

  it('is checked: a command grab names one of its own throws, and only a grab has one', () => {
    expect(validateTemplate(STAND_IN)).toEqual([]);
    const withoutThrow = { ...STAND_IN, moves: omit(STAND_IN.moves, 'throwClose') };
    expect(validateTemplate(withoutThrow)).not.toEqual([]);
    const noThrow = omit(STAND_IN.moves.specialClose ?? GRAB, 'throw');
    expect(
      validateTemplate({ ...STAND_IN, moves: { ...STAND_IN.moves, specialClose: noThrow } }),
    ).not.toEqual([]);
    const strike = { ...NAYO.moves.special, catches: 'air' as const };
    expect(validateTemplate({ ...NAYO, moves: { ...NAYO.moves, special: strike } })).not.toEqual(
      [],
    );
  });
});
