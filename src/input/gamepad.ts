import { Input, type InputBits } from '../core/input';

/** The subset of the Gamepad API that is read, so the mapping can be tested without a browser. */
export interface GamepadSnapshot {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}

const STICK_DEADZONE = 0.5;

/** Button indices of the W3C "standard" mapping (Xbox / PlayStation layouts). */
const Button = {
  South: 0,
  East: 1,
  West: 2,
  North: 3,
  RightBumper: 5,
  DpadUp: 12,
  DpadDown: 13,
  DpadLeft: 14,
  DpadRight: 15,
} as const;

export function bitsFromGamepad(pad: GamepadSnapshot): InputBits {
  const pressed = (index: number): boolean => pad.buttons[index]?.pressed ?? false;
  const stickX = pad.axes[0] ?? 0;
  const stickY = pad.axes[1] ?? 0;

  let bits = 0;
  if (pressed(Button.DpadUp) || stickY < -STICK_DEADZONE) bits |= Input.Up;
  if (pressed(Button.DpadDown) || stickY > STICK_DEADZONE) bits |= Input.Down;
  if (pressed(Button.DpadLeft) || stickX < -STICK_DEADZONE) bits |= Input.Left;
  if (pressed(Button.DpadRight) || stickX > STICK_DEADZONE) bits |= Input.Right;
  if (pressed(Button.South)) bits |= Input.Jump;
  if (pressed(Button.West)) bits |= Input.Light;
  if (pressed(Button.North)) bits |= Input.Heavy;
  if (pressed(Button.East)) bits |= Input.Special;
  // Throw shortcut: light + heavy on a single button.
  if (pressed(Button.RightBumper)) bits |= Input.Light | Input.Heavy;
  return bits;
}

/** Reads the n-th connected gamepad (in connection order) for the given player. */
export function readGamepad(player: number): InputBits {
  // Unavailable in insecure contexts (plain http on a LAN IP) and some embedded browsers.
  if (typeof navigator.getGamepads !== 'function') return 0;

  let connected = 0;
  for (const pad of navigator.getGamepads()) {
    if (!pad?.connected) continue;
    if (connected === player) return bitsFromGamepad(pad);
    connected += 1;
  }
  return 0;
}
