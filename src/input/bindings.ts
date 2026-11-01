import { Input } from '../core/input';
import { PadButton } from './gamepad-buttons';

/**
 * The controls as data (docs/polish/AUDIT-ET-PLAN.md, P24): which keys and which gamepad buttons
 * give each action, per player. The core only ever sees `InputBits`; these maps are read at the
 * edge, by `KeyboardInput` and `GamepadReader`.
 */

/** Every action a player has, in the order the screens list them. */
export const ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'jump',
  'light',
  'heavy',
  'special',
  'grab',
  'dash',
  'boost',
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * The actions a gamepad button can take: the directions stay on the d-pad and the left stick,
 * which the remapping screen leaves fixed.
 */
export const PAD_ACTIONS = ['jump', 'light', 'heavy', 'special', 'grab', 'dash', 'boost'] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];

export const ACTION_FLAGS: Readonly<Record<Action, number>> = {
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

/**
 * A player's keyboard: the keys (`KeyboardEvent.code`, a physical position) of each action. An
 * action may have several keys, or none (player 2 jumps with up).
 */
export type KeyMap = Readonly<Record<Action, readonly string[]>>;

/** A player's gamepad: the button (W3C standard mapping index) of each action. */
export type PadMap = Readonly<Record<PadAction, number>>;

/**
 * Physical positions: WASD on QWERTY is ZQSD on AZERTY. The dash goes to the hand that moves
 * (left Shift), the grab above the attacks, under the middle finger (I, above K), BOOST above S
 * (O, above L; docs/combos-v3.md §1.8.5).
 */
const PLAYER1: KeyMap = {
  up: ['KeyW'],
  down: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['Space'],
  light: ['KeyJ'],
  heavy: ['KeyK'],
  special: ['KeyL'],
  grab: ['KeyI'],
  dash: ['ShiftLeft'],
  boost: ['KeyO'],
};

/**
 * The keypad, BOOST above S (Numpad6 over Numpad3); laptops without one: the keys around right
 * Shift (M is ";" on AZERTY), BOOST above S ("[" on QWERTY, "^" on AZERTY, above "'" / "ù").
 */
const PLAYER2: KeyMap = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  jump: [],
  light: ['Numpad1', 'Period'],
  heavy: ['Numpad2', 'Slash'],
  special: ['Numpad3', 'Quote'],
  grab: ['Numpad4', 'Semicolon'],
  dash: ['Numpad0', 'ShiftRight'],
  boost: ['Numpad6', 'BracketLeft'],
};

export const DEFAULT_KEYS: readonly [KeyMap, KeyMap] = [PLAYER1, PLAYER2];

/** BOOST on RT / R2 (docs/combos-v3.md §1.8.5). */
export const DEFAULT_PAD: PadMap = {
  jump: PadButton.South,
  light: PadButton.West,
  heavy: PadButton.North,
  special: PadButton.East,
  grab: PadButton.RightBumper,
  dash: PadButton.LeftBumper,
  boost: PadButton.RightTrigger,
};

/** `KeyboardEvent.code` → input flags, as `KeyboardInput` reads a key. */
export type KeyBindings = Readonly<Record<string, number>>;

/** What each key of `keys` gives, as flags. */
export function keyFlags(keys: KeyMap): KeyBindings {
  const flags: Record<string, number> = {};
  for (const action of ACTIONS) {
    for (const code of keys[action]) flags[code] = (flags[code] ?? 0) | ACTION_FLAGS[action];
  }
  return flags;
}

/** Both players' keys and gamepad buttons. */
export interface Bindings {
  readonly keyboard: readonly [KeyMap, KeyMap];
  readonly pad: readonly [PadMap, PadMap];
}

export const DEFAULT_BINDINGS: Bindings = {
  keyboard: DEFAULT_KEYS,
  pad: [DEFAULT_PAD, DEFAULT_PAD],
};

/** The directions: the d-pad and the stick give them on a gamepad, never a button. */
export const DIRECTION_ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right'];
