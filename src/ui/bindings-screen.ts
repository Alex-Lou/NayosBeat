import {
  ACTIONS,
  assignButton,
  assignKey,
  PAD_ACTIONS,
  resetKeys,
  resetPad,
  type Action,
  type Assigned,
  type PadAction,
} from '../input/bindings';
import { controlsStore, type Controls, type ControlsStore } from '../input/controls-store';
import { connectedGamepads, PadButton } from '../input/gamepad';
import { padButtonName } from '../input/gamepad-buttons';
import { KEY_NAMES, keyName } from '../input/key-names';
import {
  ACTION_LABELS,
  assignedText,
  CANCELLED_TEXT,
  FIXED_TEXTS,
  IDLE_TEXTS,
  LISTEN_SECONDS,
  listeningText,
  NOT_STANDARD_TEXT,
  refusalText,
  resetRefusedText,
  resetText,
  RETRY_TEXT,
  TIMEOUT_TEXT,
  type Device,
} from './bindings-text';
import { appendText, drawKeyboard } from './keyboard-drawing';
import {
  backButton,
  element,
  helpLine,
  MENU_KEYS,
  MENU_PAD_ACTIONS,
  readMenuPad,
  type MenuAction,
  type MenuFeedback,
} from './menu';
import { drawPad } from './pad-drawing';

/** A tab of the screen: a player's keyboard or gamepad. */
export type BindingsTab = 'keys1' | 'keys2' | 'pad1' | 'pad2';

export const TAB_LABELS: Readonly<Record<BindingsTab, string>> = {
  keys1: 'Clavier J1',
  keys2: 'Clavier J2',
  pad1: 'Manette J1',
  pad2: 'Manette J2',
};

const TAB_DEVICES: Readonly<Record<BindingsTab, { device: Device; player: 0 | 1 }>> = {
  keys1: { device: 'keys', player: 0 },
  keys2: { device: 'keys', player: 1 },
  pad1: { device: 'pad', player: 0 },
  pad2: { device: 'pad', player: 1 },
};

/** A choice under the drawing: an action to change, or one of the screen's own. */
type Cell =
  | { readonly kind: 'action'; readonly action: Action }
  | { readonly kind: 'reset' }
  | { readonly kind: 'back' };

/** Choices per row: the actions of a keyboard fill two rows, a gamepad's one. */
export const COLUMNS = 7;

/** The subset of a gamepad the screen reads. */
export interface PadLike {
  readonly index: number;
  readonly mapping: string;
  readonly buttons: readonly { readonly pressed: boolean }[];
}

export interface BindingsScreenOptions {
  readonly tabs: readonly BindingsTab[];
  readonly initialTab?: BindingsTab;
  readonly overlay?: boolean;
  readonly onBack: () => void;
  readonly feedback?: (action: MenuFeedback) => void;
  readonly store?: ControlsStore;
  /** The gamepads connected right now. */
  readonly pads?: () => readonly PadLike[];
}

/** What the screen waits for: the next key or button of `action`, for `seconds` more. */
interface Listening {
  readonly action: Action;
  readonly device: Device;
  readonly player: 0 | 1;
  seconds: number;
  /** Why the last key or button was refused, said until another comes. */
  refused?: string;
  /** Buttons held as it began (`pad:button`): only a fresh press counts. */
  readonly held: Set<string>;
}

/**
 * The « Touches » screen (docs/polish/AUDIT-ET-PLAN.md, P24): a tab per player and device, the
 * keyboard or the gamepad drawn, its actions under it. Choose an action (it lights up on the
 * drawing), confirm, press: the next key or button is taken, or refused with the reason
 * (`assignKey`), and kept at once (`ControlsStore`). Escape or Start gives up, and so does the
 * time running out.
 *
 * Nothing it hears while it waits reaches the rest of the page: it listens before everyone (the
 * window's capture phase) and stops the event there, down to the release of the key it took, so
 * neither the fight under the pause nor the next menu sees it. Driven like the menus by
 * keyboard, gamepad, mouse or touch; nothing is focusable.
 */
