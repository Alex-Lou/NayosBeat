import { Input } from '../core/input';
import { PadButton } from './gamepad-buttons';
import { KEY_NAMES } from './key-names';

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

/** The keys that pause a fight (src/input/pause-input.ts): fixed, never a player's. */
export const PAUSE_KEYS: readonly string[] = ['Escape', 'KeyP'];

/** The gamepad's buttons a player may take: not Start (the pause), the d-pad, nor Home. */
export const ASSIGNABLE_BUTTONS: readonly number[] = [
  PadButton.South,
  PadButton.East,
  PadButton.West,
  PadButton.North,
  PadButton.LeftBumper,
  PadButton.RightBumper,
  PadButton.LeftTrigger,
  PadButton.RightTrigger,
  PadButton.Select,
  PadButton.LeftStick,
  PadButton.RightStick,
];

const DPAD: readonly number[] = [
  PadButton.DpadUp,
  PadButton.DpadDown,
  PadButton.DpadLeft,
  PadButton.DpadRight,
];

/**
 * Why a key or a button was refused, for the screen to say: it pauses (`fixed`), it is the
 * d-pad's (`directions`), it cannot be taken at all (`unavailable`: Tab, Ctrl, the system's keys,
 * Home), it is another action's of the same player (`taken`), or the other player's (`other`).
 */
export type Refusal =
  | { readonly kind: 'fixed' }
  | { readonly kind: 'directions' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'taken'; readonly action: Action }
  | { readonly kind: 'other'; readonly player: 0 | 1 };

export type Assigned = { readonly ok: true; readonly bindings: Bindings } | Refused;
export interface Refused {
  readonly ok: false;
  readonly refusal: Refusal;
}

/**
 * `player`'s `action` on the key `code`, alone: the keys it had before are let go. Refused when
 * the key pauses, cannot be taken (`isAssignableKey`), or is already another action's of either
 * player: nothing is swapped behind the player's back. Pure.
 */
export function assignKey(
  bindings: Bindings,
  player: 0 | 1,
  action: Action,
  code: string,
): Assigned {
  if (PAUSE_KEYS.includes(code)) return refuse({ kind: 'fixed' });
  if (!isAssignableKey(code)) return refuse({ kind: 'unavailable' });
  const own = bindings.keyboard[player];
  const holder = ACTIONS.find((other) => other !== action && own[other].includes(code));
  if (holder) return refuse({ kind: 'taken', action: holder });
  const otherPlayer = player === 0 ? 1 : 0;
  if (ACTIONS.some((other) => bindings.keyboard[otherPlayer][other].includes(code))) {
    return refuse({ kind: 'other', player: otherPlayer });
  }
  const keyboard = withPlayer(bindings.keyboard, player, { ...own, [action]: [code] });
  return { ok: true, bindings: { ...bindings, keyboard } };
}

/** `player`'s `action` on gamepad `button`: refused as `assignKey` refuses a key. Pure. */
export function assignButton(
  bindings: Bindings,
  player: 0 | 1,
  action: PadAction,
  button: number,
): Assigned {
  if (button === PadButton.Start) return refuse({ kind: 'fixed' });
  if (DPAD.includes(button)) return refuse({ kind: 'directions' });
  if (!ASSIGNABLE_BUTTONS.includes(button)) return refuse({ kind: 'unavailable' });
  const own = bindings.pad[player];
  const holder = PAD_ACTIONS.find((other) => other !== action && own[other] === button);
  if (holder) return refuse({ kind: 'taken', action: holder });
  const pad = withPlayer(bindings.pad, player, { ...own, [action]: button });
  return { ok: true, bindings: { ...bindings, pad } };
}

/** `player`'s keys as they were first. Player 2's take back theirs only if player 1 left them. */
export function resetKeys(bindings: Bindings, player: 0 | 1): Assigned {
  const otherPlayer = player === 0 ? 1 : 0;
  const theirs = new Set(ACTIONS.flatMap((action) => bindings.keyboard[otherPlayer][action]));
  const back = DEFAULT_KEYS[player];
  const clash = ACTIONS.flatMap((action) => back[action]).some((code) => theirs.has(code));
  if (clash) return refuse({ kind: 'other', player: otherPlayer });
  return {
    ok: true,
    bindings: { ...bindings, keyboard: withPlayer(bindings.keyboard, player, back) },
  };
}

export function resetPad(bindings: Bindings, player: 0 | 1): Bindings {
  return { ...bindings, pad: withPlayer(bindings.pad, player, DEFAULT_PAD) };
}

/** A key the screens draw and name (src/input/key-names.ts), and not a pause key. */
export function isAssignableKey(code: string): boolean {
  return Object.hasOwn(KEY_NAMES, code) && !PAUSE_KEYS.includes(code);
}

function refuse(refusal: Refusal): Refused {
  return { ok: false, refusal };
}

function withPlayer<T>(pair: readonly [T, T], player: 0 | 1, value: T): readonly [T, T] {
  return player === 0 ? [value, pair[1]] : [pair[0], value];
}

/**
 * A stored keyboard, checked once as it is read ("parse, don't validate"): every action, each a
 * list of keys a player may take, no key twice. Anything else: undefined, and the caller falls
 * back on the default.
 */
export function parseKeyMap(value: unknown): KeyMap | undefined {
  if (!isRecord(value)) return undefined;
  const seen = new Set<string>();
  const keys: Partial<Record<Action, readonly string[]>> = {};
  for (const action of ACTIONS) {
    const codes = value[action];
    if (!Array.isArray(codes)) return undefined;
    const valid: string[] = [];
    for (const code of codes as unknown[]) {
      if (typeof code !== 'string' || !isAssignableKey(code) || seen.has(code)) return undefined;
      seen.add(code);
      valid.push(code);
    }
    keys[action] = valid;
  }
  return keys as KeyMap;
}

/** A stored gamepad, checked the same way: every action on a button it may take, none twice. */
export function parsePadMap(value: unknown): PadMap | undefined {
  if (!isRecord(value)) return undefined;
  const seen = new Set<number>();
  const pad: Partial<Record<PadAction, number>> = {};
  for (const action of PAD_ACTIONS) {
    const button = value[action];
    if (typeof button !== 'number' || !ASSIGNABLE_BUTTONS.includes(button) || seen.has(button)) {
      return undefined;
    }
    seen.add(button);
    pad[action] = button;
  }
  return pad as PadMap;
}

/** Both keyboards, which must not share a key: else both go back to their defaults. */
export function parseKeyboards(value: unknown): readonly [KeyMap, KeyMap] {
  if (!Array.isArray(value)) return DEFAULT_KEYS;
  const pair = value as unknown[];
  const keys: [KeyMap, KeyMap] = [
    parseKeyMap(pair[0]) ?? DEFAULT_KEYS[0],
    parseKeyMap(pair[1]) ?? DEFAULT_KEYS[1],
  ];
  const first = new Set(ACTIONS.flatMap((action) => keys[0][action]));
  const shared = ACTIONS.some((action) => keys[1][action].some((code) => first.has(code)));
  return shared ? DEFAULT_KEYS : keys;
}

export function parsePads(value: unknown): readonly [PadMap, PadMap] {
  const pair = Array.isArray(value) ? (value as unknown[]) : [];
  return [parsePadMap(pair[0]) ?? DEFAULT_PAD, parsePadMap(pair[1]) ?? DEFAULT_PAD];
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
