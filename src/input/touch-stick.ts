import { has, Input, type InputBits } from '../core/input';

/**
 * The floating stick of the touch controls, as pure functions: how a thumb's offset from the
 * stick's center reads as directions. Read by `TouchControls`, tested without a browser.
 */

/** Below this distance from the center, a resting stick stays neutral... */
export const STICK_PRESS_PX = 12;
/** ...and a stick already pushed comes back to neutral only below this one (no flicker). */
export const STICK_RELEASE_PX = 8;
/**
 * Up asks for more, so a thumb walking or guarding never jumps by accident: more than 30° above
 * the horizontal (ny < UP_SLOPE) and this much travel, kept down to UP_RELEASE_PX. The 45° jump
 * diagonals still read as up.
 */
export const UP_PRESS_PX = 18;
export const UP_RELEASE_PX = 14;
const UP_SLOPE = -0.5;
/** sin(22.5°): splits the circle into 8 equal 45° sectors, for every direction but up. */
const SECTOR_THRESHOLD = Math.sin(Math.PI / 8);

/**
 * Converts a stick offset (screen coordinates, y pointing down) into direction flags, given the
 * directions it gave last time (`previous`): the thresholds have hysteresis.
 */
export function bitsFromStick(dx: number, dy: number, previous: InputBits): InputBits {
  const length = Math.hypot(dx, dy);
  if (length < (previous === 0 ? STICK_PRESS_PX : STICK_RELEASE_PX)) return 0;

  const nx = dx / length;
  const ny = dy / length;
  let bits = 0;
  if (nx > SECTOR_THRESHOLD) bits |= Input.Right;
  if (nx < -SECTOR_THRESHOLD) bits |= Input.Left;
  if (ny > SECTOR_THRESHOLD) bits |= Input.Down;
  const upTravel = has(previous, Input.Up) ? UP_RELEASE_PX : UP_PRESS_PX;
  if (ny < UP_SLOPE && length >= upTravel) bits |= Input.Up;
  return bits;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Drags the stick center behind the finger so it is never more than `radius` away: reversing
 * direction then takes a short move, however far the thumb has drifted. Moves `origin` in
 * place and returns it: a thumb moves dozens of times a second, without a new point each time.
 */
export function followFinger(origin: Point, finger: Readonly<Point>, radius: number): Point {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length <= radius) return origin;
  const excess = (length - radius) / length;
  origin.x += dx * excess;
  origin.y += dy * excess;
  return origin;
}
