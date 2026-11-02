/**
 * An online match written as a golden replay (tests/core/replays/*.json, tools/replays/replay.ts):
 * both players' inputs on every tick, in runs, the buttons by name. A desync is kept this way
 * (docs/multijoueur.md §9.3), to be played again where it went wrong.
 */

import { Input, type InputBits } from '../core/input';

/** The replays' names of the buttons, in the order they are written. */
export const REPLAY_BUTTONS: Readonly<Record<string, InputBits>> = {
  up: Input.Up,
  down: Input.Down,
  left: Input.Left,
  right: Input.Right,
  jump: Input.Jump,
  light: Input.Light,
  heavy: Input.Heavy,
  special: Input.Special,
  grab: Input.Grab,
  dash: Input.Dash,
  boost: Input.Boost,
};

/** `bits` as a replay writes it: « down+light », '' for nothing held. */
export function writtenInput(bits: InputBits): string {
  return Object.entries(REPLAY_BUTTONS)
    .filter(([, flag]) => (bits & flag) !== 0)
    .map(([name]) => name)
    .join('+');
}

/** A replay as tools/replays/replay.ts reads it; its hash left to `npm run replays:update`. */
export interface RecordedReplay {
  readonly description: string;
  readonly fighters: readonly [string, string];
  readonly inputs: readonly (readonly [number, string, string])[];
  readonly hash: '';
}

/** `played` (both players' inputs, tick by tick) as a replay, the same inputs in a row as one run. */
export function recordReplay(
  description: string,
  fighters: readonly [string, string],
  played: readonly (readonly [InputBits, InputBits])[],
): RecordedReplay {
  const inputs: [number, string, string][] = [];
  for (const [first, second] of played) {
    const one = writtenInput(first);
    const two = writtenInput(second);
    const last = inputs.at(-1);
    if (last && last[1] === one && last[2] === two) last[0]++;
    else inputs.push([1, one, two]);
  }
  return { description, fighters, inputs, hash: '' };
}
