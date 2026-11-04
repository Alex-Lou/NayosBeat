import { connectedGamepads, isPressed, PadButton, STICK_PRESS, stickAxis } from '../input/gamepad';
import { titleLogo } from './title-logo';

export interface MenuItem {
  readonly label: string;
  /** Secondary line, e.g. a short description. */
  readonly hint?: string;
  /** A main way to play: brighter than the secondary items of a home grid. */
  readonly primary?: boolean;
  /** « Installer le jeu »: a secondary action, not a game mode. */
  readonly install?: boolean;
  /** A rank or mark in the corner of a grid card (the difficulty's I, II, III). */
  readonly badge?: string;
  /** The card's accent, in the same tones as the key art. */
  readonly tone?: 'cyan' | 'orange' | 'magenta';
  readonly onSelect: () => void;
}

export interface MenuOptions {
  /** None: the screen shows its logo instead (`logo`), or no title at all. */
  readonly title?: string;
  readonly subtitle?: string;
  readonly items: readonly MenuItem[];
  /** The game's logo at the top of the panel, instead of the title (the home menu). */
  readonly logo?: boolean;
  /** Escape / B / back button. No back action when omitted. */
  readonly onBack?: () => void;
  /** Extra content shown between the title and the items. */
  readonly content?: HTMLElement;
  /** Shown over the fight (translucent) instead of on a plain background. */
  readonly overlay?: boolean;
  /** The key art behind it (styles.css, `.menu-backdrop-*`), varied by screen. */
  readonly backdrop?: MenuBackdropName;
  /** Item selected when the menu opens. */
  readonly initialIndex?: number;
  /** Called on navigation, e.g. to play a sound. */
  readonly feedback?: (action: MenuFeedback) => void;
  /**
   * Its items laid out in a row, as tabs (styles.css): left and right choose too, and the help
   * says so (docs/polish/AUDIT-ET-PLAN.md, L23).
   */
  readonly row?: boolean;
  /** Its items in a grid of this many columns: the arrows move by one cell. */
  readonly columns?: number;
  /**
   * One description line under the grid, for the item selected, instead of a hint in each item
   * (the hint stays in the button, hidden from sight, for screen readers).
   */
  readonly description?: boolean;
  /** The keys it names at the bottom; the default follows `row`, `columns` and `onBack`. */
  readonly help?: string;
  /** A small line under the help, e.g. the build's date (the options). */
  readonly note?: string;
}

export type MenuFeedback = 'move' | 'confirm' | 'back';

/** The key art behind a menu (src/ui/menu-backdrop.ts), varied by screen. */
export type MenuBackdropName = 'home' | 'select' | 'stage' | 'system';

/** What a key or a gamepad button asks a screen of choices for. A list ignores left and right. */
export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

/** Physical key positions: W/A/S/D are Z/Q/S/D on AZERTY. */
export const MENU_KEYS: Readonly<Record<string, MenuAction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
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
const PAD_LEFT = 16;
const PAD_RIGHT = 32;
/** The bits of `readMenuPad`, and what each asks for. */
export const MENU_PAD_ACTIONS: readonly (readonly [number, MenuAction])[] = [
  [PAD_UP, 'up'],
  [PAD_DOWN, 'down'],
  [PAD_LEFT, 'left'],
  [PAD_RIGHT, 'right'],
  [PAD_CONFIRM, 'confirm'],
  [PAD_BACK, 'back'],
];

/**
 * A list of choices, vertical or in a grid, driven by keyboard, gamepad, mouse or touch.
 * Items are not focusable: the selection is managed here, so keyboard activation never
 * triggers twice and nothing leaks focus to the page.
 */
export class Menu {
  private readonly root: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[];
  /** The line under the grid: the hint of the item selected (home). */
  private readonly description?: HTMLParagraphElement;
  private selected = 0;
  private frameRequest = 0;
  /** Gamepad buttons held on the previous poll; starts with what is held right now. */
  private previousPad = readMenuPad();

