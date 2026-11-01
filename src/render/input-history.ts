import { Input, type InputBits } from '../core/input';

/**
 * Player 1's inputs, for training (docs/polish/AUDIT-ET-PLAN.md, P19, lot 13): one line per
 * change, newest first, with the ticks it was held. A combo is played « like a phrase »: here the
 * player sees their phrase, its gaps and its rhythm. A projection of the state (D17).
 */
export interface InputLine {
  readonly bits: InputBits;
  /** Ticks held, up to MAX_LINE_TICKS. */
  readonly ticks: number;
}

export const HISTORY_LINES = 12;
/** A line counts its ticks up to this, two digits on screen. */
export const MAX_LINE_TICKS = 99;

/** The history after a tick in which player 1 held `input` (its `FighterState.input`). */
export function nextHistory(history: readonly InputLine[], input: InputBits): readonly InputLine[] {
  const [top, ...older] = history;
  if (top?.bits === input) {
    return top.ticks >= MAX_LINE_TICKS
      ? history
      : [{ bits: input, ticks: top.ticks + 1 }, ...older];
  }
  return [{ bits: input, ticks: 1 }, ...history].slice(0, HISTORY_LINES);
}

/** The direction held, 1 to 9 as on a numeric keypad (5: none), as the screen shows it. */
export function directionOf(bits: InputBits): number {
  const x = bits & Input.Left ? -1 : bits & Input.Right ? 1 : 0;
  const y = bits & Input.Down ? -1 : bits & Input.Up ? 1 : 0;
  return 5 + x + 3 * y;
}

/** The buttons held, as the touch buttons name them. */
const BUTTONS: readonly (readonly [number, string])[] = [
  [Input.Light, 'L'],
  [Input.Heavy, 'H'],
  [Input.Special, 'S'],
  [Input.Grab, 'PRISE'],
  [Input.Dash, 'DASH'],
  [Input.Boost, 'BOOST'],
  [Input.Jump, 'SAUT'],
];

export function buttonsOf(bits: InputBits): string {
  return BUTTONS.flatMap(([flag, label]) => (bits & flag ? [label] : [])).join(' ');
}