export class BindingsScreen {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly store: ControlsStore;
  private readonly pads: () => readonly PadLike[];
  private tab: BindingsTab;
  /** The row (0: the tabs) and the column of the cursor. */
  private row = 0;
  private column = 0;
  private status: string;
  private listening: Listening | undefined;
  /** The key taken or that gave up: its repeats and its release stay here. */
  private releasing: string | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private frameRequest = 0;
  private previousPad = readMenuPad();
  /** What each key says on the player's own layout, as the browser tells it or as pressed. */
  private readonly names = new Map<string, string>();
  private disposed = false;

  constructor(
    parent: HTMLElement,
    private readonly options: BindingsScreenOptions,
  ) {
    this.store = options.store ?? controlsStore;
    this.pads = options.pads ?? connectedGamepads;
    this.tab = options.initialTab ?? options.tabs[0] ?? 'keys1';
    this.column = Math.max(0, options.tabs.indexOf(this.tab));
    this.status = IDLE_TEXTS[TAB_DEVICES[this.tab].device];
    this.root = element('div', options.overlay ? 'menu menu-overlay' : 'menu');
    this.panel = element('div', 'menu-panel bindings-panel');
    this.root.appendChild(
      backButton(() => {
        this.stopListening(CANCELLED_TEXT);
        this.options.onBack();
      }, options.feedback),
    );
    this.root.appendChild(this.panel);
    parent.appendChild(this.root);
    this.render();

    // Before every other listener of the page: what the screen waits for stops here.
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
    this.frameRequest = requestAnimationFrame(this.poll);
    this.learnLayout();
  }

  /** Waiting for a key or a button: the action it is for. */
  get listeningFor(): Action | undefined {
    return this.listening?.action;
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('keyup', this.onKeyUp, true);
    cancelAnimationFrame(this.frameRequest);
    this.clearTimer();
    this.root.remove();
  }

  private get device(): Device {
    return TAB_DEVICES[this.tab].device;
  }

  private get player(): 0 | 1 {
    return TAB_DEVICES[this.tab].player;
  }

  private cells(): Cell[] {
    const actions = this.device === 'keys' ? ACTIONS : PAD_ACTIONS;
    return [
      ...actions.map((action): Cell => ({ kind: 'action', action })),
      { kind: 'reset' },
      { kind: 'back' },
    ];
  }

  /** The rows of the cursor: the tabs, then the cells, COLUMNS a row. */
  private rowLengths(): number[] {
    const count = this.cells().length;
    const rows = Array.from({ length: Math.ceil(count / COLUMNS) }, (_, at) =>
      Math.min(COLUMNS, count - at * COLUMNS),
    );
    return [this.options.tabs.length, ...rows];
  }

  private cellAt(row: number, column: number): Cell | undefined {
    return row === 0 ? undefined : this.cells()[(row - 1) * COLUMNS + column];
  }