  constructor(
    parent: HTMLElement,
    private readonly options: MenuOptions,
  ) {
    const classes = ['menu'];
    if (options.overlay) classes.push('menu-overlay');
    if (options.backdrop) classes.push('menu-backdrop', `menu-backdrop-${options.backdrop}`);
    this.root = element('div', classes.join(' '));
    const panel = element('div', 'menu-panel');
    if (options.logo) panel.appendChild(titleLogo('title-logo menu-logo'));
    else if (options.title) panel.appendChild(element('h1', 'menu-title', options.title));
    if (options.subtitle) panel.appendChild(element('p', 'menu-subtitle', options.subtitle));
    if (options.content) panel.appendChild(options.content);

    const columns = options.columns ?? 0;
    const list = element('div', columns > 1 ? 'menu-items menu-grid' : 'menu-items');
    if (columns > 1) {
      list.style.setProperty('--menu-columns', String(columns));
      // An empty cell is filled by a decorative stamp (styles.css), never by a dead choice.
      if (options.items.length % columns !== 0) list.classList.add('menu-grid-open');
    }
    this.buttons = options.items.map((item, index) => {
      const itemClasses = ['menu-item'];
      if (item.primary) itemClasses.push('primary');
      if (item.install) itemClasses.push('menu-item-install');
      if (item.tone) itemClasses.push(`tone-${item.tone}`);
      if (item.badge) itemClasses.push('has-badge');
      const button = element('button', itemClasses.join(' '), item.label);
      button.type = 'button';
      button.tabIndex = -1;
      if (item.hint) button.appendChild(element('span', 'menu-hint', item.hint));
      if (item.badge) {
        const badge = element('span', 'menu-badge', item.badge);
        badge.setAttribute('aria-hidden', 'true');
        button.appendChild(badge);
      }
      // `mousemove`, not `pointerenter`: a menu opening under a still pointer must not pick it.
      button.addEventListener('mousemove', () => {
        this.select(index, false);
      });
      button.addEventListener('click', () => {
        this.options.feedback?.('confirm');
        this.activate(index);
      });
      list.appendChild(button);
      return button;
    });
    panel.appendChild(list);
    if (options.description) {
      this.description = element('p', 'menu-description');
      // The hint stays in the button for screen readers: this line only shows it.
      this.description.setAttribute('aria-hidden', 'true');
      panel.appendChild(this.description);
    }
    // "Echap" without accent: the pixel font has no capital É.
    panel.appendChild(helpLine(options.help ?? defaultHelp(options), 'Touche un choix'));
    if (options.note) panel.appendChild(element('p', 'menu-note', options.note));
    if (options.onBack) this.root.appendChild(backButton(options.onBack, options.feedback));
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    // A page to read (`content`, the help) opens on its top, its choices under it.
    this.select(options.initialIndex ?? 0, !options.content);
    window.addEventListener('keydown', this.onKeyDown);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    cancelAnimationFrame(this.frameRequest);
    this.root.remove();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = MENU_KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    // Holding a key moves through the list, but never confirms or goes back twice.
    if (event.repeat && (action === 'confirm' || action === 'back')) return;
    this.handle(action);
  };

  private readonly pollGamepads = (): void => {
    const pad = readMenuPad();
    const pressed = pad & ~this.previousPad;
    this.previousPad = pad;
    for (const [bit, action] of MENU_PAD_ACTIONS) {
      if (!(pressed & bit)) continue;
      this.handle(action);
      // A confirm or back may have closed this menu: the rest of the press is not for it.
      if (!this.root.isConnected) return;
    }
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };

  private handle(action: MenuAction): void {
    const count = this.buttons.length;
    const columns = this.options.columns ?? 0;
    switch (action) {
      case 'up':
        if (columns > 1) this.moveTo(this.selected - columns);
        else {
          this.options.feedback?.('move');
          this.select((this.selected - 1 + count) % count);
        }
        break;
      case 'down':
        if (columns > 1) this.moveTo(this.selected + columns);
        else {
          this.options.feedback?.('move');
          this.select((this.selected + 1) % count);
        }
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
      case 'left':
        // A vertical list: nothing to the sides. A row (tabs): the item before. A grid: the
        // cell before, staying on its row.
        if (columns > 1) {
          if (this.selected % columns > 0) this.moveTo(this.selected - 1);
        } else if (this.options.row) this.handle('up');
        break;
      case 'right':
        if (columns > 1) {
          const onRow = this.selected % columns < columns - 1;
          if (onRow && this.selected + 1 < count) this.moveTo(this.selected + 1);
        } else if (this.options.row) this.handle('down');
        break;
    }
  }

