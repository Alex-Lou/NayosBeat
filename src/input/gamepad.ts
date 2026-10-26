import { Input, type InputBits } from '../core/input';

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
  RightBumper: 5,
  Start: 9,
  DpadUp: 12,
  DpadDown: 13,
  DpadLeft: 14,
  DpadRight: 15,
} as const;

/** How far a stick must be pushed to count as a direction. */
export const STICK_THRESHOLD = 0.5;

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

export function bitsFromGamepad(pad: GamepadSnapshot): InputBits {
  const stickX = stickAxis(pad, 0);
  const stickY = stickAxis(pad, 1);

  let bits = 0;
  if (isPressed(pad, PadButton.DpadUp) || stickY < -STICK_THRESHOLD) bits |= Input.Up;
  if (isPressed(pad, PadButton.DpadDown) || stickY > STICK_THRESHOLD) bits |= Input.Down;
  if (isPressed(pad, PadButton.DpadLeft) || stickX < -STICK_THRESHOLD) bits |= Input.Left;
  if (isPressed(pad, PadButton.DpadRight) || stickX > STICK_THRESHOLD) bits |= Input.Right;
  if (isPressed(pad, PadButton.South)) bits |= Input.Jump;
  if (isPressed(pad, PadButton.West)) bits |= Input.Light;
  if (isPressed(pad, PadButton.North)) bits |= Input.Heavy;
  if (isPressed(pad, PadButton.East)) bits |= Input.Special;
  // Throw shortcut: light + heavy on a single button.
  if (isPressed(pad, PadButton.RightBumper)) bits |= Input.Light | Input.Heavy;
  return bits;
}
