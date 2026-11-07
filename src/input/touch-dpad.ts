import { has, Input, type InputBits } from '../core/input';

/**
 * The d-pad of the touch controls, as pure functions: how a finger's offset from the pad's center
 * reads as directions. Read by `TouchControls`, tested without a browser.
 */

/** A finger this close to the center, in fractions of the pad's radius, presses nothing... */
export const DPAD_PRESS = 0.25;
/** ...and one already pressing lets go only this close (no flicker at the center). */
export const DPAD_RELEASE = 0.18;
/**
 * An axis reads once the finger is this far off it: sin(20°). The four diagonals, between two
 * arrows, are 50° wide each and the four arrows 40°: a quarter circle (↓ ↘ →) rolls through its
 * diagonal as on a gamepad's cross, and an arrow alone stays easy to hold.
 */
const AXIS_THRESHOLD = Math.sin((20 * Math.PI) / 180);

/**
 * The directions a finger `dx`, `dy` from the pad's center gives (screen coordinates, y pointing
 * down), on a pad of `radius` CSS px, given what this finger gave last time (`previous`): beyond
 * the pad it keeps reading, the finger slid off its edge.
 */
export function bitsFromDpad(
  dx: number,
  dy: number,
  radius: number,
  previous: InputBits,
): InputBits {
  const length = Math.hypot(dx, dy);
  if (length < radius * (previous === 0 ? DPAD_PRESS : DPAD_RELEASE)) return 0;
  const nx = dx / length;
  const ny = dy / length;
  let bits = 0;
  if (nx > AXIS_THRESHOLD) bits |= Input.Right;
  if (nx < -AXIS_THRESHOLD) bits |= Input.Left;
  if (ny > AXIS_THRESHOLD) bits |= Input.Down;
  if (ny < -AXIS_THRESHOLD) bits |= Input.Up;
  return bits;
}

/**
 * With FINISH lit, back reads down to this angle under the horizontal as BOOST is pressed
 * (docs/finisher.md §1.3), instead of the 20° from which down joins it.
 */
export const FINISHER_BACK_DEGREES = 35;
const FINISHER_BACK_SLOPE = Math.sin((FINISHER_BACK_DEGREES * Math.PI) / 180);

/**
 * The pad's `bits`, for a finger `dx`, `dy` from its center, read as BOOST is pressed with FINISH
 * lit (docs/finisher.md §1.3): a finger pulling `back` (Left or Right: the fighter's back) a
 * little low, down to FINISHER_BACK_DEGREES under the horizontal, reads back alone, the
 * Finisher's command, rather than down-back, the anti-air's Remix (1 bar: the Finisher lost). A
 * clear down-back (45°) stays one; the forward side and every other direction read as always.
 */
export function finisherBack(bits: InputBits, dx: number, dy: number, back: InputBits): InputBits {
  if (!has(bits, back) || !has(bits, Input.Down)) return bits;
  return dy <= Math.hypot(dx, dy) * FINISHER_BACK_SLOPE ? bits & ~Input.Down : bits;
}