  /** Moves to `index` when it exists, with the move's sound; a grid's edge stays put. */
  private moveTo(index: number): void {
    if (index < 0 || index >= this.buttons.length || index === this.selected) return;
    this.options.feedback?.('move');
    this.select(index);
  }

  /**
   * `reveal`: the list scrolls to show the item (chosen with the keys, a gamepad, or as the menu
   * opens), a long one on a short screen, or grown with it (`--ui-scale`, styles.css).
   */
  private select(index: number, reveal = true): void {
    this.buttons[this.selected]?.classList.remove('selected');
    this.selected = index;
    const button = this.buttons[index];
    button?.classList.add('selected');
    if (this.description) {
      this.description.textContent = this.options.items[index]?.hint ?? '';
    }
    if (reveal) button?.scrollIntoView({ block: 'nearest' });
  }

  private activate(index: number): void {
    this.options.items[index]?.onSelect();
  }
}

/** The keys a menu names at the bottom, unless it says its own (`MenuOptions.help`). */
function defaultHelp(options: MenuOptions): string {
  // The pixel font has ↑ and ↓, no ← nor →.
  const arrows = options.row || (options.columns ?? 0) > 1 ? 'Flèches' : '↑↓';
  return `${arrows} choisir · Entrée / A valider · Echap / B retour`;
}

/**
 * The bottom line of a screen of choices: its keys for a keyboard or a gamepad, what to touch
 * for a touch screen, which has neither. styles.css shows one or the other by the main pointer.
 */
export function helpLine(keys: string, touch: string): HTMLParagraphElement {
  const help = element('p', 'menu-help');
  help.append(element('span', 'menu-help-keys', keys), element('span', 'menu-help-touch', touch));
  return help;
}

/**
 * « Retour » in the top-left corner, for a touch screen, which has no Escape key nor B button
 * (styles.css shows it there only). It does what Escape does.
 */
export function backButton(
  onBack: () => void,
  feedback?: (action: MenuFeedback) => void,
): HTMLButtonElement {
  const button = element('button', 'menu-back', '‹ Retour');
  button.type = 'button';
  button.tabIndex = -1;
  button.addEventListener('click', () => {
    feedback?.('back');
    onBack();
  });
  return button;
}

/**
 * « Annuler » and « Valider », under a screen of choices, for a touch screen or a mouse: a tap on
 * a tile only selects it, these decide. `onCancel` omitted: no way back from this screen.
 */
export function actionBar(
  onConfirm: () => void,
  onCancel?: () => void,
  feedback?: (action: MenuFeedback) => void,
): HTMLDivElement {
  const actions = element('div', 'select-actions');
  if (onCancel) {
    const cancel = element('button', 'select-action select-cancel', 'Annuler');
    cancel.type = 'button';
    cancel.tabIndex = -1;
    cancel.addEventListener('click', () => {
      feedback?.('back');
      onCancel();
    });
    actions.appendChild(cancel);
  }
  const confirm = element('button', 'select-action select-confirm', 'Valider');
  confirm.type = 'button';
  confirm.tabIndex = -1;
  confirm.addEventListener('click', () => {
    feedback?.('confirm');
    onConfirm();
  });
  actions.appendChild(confirm);
  return actions;
}

/** Menu-relevant buttons held on any gamepad (standard mapping), as a bitmask. */
export function readMenuPad(): number {
  let bits = 0;
  for (const pad of connectedGamepads()) {
    const stickX = stickAxis(pad, 0);
    const stickY = stickAxis(pad, 1);
    if (isPressed(pad, PadButton.DpadUp) || stickY < -STICK_PRESS) bits |= PAD_UP;
    if (isPressed(pad, PadButton.DpadDown) || stickY > STICK_PRESS) bits |= PAD_DOWN;
    if (isPressed(pad, PadButton.DpadLeft) || stickX < -STICK_PRESS) bits |= PAD_LEFT;
    if (isPressed(pad, PadButton.DpadRight) || stickX > STICK_PRESS) bits |= PAD_RIGHT;
    if (isPressed(pad, PadButton.South) || isPressed(pad, PadButton.Start)) bits |= PAD_CONFIRM;
    if (isPressed(pad, PadButton.East)) bits |= PAD_BACK;
  }
  return bits;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
