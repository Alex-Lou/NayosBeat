import { PAD_ACTIONS, type PadAction, type PadMap } from '../input/bindings';
import { PadButton } from '../input/gamepad-buttons';
import { ACTION_TAGS } from './bindings-text';
import { appendText } from './keyboard-drawing';
import { element } from './menu';

/**
 * The gamepad of the « Touches » screen (P24): a generic pad, no maker's shape, letter or logo,
 * its buttons where the W3C standard mapping puts them. Each button wears the action it gives;
 * the d-pad its directions, Start its pause, both fixed. Coordinates in a 200 × 90 box.
 */
export const PAD_SIZE = { width: 200, height: 90 } as const;

type Shape = 'round' | 'bar' | 'pill' | 'arm';

interface DrawnButton {
  readonly button: number;
  readonly shape: Shape;
  /** Center and size, in the box's units. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const FACE = { x: 150, y: 46, step: 14 } as const;
const DPAD = { x: 50, y: 46, step: 10 } as const;

export const DRAWN_BUTTONS: readonly DrawnButton[] = [
  { button: PadButton.LeftTrigger, shape: 'bar', x: 46, y: 5, w: 36, h: 9 },
  { button: PadButton.RightTrigger, shape: 'bar', x: 154, y: 5, w: 36, h: 9 },
  { button: PadButton.LeftBumper, shape: 'bar', x: 46, y: 15, w: 42, h: 8 },
  { button: PadButton.RightBumper, shape: 'bar', x: 154, y: 15, w: 42, h: 8 },
  { button: PadButton.North, shape: 'round', x: FACE.x, y: FACE.y - FACE.step, w: 18, h: 18 },
  { button: PadButton.South, shape: 'round', x: FACE.x, y: FACE.y + FACE.step, w: 18, h: 18 },
  { button: PadButton.West, shape: 'round', x: FACE.x - FACE.step, y: FACE.y, w: 18, h: 18 },
  { button: PadButton.East, shape: 'round', x: FACE.x + FACE.step, y: FACE.y, w: 18, h: 18 },
  { button: PadButton.DpadUp, shape: 'arm', x: DPAD.x, y: DPAD.y - DPAD.step, w: 10, h: 10 },
  { button: PadButton.DpadDown, shape: 'arm', x: DPAD.x, y: DPAD.y + DPAD.step, w: 10, h: 10 },
  { button: PadButton.DpadLeft, shape: 'arm', x: DPAD.x - DPAD.step, y: DPAD.y, w: 10, h: 10 },
  { button: PadButton.DpadRight, shape: 'arm', x: DPAD.x + DPAD.step, y: DPAD.y, w: 10, h: 10 },
  { button: PadButton.Select, shape: 'pill', x: 86, y: 36, w: 18, h: 8 },
  { button: PadButton.Start, shape: 'pill', x: 114, y: 36, w: 18, h: 8 },
  { button: PadButton.Home, shape: 'round', x: 100, y: 50, w: 9, h: 9 },
  { button: PadButton.LeftStick, shape: 'round', x: 78, y: 66, w: 18, h: 18 },
  { button: PadButton.RightStick, shape: 'round', x: 122, y: 66, w: 18, h: 18 },
];

const DPAD_TAGS: Readonly<Record<number, string>> = {
  [PadButton.DpadUp]: '↑',
  [PadButton.DpadDown]: '↓',
  [PadButton.DpadLeft]: '←',
  [PadButton.DpadRight]: '→',
};

/** The body: two grips joined, drawn as one path (no maker's outline). */
const BODY =
  'M 40 22 H 160 C 182 22 196 36 198 60 C 200 80 190 89 178 89 C 166 89 160 82 152 76 ' +
  'H 48 C 40 82 34 89 22 89 C 10 89 0 80 2 60 C 4 36 18 22 40 22 Z';

/**
 * `pad`'s buttons, each in its action's color with its tag; `chosen`'s outlined. The other
 * buttons empty, the fixed ones dotted.
 */
export function drawPad(pad: PadMap, chosen: PadAction): HTMLElement {
  const box = element('div', 'pad');
  box.setAttribute('aria-hidden', 'true');
  box.appendChild(body());
  for (const drawn of DRAWN_BUTTONS) {
    const action = PAD_ACTIONS.find((candidate) => pad[candidate] === drawn.button);
    const fixed = drawn.button === PadButton.Start || drawn.button in DPAD_TAGS;
    const classes = ['pad-button', `pad-${drawn.shape}`];
    if (action) classes.push(`act-${action}`);
    if (action === chosen) classes.push('chosen');
    if (fixed) classes.push('pad-fixed');
    if (drawn.button === PadButton.Home) classes.push('pad-unavailable');
    const node = element('div', classes.join(' '));
    const { width, height } = PAD_SIZE;
    node.style.left = `${((drawn.x - drawn.w / 2) / width) * 100}%`;
    node.style.top = `${((drawn.y - drawn.h / 2) / height) * 100}%`;
    node.style.width = `${(drawn.w / width) * 100}%`;
    node.style.height = `${(drawn.h / height) * 100}%`;
    node.dataset['button'] = String(drawn.button);
    const tag = action
      ? ACTION_TAGS[action]
      : drawn.button === PadButton.Start
        ? 'II'
        : (DPAD_TAGS[drawn.button] ?? '');
    appendText(node, tag);
    box.appendChild(node);
  }
  return box;
}

function body(): Element {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pad-body');
  svg.setAttribute('viewBox', `0 0 ${PAD_SIZE.width} ${PAD_SIZE.height}`);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', BODY);
  svg.appendChild(path);
  return svg;
}
