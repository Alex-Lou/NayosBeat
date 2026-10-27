import { DIRECTIONS, Input, type InputBits } from './input';
import { DASH_TAP_WINDOW } from './rules';
import type { FighterState } from './state';

/**
 * The double tap (→ neutral →, ← neutral ←), read in O(1) from three fields of the fighter
 * instead of searching the direction history. A tap is a pure horizontal direction (no up, no
 * down); the stick must come back to neutral, without any direction, between the two taps, so
 * ↓↘→, ↓↘→↓↘→ or → ↗ → never dash. The window starts at the first press: walking a long time,
 * letting go, then tapping does not dash.
 *
 * Each field has its own function: `readInput` builds the next state in one object, with no
 * intermediate one. Taps are read on every tick, hitstop included (a press during the freeze
 * counts), but the window only ages outside of it, as the buffer does.
 */

/** Stage side of a double tap completed on this tick (input SOCD-cleaned), or 0. */
export function doubleTap(fighter: FighterState, input: InputBits): -1 | 0 | 1 {
  const tap = newTap(fighter, input);
  if (tap === 0 || tap !== fighter.tapDirection) return 0;
  return fighter.tapReleased && fighter.tapFrames <= DASH_TAP_WINDOW ? tap : 0;
}

/** Side of the first tap waiting for its second one, once this tick is read. */
export function nextTapDirection(
  fighter: FighterState,
  input: InputBits,
  tapped: -1 | 0 | 1,
): -1 | 0 | 1 {
  if ((input & DIRECTIONS) === 0) return fighter.tapDirection;
  const side = pureSide(input);
  // A diagonal, up or down, or the other side, starts over.
  if (side !== fighter.tapDirection) return isFirstTap(fighter, input, tapped) ? side : 0;
  // The double tap is done: its second tap starts nothing.
  return tapped === 0 ? side : 0;
}

/** Whether the stick went back to neutral since the first tap, once this tick is read. */
export function nextTapReleased(
  fighter: FighterState,
  input: InputBits,
  tapped: -1 | 0 | 1,
): boolean {
  if ((input & DIRECTIONS) === 0) return fighter.tapDirection !== 0 || fighter.tapReleased;
  return isFirstTap(fighter, input, tapped) ? false : fighter.tapReleased;
}

/** Age of the first tap once this tick is read, capped just past the window. */
export function nextTapFrames(
  fighter: FighterState,
  input: InputBits,
  tapped: -1 | 0 | 1,
  age: boolean,
): number {
  const frames = isFirstTap(fighter, input, tapped) ? 0 : fighter.tapFrames;
  return age ? Math.min(frames + 1, DASH_TAP_WINDOW + 1) : frames;
}

/** A tap that opens a new double tap: a fresh press that did not complete one. */
function isFirstTap(fighter: FighterState, input: InputBits, tapped: -1 | 0 | 1): boolean {
  return tapped === 0 && newTap(fighter, input) !== 0;
}

/** Side of a tap pressed on this tick: a pure horizontal direction the last tick did not hold. */
function newTap(fighter: FighterState, input: InputBits): -1 | 0 | 1 {
  const side = pureSide(input);
  return side !== pureSide(fighter.input) ? side : 0;
}

/** Left or right alone (stage coordinates), or 0 when nothing, or anything else, is held. */
function pureSide(input: InputBits): -1 | 0 | 1 {
  const directions = input & DIRECTIONS;
  if (directions === Input.Right) return 1;
  if (directions === Input.Left) return -1;
  return 0;
}