  /** The action the cursor is on, or the first one: lit on the drawing. */
  private chosenAction(): Action {
    const cell = this.cellAt(this.row, this.column);
    if (this.listening) return this.listening.action;
    return cell?.kind === 'action' ? cell.action : this.device === 'keys' ? 'up' : 'jump';
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const listening = this.listening;
    if (listening || this.releasing === event.code) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (listening) {
      if (event.repeat) return;
      this.releasing = event.code;
      if (event.code === 'Escape') {
        this.giveUp(CANCELLED_TEXT);
        return;
      }
      if (listening.device === 'keys') {
        this.learnName(event);
        this.take(listening, event.code);
      }
      return;
    }
    if (this.releasing === event.code) return;
    const action = MENU_KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat && (action === 'confirm' || action === 'back')) return;
    this.handle(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.listening && this.releasing !== event.code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!this.listening) this.releasing = undefined;
  };

  private readonly poll = (): void => {
    const listening = this.listening;
    if (listening) {
      this.pollListening(listening);
      // Whatever the press did, the menus see it held from now on: never as a fresh one.
      this.previousPad = readMenuPad();
    } else {
      const pad = readMenuPad();
      const pressed = pad & ~this.previousPad;
      this.previousPad = pad;
      for (const [bit, action] of MENU_PAD_ACTIONS) {
        if (!(pressed & bit)) continue;
        this.handle(action);
        if (this.disposed) return;
      }
    }
    this.frameRequest = requestAnimationFrame(this.poll);
  };

  /** The next fresh press: Start gives up, any other button is taken on a gamepad's tab. */
  private pollListening(listening: Listening): void {
    const down = new Set<string>();
    let fresh: number | undefined;
    for (const pad of this.pads()) {
      pad.buttons.forEach((state, button) => {
        if (!state.pressed) return;
        const id = `${pad.index}:${button}`;
        down.add(id);
        if (!listening.held.has(id) && (fresh === undefined || button === PadButton.Start)) {
          fresh = button;
        }
      });
    }
    // A button let go and pressed again counts.
    for (const id of listening.held) if (!down.has(id)) listening.held.delete(id);
    for (const id of down) listening.held.add(id);
    if (fresh === undefined) return;
    if (fresh === PadButton.Start) this.giveUp(CANCELLED_TEXT);
    else if (listening.device === 'pad') this.take(listening, fresh);
  }

  private handle(action: MenuAction): void {
    const lengths = this.rowLengths();
    const rowLength = (row: number) => lengths[row] ?? 1;
    switch (action) {
      case 'up':
      case 'down': {
        const row = action === 'up' ? this.row - 1 : this.row + 1;
        if (row < 0 || row >= lengths.length) return;
        this.options.feedback?.('move');
        this.moveTo(row, Math.min(this.column, rowLength(row) - 1));
        return;
      }
      case 'left':
      case 'right': {
        const length = rowLength(this.row);
        const column = (this.column + (action === 'left' ? length - 1 : 1)) % length;
        this.options.feedback?.('move');
        if (this.row === 0) this.showTab(this.options.tabs[column] ?? this.tab);
        else this.moveTo(this.row, column);
        return;
      }
      case 'confirm':
        this.options.feedback?.('confirm');
        if (this.row === 0) this.moveTo(1, 0);
        else this.activate(this.cellAt(this.row, this.column));
        return;
      case 'back':
        this.options.feedback?.('back');
        this.options.onBack();
        return;
    }
  }

  private moveTo(row: number, column: number): void {
    if (row === this.row && column === this.column) return;
    this.row = row;
    this.column = column;
    this.render();
  }

  private showTab(tab: BindingsTab): void {
    this.tab = tab;
    this.row = 0;
    this.column = Math.max(0, this.options.tabs.indexOf(tab));
    this.status = IDLE_TEXTS[this.device];
    this.render();
  }

  private activate(cell: Cell | undefined): void {
    if (!cell) return;
    switch (cell.kind) {
      case 'action':
        this.listen(cell.action);
        return;
      case 'reset':
        this.reset();
        return;
      case 'back':
        this.options.onBack();
        return;
    }
  }

  private listen(action: Action): void {
    const held = new Set<string>();
    for (const pad of this.pads()) {
      pad.buttons.forEach((state, button) => {
        if (state.pressed) held.add(`${pad.index}:${button}`);
      });
    }
    this.listening = {
      action,
      device: this.device,
      player: this.player,
      seconds: LISTEN_SECONDS,
      held,
    };
    this.clearTimer();
    this.timer = setInterval(this.tick, 1000);
    this.render();
  }

  private readonly tick = (): void => {
    const listening = this.listening;
    if (!listening) return;
    listening.seconds--;
    if (listening.seconds <= 0) {
      this.giveUp(TIMEOUT_TEXT);
      return;
    }
    this.render();
  };

  /** `value`: a key's code, or a button's index. Refused, the screen waits for another. */
  private take(listening: Listening, value: string | number): void {
    const controls = this.store.get();
    const { bindings } = controls;
    const { player, action, device } = listening;
    const result: Assigned =
      typeof value === 'string'
        ? assignKey(bindings, player, action, value)
        : assignButton(bindings, player, action as PadAction, value);
    const name = typeof value === 'string' ? this.nameOf(value) : padButtonName(value);
    if (!result.ok) {
      this.options.feedback?.('back');
      listening.seconds = LISTEN_SECONDS;
      listening.refused = refusalText(result.refusal, device, name);
      this.clearTimer();
      this.timer = setInterval(this.tick, 1000);
      this.render();
      return;
    }
    this.options.feedback?.('confirm');
    this.store.set({ ...controls, bindings: result.bindings });
    this.stopListening(assignedText(action, name));
  }

  private giveUp(text: string): void {
    this.options.feedback?.('back');
    this.stopListening(text);
  }

  private stopListening(text: string): void {
    if (!this.listening) return;
    this.listening = undefined;
    this.clearTimer();
    this.status = text;
    this.render();
  }

  private reset(): void {
    const controls = this.store.get();
    const { device, player } = this;
    const result: Assigned =
      device === 'keys'
        ? resetKeys(controls.bindings, player)
        : { ok: true, bindings: resetPad(controls.bindings, player) };
    if (!result.ok) {
      this.options.feedback?.('back');
      this.status = resetRefusedText(player);
      this.render();
      return;
    }
    this.store.set({ ...controls, bindings: result.bindings } satisfies Controls);
    this.status = resetText(player, device);
    this.render();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** A key's name on the player's layout when known (its letter), the AZERTY one otherwise. */
  private nameOf(code: string): string {
    return this.names.get(code) ?? keyName(code);
  }

  private capOf(code: string): string {
    return this.names.get(code) ?? KEY_NAMES[code]?.cap ?? '';
  }

  /** The letter a key of the writing block gives, from the key pressed. */
  private learnName(event: KeyboardEvent): void {
    const name = layoutName(event.code, event.key);
    if (name) this.names.set(event.code, name);
  }

  /** Where the browser tells the layout (Chrome, Edge), every key says its own letter. */
  private learnLayout(): void {
    const keyboard = (
      navigator as { keyboard?: { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> } }
    ).keyboard;
    keyboard
      ?.getLayoutMap?.()
      .then((map) => {
        if (this.disposed) return;
        for (const [code, key] of map) {
          const name = layoutName(code, key);
          if (name) this.names.set(code, name);
        }
        this.render();
      })
      .catch(() => undefined);
  }

  private render(): void {
    if (this.disposed) return;
    const panel = this.panel;
    panel.replaceChildren();
    panel.appendChild(element('h1', 'menu-title', 'Touches'));
    panel.appendChild(this.tabsElement());
    panel.appendChild(this.drawing());
    panel.appendChild(this.cellsElement());
    const listening = this.listening;
    const text = listening
      ? listening.refused
        ? `${listening.refused}. ${RETRY_TEXT} (${listening.seconds} s)`
        : listeningText(listening.action, listening.device, listening.seconds)
      : this.status;
    const status = element('p', 'bindings-status', text);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (listening) status.classList.add(listening.refused ? 'refused' : 'listening');
    panel.appendChild(status);
    panel.appendChild(
      // "Echap" without accent, the arrows of the row named: the pixel font has neither.
      helpLine(
        'Flèches choisir · Entrée / A changer · Echap / B retour',
        'Touche une action, puis sa nouvelle touche',
      ),
    );
    if (this.row > 0) this.selectedElement?.scrollIntoView({ block: 'nearest' });
  }

  private selectedElement: HTMLElement | undefined;

  private tabsElement(): HTMLElement {
    const row = element('div', 'bindings-tabs');
    this.options.tabs.forEach((tab, column) => {
      const button = element('button', 'menu-item bindings-tab', TAB_LABELS[tab]);
      button.type = 'button';
      button.tabIndex = -1;
      if (tab === this.tab) button.classList.add('active');
      if (this.row === 0 && column === this.column) button.classList.add('selected');
      button.addEventListener('click', () => {
        if (this.listening) {
          this.giveUp(CANCELLED_TEXT);
          return;
        }
        this.options.feedback?.('move');
        this.showTab(tab);
      });
      row.appendChild(button);
    });
    return row;
  }

  private drawing(): HTMLElement {
    const box = element('div', 'bindings-drawing');
    const { bindings } = this.store.get();
    const chosen = this.chosenAction();
    if (this.device === 'keys') {
      const own = bindings.keyboard[this.player];
      const other = bindings.keyboard[this.player === 0 ? 1 : 0];
      box.appendChild(drawKeyboard(own, other, chosen, (code) => this.capOf(code)));
    } else {
      box.appendChild(drawPad(bindings.pad[this.player], chosen as PadAction));
    }
    box.appendChild(element('p', 'bindings-note', FIXED_TEXTS[this.device]));
    if (this.device === 'pad' && this.pads().some((pad) => pad.mapping !== 'standard')) {
      box.appendChild(element('p', 'bindings-note', NOT_STANDARD_TEXT));
    }
    return box;
  }

  private cellsElement(): HTMLElement {
    const grid = element('div', 'bindings-cells');
    const { bindings } = this.store.get();
    this.cells().forEach((cell, at) => {
      const row = 1 + Math.floor(at / COLUMNS);
      const column = at % COLUMNS;
      const button = element('button', 'menu-item bindings-cell');
      button.type = 'button';
      button.tabIndex = -1;
      if (cell.kind === 'action') {
        const label = element('span', 'bindings-label');
        label.append(
          element('span', `bindings-swatch act-${cell.action}`),
          ACTION_LABELS[cell.action],
        );
        button.appendChild(label);
        const value = element('span', 'bindings-value');
        appendText(value, this.boundName(cell.action, bindings));
        button.appendChild(value);
        if (this.listening?.action === cell.action) button.classList.add('listening');
      } else {
        button.textContent = cell.kind === 'reset' ? 'Par défaut' : 'Retour';
      }
      if (row === this.row && column === this.column) {
        button.classList.add('selected');
        this.selectedElement = button;
      }
      button.addEventListener('pointerenter', () => {
        if (!this.listening) this.moveTo(row, column);
      });
      button.addEventListener('click', () => {
        if (this.listening) {
          this.giveUp(CANCELLED_TEXT);
          return;
        }
        this.options.feedback?.('confirm');
        this.row = row;
        this.column = column;
        this.activate(cell);
      });
      grid.appendChild(button);
    });
    return grid;
  }

  /** What an action is on now: its keys, or its button. */
  private boundName(action: Action, bindings: Controls['bindings']): string {
    if (this.device === 'pad') {
      return padButtonName(bindings.pad[this.player][action as PadAction]);
    }
    const codes = bindings.keyboard[this.player][action];
    return codes.length === 0 ? 'aucune' : codes.map((code) => this.nameOf(code)).join(', ');
  }
}

/** Keys whose letter depends on the layout: the writing block's. */
const LAYOUT_KEYS =
  /^(Key[A-Z]|Digit\d|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|IntlBackslash|Comma|Period|Slash)$/;

/**
 * What a key of the writing block says on the player's layout, from the character it gives: a
 * capital when the pixel font has it (no capital accented letter, tests/render/glyphs.test.ts),
 * undefined for any other key or character.
 */
export function layoutName(code: string, key: string): string | undefined {
  if (!LAYOUT_KEYS.test(code) || !/^[!-~¡-ÿ]$/u.test(key)) return undefined;
  const capital = key.toUpperCase();
  return /^[!-~]$/u.test(capital) ? capital : key;
}
