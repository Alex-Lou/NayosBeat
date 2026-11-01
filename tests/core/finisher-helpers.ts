import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { FINISHER_DANGER_PERCENT, finisherLocked } from '../../src/core/finisher';
import type { InputBits } from '../../src/core/input';
import { BOOST_MAX } from '../../src/core/rules';
import type { Contact, FighterState, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo, startsMove, type ComboRun } from './combo-helpers';
import { fightState, type TickInputs } from './helpers';

/** The Finisher on the real engine (docs/finisher.md §1.6): who attacks whom, from where. */

/** `attacker` as player `by`, on `victim`. */
export function matchOf(
  attacker: FighterTemplate,
  victim: FighterTemplate,
  by: 0 | 1,
): MatchConfig {
  return { stage: TRAINING_STAGE, fighters: by === 0 ? [attacker, victim] : [victim, attacker] };
}

/** Where a pair starts: the attacker's gauge and the victim's health, the round's wins. */
export interface ArmedSetup {
  readonly distance: number;
  /** The victim's health (default: the 30 % threshold, exactly). */
  readonly health?: number;
  /** The victim's back to the wall instead of the middle of the stage. */
  readonly corner?: boolean;
  /** Default: the attacker at match point, the victim not. */
  readonly wins?: readonly [number, number];
  readonly attacker?: Partial<FighterState>;
  readonly victim?: Partial<FighterState>;
}

/**
 * Player `by` and its victim `distance` px apart, facing each other: the attacker's gauge full,
 * at match point; the victim at 30 % of its health (or `health`).
 */
export function armedStart(config: MatchConfig, by: 0 | 1, setup: ArmedSetup): GameState {
  const victimIndex = by === 0 ? 1 : 0;
  const { width } = config.stage;
  const maxHealth = config.fighters[victimIndex].maxHealth;
  const state = fightState(config);
  const wall = px(16);
  // Player 1 stands on the left: the victim's wall is the right one when player 1 attacks.
  const left = setup.corner ? (by === 0 ? width - wall - px(setup.distance) : wall) : null;
  const firstX = left ?? width / 2 - px(setup.distance) / 2;
  const cameraX = setup.corner ? (by === 0 ? width - px(240) : px(240)) : state.cameraX;
  const attacker = { boost: BOOST_MAX, ...setup.attacker };
  const threshold = Math.trunc((maxHealth * FINISHER_DANGER_PERCENT) / 100);
  const victim = { health: setup.health ?? threshold, ...setup.victim };
  const [a, b] = state.fighters;
  return {
    ...state,
    cameraX,
    round: { ...state.round, wins: setup.wins ?? (by === 0 ? [1, 0] : [0, 1]) },
    fighters: [
      { ...a, x: firstX, ...(by === 0 ? attacker : victim) },
      { ...b, x: firstX + px(setup.distance), ...(by === 0 ? victim : attacker) },
    ],
  };
}

/** Plays one input pair per tick from `start`; returns the state after each tick. */
export function played(
  start: GameState,
  config: MatchConfig,
  ticks: number,
  inputs: (tick: number) => TickInputs,
): GameState[] {
  const states: GameState[] = [];
  let state = start;
  for (let tick = 0; tick < ticks; tick++) {
    state = step(state, inputs(tick), config);
    states.push(state);
  }
  return states;
}

/** The super's contacts of `by` over the states, in order. */
export function superContacts(states: readonly GameState[], by: 0 | 1): Contact[] {
  return states.flatMap(({ contacts }) =>
    contacts.filter((contact) => contact.by === by && contact.move === 'super'),
  );
}

/** Whether `by`'s Finisher locked the pair on some tick. */
export function everLocked(states: readonly GameState[], by: 0 | 1): boolean {
  return states.some((state) => finisherLocked(state, by));
}

/**
 * After `opener` (a `playCombo` run of player `by`), its next step `cancel` pressed `delay` ticks
 * after the opener's last step came out, then played as `playCombo` plays it: 0 is the earliest
 * cancel, later ones fall further in its window. The run holds the opener's ticks too.
 */
export function cancelledLate(
  opener: ComboRun,
  config: MatchConfig,
  cancel: InputBits,
  delay: number,
  by: 0 | 1,
): ComboRun {
  let out = 0;
  opener.states.forEach((state, tick) => {
    const before = opener.states[tick - 1];
    if (before && startsMove(before.fighters[by], state.fighters[by])) out = tick;
  });
  const from = opener.states[out + delay];
  if (!from) throw new Error(`No tick ${out + delay} in the opener`);
  const rest = playCombo(from, config, [cancel], () => 0, by);
  const kept = out + delay + 1;
  const states = [...opener.states.slice(0, kept), ...rest.states];
  const hits = states.flatMap(({ contacts }) =>
    contacts.filter(({ by: who, kind }) => who === by && kind !== 'block' && kind !== 'tech'),
  );
  const inputs = [...opener.inputs.slice(0, kept), ...rest.inputs];
  return { states, hits, end: rest.end, inputs };
}
