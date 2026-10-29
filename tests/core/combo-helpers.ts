import type { MatchConfig } from '../../src/core/config';
import { DIRECTIONS, type InputBits } from '../../src/core/input';
import type { Contact, FighterState, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import type { TickInputs } from './helpers';

/** What a combo did: every state, and the blows the attacker landed (hits, pummels, throws). */
export interface ComboRun {
  readonly states: readonly GameState[];
  readonly hits: readonly Contact[];
  /** The state once everything has settled. */
  readonly end: GameState;
  /** Both players' inputs on every tick: the combo as a script (`expectMirrored` plays it). */
  readonly inputs: readonly TickInputs[];
}

/** Ticks given to a step to come out before the combo counts as dropped. */
const STEP_TICKS = 60;
/** Ticks left to the last blow and its knockdown once every step is out. */
const SETTLE_TICKS = 90;

/** Whether `after` starts a new move (an attack, or a move of the hold) on this tick. */
export function startsMove(before: FighterState, after: FighterState): boolean {
  if (!after.move || after.actionFrame !== 0) return false;
  return before.move !== after.move || before.actionFrame > 0;
}

/**
 * Player `by` plays `steps` from `start` the way a player keeps a combo going: each step's
 * button pressed again every other tick (its direction held between), from the tick the step
 * before came out until it comes out itself (a cancel on contact, a chain, a link on the first
 * free tick). The opponent plays `opponent` (its input on each tick, from the start). Throws if
 * a step never comes out.
 */
export function playCombo(
  start: GameState,
  config: MatchConfig,
  steps: readonly InputBits[],
  opponent: (tick: number) => InputBits = () => 0,
  by: 0 | 1 = 0,
): ComboRun {
  const states: GameState[] = [];
  const hits: Contact[] = [];
  const inputs: TickInputs[] = [];
  let state = start;
  let tick = 0;
  const advance = (input: InputBits): FighterState => {
    const before = state.fighters[by];
    const other = opponent(tick);
    const pair = by === 0 ? ([input, other] as const) : ([other, input] as const);
    inputs.push(pair);
    state = step(state, pair, config);
    tick++;
    states.push(state);
    for (const contact of state.contacts) {
      if (contact.by === by && contact.kind !== 'block' && contact.kind !== 'tech') {
        hits.push(contact);
      }
    }
    return before;
  };
  steps.forEach((input, index) => {
    for (let pressed = 0; ; pressed++) {
      if (pressed >= STEP_TICKS) throw new Error(`Step ${index} never came out`);
      const before = advance(pressed % 2 === 0 ? input : input & DIRECTIONS);
      if (startsMove(before, state.fighters[by])) break;
    }
  });
  for (let i = 0; i < SETTLE_TICKS; i++) advance(0);
  return { states, hits, end: state, inputs };
}

/** Total damage of the blows. */
export function damageOf(hits: readonly Contact[]): number {
  return hits.reduce((total, hit) => total + hit.damage, 0);
}

/** The opponent once it has landed: on the ground (knocked down, or getting up). */
export function floored(run: ComboRun, victim: 0 | 1 = 1): boolean {
  return run.states.some((state) => state.fighters[victim].action === 'knockdown');
}

/** Every blow of the combo landed on a fighter that could not act in between. */
export function unbroken(run: ComboRun, victim: 0 | 1 = 1): boolean {
  return run.hits.every((hit, index) => {
    const state = run.states.find((s) => s.contacts.includes(hit));
    const defender: FighterState | undefined = state?.fighters[victim];
    return defender !== undefined && (index === 0 || defender.comboCount === index + 1);
  });
}
