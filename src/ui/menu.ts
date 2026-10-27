export interface MenuItem {
  readonly label: string;
  /** Secondary line, e.g. a short description. */
  readonly hint?: string;
  readonly onSelect: () => void;
}

export interface MenuOptions {
  readonly title: string;
  readonly subtitle?: string;
  readonly items: readonly MenuItem[];
  /** Escape / B / back button. No back action when omitted. */
  readonly onBack?: () => void;
  /** Extra content shown between the title and the items. */
  readonly content?: HTMLElement;
  /** Shown over the fight (translucent) instead of on a plain background. */
  readonly overlay?: boolean;
  /** Item selected when the menu opens. */
  readonly initialIndex?: number;
  /** Called on navigation, e.g. to play a sound. */
  readonly feedback?: (action: MenuFeedback) => void;
}

export type MenuFeedback = 'move' | 'confirm' | 'back';

import { connectedGamepads, isPressed, PadButton, STICK_PRESS, stickAxis } from '../input/gamepad';

type MenuAction = 'up' | 'down' | 'confirm' | 'back';

/** Physical key positions: W/S are Z/S on AZERTY. */
const KEY_ACTIONS: Readonly<Record<string, MenuAction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  KeyJ: 'confirm',
  Escape: 'back',
  Backspace: 'back',
  KeyK: 'back',
};

const PAD_UP = 1;
const PAD_DOWN = 2;
const PAD_CONFIRM = 4;
const PAD_BACK = 8;
const PAD_ACTIONS: readonly (readonly [number, MenuAction])[] = [
  [PAD_UP, 'up'],
  [PAD_DOWN, 'down'],
  [PAD_CONFIRM, 'confirm'],
  [PAD_BACK, 'back'],
];

/**
 * A vertical list of choices, driven by keyboard, gamepad, mouse or touch.
 * Items are not focusable: the selection is managed here, so keyboard activation never
 * triggers twice and nothing leaks focus to the page.
 */
export class Menu {
  private readonly root: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[];
  private selected = 0;
  private frameRequest = 0;
  /** Gamepad buttons held on the previous poll; starts with what is held right now. */
  private previousPad = readPad();

  constructor(
    parent: HTMLElement,
    private readonly options: MenuOptions,
  ) {
    this.root = element('div', options.overlay ? 'menu menu-overlay' : 'menu');
    const panel = element('div', 'menu-panel');
    panel.appendChild(element('h1', 'menu-title', options.title));
    if (options.subtitle) panel.appendChild(element('p', 'menu-subtitle', options.subtitle));
    if (options.content) panel.appendChild(options.content);

    const list = element('div', 'menu-items');
    this.buttons = options.items.map((item, index) => {
      const button = element('button', 'menu-item', item.label);
      button.type = 'button';
      button.tabIndex = -1;
      if (item.hint) button.appendChild(element('span', 'menu-hint', item.hint));
      button.addEventListener('pointerenter', () => {
        this.select(index);
      });
      button.addEventListener('click', () => {
        this.options.feedback?.('confirm');
        this.activate(index);
      });
      list.appendChild(button);
      return button;
    });
    panel.appendChild(list);
    // "Echap" without accent: the pixel font has no capital É.
    panel.appendChild(
      element('p', 'menu-help', '↑↓ choisir · Entrée / A valider · Echap / B retour'),
    );
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    this.select(options.initialIndex ?? 0);
    window.addEventListener('keydown', this.onKeyDown);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    cancelAnimationFrame(this.frameRequest);
    this.root.remove();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    // Holding a key moves through the list, but never confirms or goes back twice.
    if (event.repeat && (action === 'confirm' || action === 'back')) return;
    this.handle(action);
  };

  private readonly pollGamepads = (): void => {
    const pad = readPad();
    const pressed = pad & ~this.previousPad;
    this.previousPad = pad;
    for (const [bit, action] of PAD_ACTIONS) {
      if (!(pressed & bit)) continue;
      this.handle(action);
      // A confirm or back may have closed this menu: the rest of the press is not for it.
      if (!this.root.isConnected) return;
    }
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };

  private handle(action: MenuAction): void {
    const count = this.buttons.length;
    switch (action) {
      case 'up':
        this.options.feedback?.('move');
        this.select((this.selected - 1 + count) % count);
        break;
      case 'down':
        this.options.feedback?.('move');
        this.select((this.selected + 1) % count);
        break;
      case 'confirm':
        this.options.feedback?.('confirm');
        this.activate(this.selected);
        break;
      case 'back':
        if (!this.options.onBack) break;
        this.options.feedback?.('back');
        this.options.onBack();
        break;
    }
  }

  private select(index: number): void {
    this.buttons[this.selected]?.classList.remove('selected');
    this.selected = index;
    this.buttons[index]?.classList.add('selected');
  }

  private activate(index: number): void {
    this.options.items[index]?.onSelect();
  }
}

/** Menu-relevant buttons held on any gamepad (standard mapping), as a bitmask. */
function readPad(): number {
  let bits = 0;
  for (const pad of connectedGamepads()) {
    const stickY = stickAxis(pad, 1);
    if (isPressed(pad, PadButton.DpadUp) || stickY < -STICK_PRESS) bits |= PAD_UP;
    if (isPressed(pad, PadButton.DpadDown) || stickY > STICK_PRESS) bits |= PAD_DOWN;
    if (isPressed(pad, PadButton.South) || isPressed(pad, PadButton.Start)) bits |= PAD_CONFIRM;
    if (isPressed(pad, PadButton.East)) bits |= PAD_BACK;
  }
  return bits;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
