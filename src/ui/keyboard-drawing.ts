import { withArrows } from '../app/controls-content';
import { ACTIONS, isAssignableKey, PAUSE_KEYS, type Action, type KeyMap } from '../input/bindings';
import { KEY_NAMES } from '../input/key-names';
import { ACTION_TAGS } from './bindings-text';
import { element } from './menu';

/**
 * The keyboard of the « Touches » screen (P24), drawn from data: an ISO keyboard (the French
 * one, its Enter two rows tall) with its arrows and its keypad, every key a player may take on it
 * (tests/ui/bindings-screen.test.ts). Sizes in key widths; the drawing scales to its box.
 */
export interface DrawnKey {
  readonly code: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** What it says when it has no name (src/input/key-names.ts): a key nobody may take. */
  readonly cap?: string;
}

export const KEYBOARD_SIZE = { width: 22.75, height: 5 } as const;

function row(y: number, x: number, codes: readonly string[], w = 1): DrawnKey[] {
  return codes.map((code, at) => ({ code, x: x + at * w, y, w, h: 1 }));
}

function key(code: string, x: number, y: number, w = 1, h = 1, cap?: string): DrawnKey {
  return { code, x, y, w, h, ...(cap === undefined ? {} : { cap }) };
}

const letters = (keys: string): string[] => Array.from(keys, (letter) => `Key${letter}`);
const digits = Array.from({ length: 10 }, (_, at) => `Digit${(at + 1) % 10}`);
const ARROWS_X = 15.25;
const PAD_X = 18.75;

export const DRAWN_KEYS: readonly DrawnKey[] = [
  // The main block, without its row of function keys: Escape, the only one the game reads, is
  // fixed (the note under the drawing says so).
  key('Backquote', 0, 0),
  ...row(0, 1, [...digits, 'Minus', 'Equal']),
  key('Backspace', 13, 0, 2, 1, 'Eff'),
  key('Tab', 0, 1, 1.5, 1, 'Tab'),
  ...row(1, 1.5, [...letters('QWERTYUIOP'), 'BracketLeft', 'BracketRight']),
  key('Enter', 13.5, 1, 1.5, 2),
  key('CapsLock', 0, 2, 1.75, 1, 'Verr'),
  ...row(2, 1.75, [...letters('ASDFGHJKL'), 'Semicolon', 'Quote']),
  key('Backslash', 12.75, 2, 0.75),
  key('ShiftLeft', 0, 3, 1.25),
  key('IntlBackslash', 1.25, 3),
  ...row(3, 2.25, [...letters('ZXCVBNM'), 'Comma', 'Period', 'Slash']),
  key('ShiftRight', 12.25, 3, 2.75),
  key('ControlLeft', 0, 4, 1.25, 1, 'Ctrl'),
  key('MetaLeft', 1.25, 4, 1.25, 1, ''),
  key('AltLeft', 2.5, 4, 1.25, 1, 'Alt'),
  key('Space', 3.75, 4, 6.25),
  key('AltRight', 10, 4, 1.25, 1, 'Alt'),
  key('MetaRight', 11.25, 4, 1.25, 1, ''),
  key('ContextMenu', 12.5, 4, 1.25, 1, ''),
  key('ControlRight', 13.75, 4, 1.25, 1, 'Ctrl'),
  // The arrows.
  key('ArrowUp', ARROWS_X + 1, 3),
  ...row(4, ARROWS_X, ['ArrowLeft', 'ArrowDown', 'ArrowRight']),
  // The keypad.
  key('NumLock', PAD_X, 0, 1, 1, 'Num'),
  ...row(0, PAD_X + 1, ['NumpadDivide', 'NumpadMultiply', 'NumpadSubtract']),
  ...row(1, PAD_X, ['Numpad7', 'Numpad8', 'Numpad9']),
  key('NumpadAdd', PAD_X + 3, 1, 1, 2),
  ...row(2, PAD_X, ['Numpad4', 'Numpad5', 'Numpad6']),
  ...row(3, PAD_X, ['Numpad1', 'Numpad2', 'Numpad3']),
  key('NumpadEnter', PAD_X + 3, 3, 1, 2),
  key('Numpad0', PAD_X, 4, 2),
  key('NumpadDecimal', PAD_X + 2, 4),
];

/** Whose a key is, as its drawing shows it. */
export type KeyLook =
  | { readonly kind: 'free' }
  | { readonly kind: 'fixed' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'own'; readonly action: Action; readonly chosen: boolean }
  | { readonly kind: 'other' };

/** How `code` looks for `player` choosing `chosen`: `own` the keys of the player shown. Pure. */
export function keyLook(code: string, own: KeyMap, other: KeyMap, chosen: Action): KeyLook {
  if (PAUSE_KEYS.includes(code)) return { kind: 'fixed' };
  if (!isAssignableKey(code)) return { kind: 'unavailable' };
  const action = ACTIONS.find((candidate) => own[candidate].includes(code));
  if (action) return { kind: 'own', action, chosen: action === chosen };
  if (ACTIONS.some((candidate) => other[candidate].includes(code))) return { kind: 'other' };
  return { kind: 'free' };
}

/**
 * The drawn keyboard: `own`'s keys lit in their action's color, those of `chosen` outlined, its
 * tag above them; the other player's keys dashed, the fixed ones dotted. `capOf`: what a key
 * says (its name on the player's own layout, when the browser tells it).
 */
export function drawKeyboard(
  own: KeyMap,
  other: KeyMap,
  chosen: Action,
  capOf: (code: string) => string,
): HTMLElement {
  const board = element('div', 'kb');
  board.setAttribute('aria-hidden', 'true');
  for (const drawn of DRAWN_KEYS) {
    const look = keyLook(drawn.code, own, other, chosen);
    const classes = ['kb-key', `kb-${look.kind}`];
    if (look.kind === 'own') classes.push(`act-${look.action}`);
    if (look.kind === 'own' && look.chosen) classes.push('chosen');
    const node = element('div', classes.join(' '));
    const { width, height } = KEYBOARD_SIZE;
    node.style.left = `${(drawn.x / width) * 100}%`;
    node.style.top = `${(drawn.y / height) * 100}%`;
    node.style.width = `${(drawn.w / width) * 100}%`;
    node.style.height = `${(drawn.h / height) * 100}%`;
    node.dataset['code'] = drawn.code;
    appendText(node, drawn.cap ?? (KEY_NAMES[drawn.code] ? capOf(drawn.code) : ''));
    if (look.kind === 'own' && look.chosen) {
      const tag = element('span', 'kb-tag');
      appendText(tag, ACTION_TAGS[look.action]);
      node.appendChild(tag);
    }
    board.appendChild(node);
  }
  return board;
}

/** Text with its ← and → drawn as the font's ↑, turned (the font has neither). */
export function appendText(node: HTMLElement, text: string): void {
  for (const part of withArrows(text)) {
    if (typeof part === 'string') {
      node.append(part);
      continue;
    }
    const arrow = element('span', 'arrow', '↑');
    arrow.dataset['turn'] = String(part.turn);
    node.appendChild(arrow);
  }
}
