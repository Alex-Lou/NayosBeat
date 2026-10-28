import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { Contact, GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff } from './helpers';
import { play } from './hold-helpers';

/** Exchanges between two fighters, each pressing on given ticks: who hit whom, and how. */

export const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

const BUTTONS = Input.Light | Input.Heavy | Input.Special;

/** Nayo (player 1) and Riff (player 2) `distancePx` apart, each pressing on given ticks. */
export function exchange(
  distancePx: number,
  nayo: (tick: number) => InputBits,
  riff: (tick: number) => InputBits,
  ticks = 80,
): GameState[] {
  return play(facingOff(distancePx, NAYO_VS_RIFF), ticks, (t) => [nayo(t), riff(t)], NAYO_VS_RIFF);
}

/** Pressed on tick `at` (its direction held two ticks more), nothing otherwise. */
export function at(tick: number, input: InputBits): (t: number) => InputBits {
  return (t) => (t === tick ? input : t > tick && t <= tick + 2 ? input & ~BUTTONS : 0);
}

/** Every contact `by` made over the states. */
export function contactsBy(states: readonly GameState[], by: 0 | 1): Contact[] {
  return states.flatMap((state) => state.contacts.filter((contact) => contact.by === by));
}
