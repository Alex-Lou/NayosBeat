import { DIRECTIONS, Input, type InputBits } from '../core/input';

/** The subset of the Gamepad API that is read, so the mapping can be tested without a browser. */
export interface GamepadSnapshot {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}

/** Button indices of the W3C "standard" mapping (Xbox / PlayStation layouts). */
export const PadButton = {
  South: 0,
  East: 1,
  West: 2,
  North: 3,
  LeftBumper: 4,
  RightBumper: 5,
  RightTrigger: 7,
  Start: 9,
  DpadUp: 12,
  DpadDown: 13,
  DpadLeft: 14,
  DpadRight: 15,
} as const;

/**
 * How far the stick must be pushed to take a direction, and how far back it must come to let it
 * go: a stick trembling around one threshold no longer flickers a direction on and off, which
 * would read as a double tap (a false dash).
 */
export const STICK_PRESS = 0.5;
export const STICK_RELEASE = 0.35;

/**
 * Gamepads connected right now. Read once per frame and shared: the Gamepad API is
 * unavailable in insecure contexts (plain http on a LAN IP) and some embedded browsers.
 */
export function connectedGamepads(): Gamepad[] {
  if (typeof navigator.getGamepads !== 'function') return [];
  return navigator.getGamepads().filter((pad): pad is Gamepad => pad?.connected === true);
}

export function isPressed(pad: GamepadSnapshot, button: number): boolean {
  return pad.buttons[button]?.pressed ?? false;
}

/** Left stick position on one axis (0 = horizontal, 1 = vertical, pointing down). */
export function stickAxis(pad: GamepadSnapshot, axis: 0 | 1): number {
  return pad.axes[axis] ?? 0;
}

/**
 * Directions of the left stick, given those it gave on the last read (`previous`): a direction
 * is taken beyond STICK_PRESS and kept down to STICK_RELEASE.
 */
export function stickBits(pad: GamepadSnapshot, previous: InputBits): InputBits {
  const x = stickAxis(pad, 0);
  const y = stickAxis(pad, 1);
  let bits = 0;
  if (-y > threshold(previous, Input.Up)) bits |= Input.Up;
  if (y > threshold(previous, Input.Down)) bits |= Input.Down;
  if (-x > threshold(previous, Input.Left)) bits |= Input.Left;
  if (x > threshold(previous, Input.Right)) bits |= Input.Right;
  return bits;
}

/** Everything but the stick: the d-pad and the buttons. */
export function buttonBits(pad: GamepadSnapshot): InputBits {
  let bits = 0;
  if (isPressed(pad, PadButton.DpadUp)) bits |= Input.Up;
  if (isPressed(pad, PadButton.DpadDown)) bits |= Input.Down;
  if (isPressed(pad, PadButton.DpadLeft)) bits |= Input.Left;
  if (isPressed(pad, PadButton.DpadRight)) bits |= Input.Right;
  if (isPressed(pad, PadButton.South)) bits |= Input.Jump;
  if (isPressed(pad, PadButton.West)) bits |= Input.Light;
  if (isPressed(pad, PadButton.North)) bits |= Input.Heavy;
  if (isPressed(pad, PadButton.East)) bits |= Input.Special;
  if (isPressed(pad, PadButton.RightBumper)) bits |= Input.Grab;
  if (isPressed(pad, PadButton.LeftBumper)) bits |= Input.Dash;
  // BOOST on RT / R2 (docs/combos-v3.md §1.8.5).
  if (isPressed(pad, PadButton.RightTrigger)) bits |= Input.Boost;
  return bits;
}

/** One read of a pad, its stick read against the directions it gave last time. */
export function bitsFromGamepad(pad: GamepadSnapshot, previousStick: InputBits = 0): InputBits {
  return buttonBits(pad) | stickBits(pad, previousStick);
}

/**
 * Reads the pads with the stick's hysteresis: remembers, per pad, the directions its stick gave
 * on the last read. A handful of pads at most, each written in place.
 */
export class GamepadReader {
  private readonly sticks = new Map<number, InputBits>();

  read(pad: GamepadSnapshot & { readonly index: number }): InputBits {
    const stick = stickBits(pad, this.sticks.get(pad.index) ?? 0);
    this.sticks.set(pad.index, stick);
    return buttonBits(pad) | stick;
  }
}

function threshold(previous: InputBits, direction: number): number {
  return (previous & DIRECTIONS & direction) !== 0 ? STICK_RELEASE : STICK_PRESS;
}
