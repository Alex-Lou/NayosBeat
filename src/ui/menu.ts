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
}

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
const STICK_THRESHOLD = 0.5;

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
      button.addEventListener('pointerenter', () => this.select(index));
      button.addEventListener('click', () => this.activate(index));
      list.appendChild(button);
      return button;
    });
    panel.appendChild(list);
    panel.appendChild(
      element('p', 'menu-help', '↑↓ choisir · Entrée / A valider · Échap / B retour'),
    );
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    this.select(0);
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
    if (pressed & PAD_UP) this.handle('up');
    if (pressed & PAD_DOWN) this.handle('down');
    if (pressed & PAD_CONFIRM) this.handle('confirm');
    if (pressed & PAD_BACK) this.handle('back');
    // A confirm/back may have disposed this menu; only keep polling while it is shown.
    if (this.root.isConnected) this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };

  private handle(action: MenuAction): void {
    const count = this.buttons.length;
    switch (action) {
      case 'up':
        this.select((this.selected - 1 + count) % count);
        break;
      case 'down':
        this.select((this.selected + 1) % count);
        break;
      case 'confirm':
        this.activate(this.selected);
        break;
      case 'back':
        this.options.onBack?.();
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
  if (typeof navigator.getGamepads !== 'function') return 0;
  let bits = 0;
  for (const pad of navigator.getGamepads()) {
    if (!pad?.connected) continue;
    const held = (index: number): boolean => pad.buttons[index]?.pressed ?? false;
    const stickY = pad.axes[1] ?? 0;
    if (held(12) || stickY < -STICK_THRESHOLD) bits |= PAD_UP;
    if (held(13) || stickY > STICK_THRESHOLD) bits |= PAD_DOWN;
    if (held(0) || held(9)) bits |= PAD_CONFIRM;
    if (held(1)) bits |= PAD_BACK;
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
