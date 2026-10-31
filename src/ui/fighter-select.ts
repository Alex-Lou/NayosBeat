import {
  element,
  MENU_KEYS,
  MENU_PAD_ACTIONS,
  readMenuPad,
  type MenuAction,
  type MenuFeedback,
} from './menu';
import { movedCursor, type GridCursor, type GridLayout } from './select-grid';

/** How a fighter looks on the select screen: its standing pose, from its idle strip. */
export interface FighterLook {
  /** URL of the idle strip: its frames side by side. */
  readonly strip: string;
  readonly frames: number;
  /** One frame, in art pixels. */
  readonly width: number;
  readonly height: number;
  /** The bust on its tile: a square of the first frame, in art pixels. */
  readonly portrait: { readonly x: number; readonly y: number; readonly size: number };
  /** Its idle at the game's pace: the frames of the strip it plays in turn, round and round. */
  readonly idle: readonly IdleFrame[];
}

/** One step of an idle: a frame of the strip, and how long it stays on screen. */
export interface IdleFrame {
  readonly frame: number;
  readonly seconds: number;
}

/** A fighter the screen offers. */
export interface SelectFighter<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  /** Its look, and the one it wears as player 2 in a mirror match; none for a grey box. */
  readonly look?: FighterLook;
  readonly mirrorLook?: FighterLook;
}

export interface FighterSelectOptions<Id extends string> {
  readonly title: string;
  readonly subtitle?: string;
  readonly fighters: readonly SelectFighter<Id>[];
  /** Tiles of the grid, in rows of `columns`: the fighters first, then those still to come. */
  readonly slots: number;
  readonly columns: number;
  /** Offers « Aléatoire », under the grid. */
  readonly onRandom?: () => void;
  /** The fighter the cursor starts on. */
  readonly initial?: Id;
  /** Player 1's pick, marked « J1 » while player 2 chooses: chosen again, its second look. */
  readonly taken?: Id;
  readonly onPick: (id: Id) => void;
  /** Escape / B / back button. No back action when omitted. */
  readonly onBack?: () => void;
  /** Called on navigation, e.g. to play a sound. */
  readonly feedback?: (action: MenuFeedback) => void;
  /** The screen kept still (the player's « Tremblement », src/app/comfort.ts): no idle plays. */
  readonly still?: boolean;
}

/** What the panel says of a tile that holds no fighter. */
const COMING = { name: 'Bientôt', description: 'Un combattant de plus arrive' } as const;
const RANDOM = { name: 'Aléatoire', description: 'Un combattant au hasard' } as const;

/**
 * The character select screen: a grid of tiles, one per fighter and the rest kept for those to
 * come, with a yellow frame around the one under the cursor; beside it, that fighter standing
 * in guard, its name and what it plays like. Driven by keyboard, gamepad, mouse or touch like a
 * menu (a tap or a click picks). Nothing is focusable: the selection is managed here.
 */
export class FighterSelect<Id extends string> {
  private readonly root: HTMLDivElement;
  private readonly tiles: HTMLButtonElement[] = [];
  private readonly figure: HTMLDivElement;
  private readonly name: HTMLParagraphElement;
  private readonly description: HTMLParagraphElement;
  private readonly layout: GridLayout;
  private cursor: GridCursor = { index: 0, column: 0 };
  private frameRequest = 0;
  /** The idle of the fighter shown, while it plays. */
  private playing: Animation | undefined;

  /** Gamepad buttons held on the previous poll; starts with what is held right now. */
  private previousPad = readMenuPad();

  constructor(
    parent: HTMLElement,
    private readonly options: FighterSelectOptions<Id>,
  ) {
    const { fighters, slots, columns } = options;
    this.layout = { tiles: slots, columns, extra: options.onRandom !== undefined };
    this.root = element('div', 'menu select');
    const panel = element('div', 'select-panel');
    panel.appendChild(element('h1', 'menu-title', options.title));
    if (options.subtitle) panel.appendChild(element('p', 'menu-subtitle', options.subtitle));

    const body = element('div', 'select-body');
    const preview = element('div', 'select-preview');
    this.figure = element('div', 'select-figure');
    this.name = element('p', 'select-name');
    this.description = element('p', 'select-description');
    preview.append(this.figure, this.name, this.description);

    const grid = element('div', 'select-grid');
    for (let index = 0; index < slots; index++) {
      const fighter = fighters[index];
      const tile = fighter ? this.fighterTile(fighter) : element('button', 'select-tile locked');
      if (!fighter) tile.appendChild(element('span', 'select-mark', '?'));
      this.wire(tile, index, grid);
    }
    if (options.onRandom) {
      const tile = element('button', 'select-tile select-random', RANDOM.name);
      this.wire(tile, slots, grid);
    }
    body.append(preview, grid);
    panel.appendChild(body);
    // "Echap" without accent: the pixel font has no capital É.
    panel.appendChild(
      element('p', 'menu-help', 'Flèches choisir · Entrée / A valider · Echap / B retour'),
    );
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    const initial = fighters.findIndex(({ id }) => id === options.initial);
    this.select(Math.max(0, initial));
    window.addEventListener('keydown', this.onKeyDown);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    cancelAnimationFrame(this.frameRequest);
    this.playing?.cancel();
    this.root.remove();
  }

  /** A fighter's tile: its bust, its name, and « J1 » on player 1's pick. */
  private fighterTile(fighter: SelectFighter<Id>): HTMLButtonElement {
    const tile = element('button', 'select-tile');
    const portrait = element('span', 'select-portrait');
    if (fighter.look) paintPortrait(portrait, fighter.look);
    tile.append(portrait, element('span', 'select-tile-name', fighter.name));
    if (fighter.id === this.options.taken) tile.appendChild(element('span', 'select-badge', 'J1'));
    return tile;
  }

  /** Puts `tile` in the grid as tile `index`: the pointer selects it, a click or a tap picks it. */
  private wire(tile: HTMLButtonElement, index: number, grid: HTMLElement): void {
    tile.type = 'button';
    tile.tabIndex = -1;
    tile.addEventListener('pointerenter', () => {
      this.select(index);
    });
    tile.addEventListener('click', () => {
      this.select(index);
      this.activate();
    });
    grid.appendChild(tile);
    this.tiles.push(tile);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = MENU_KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    // Holding a key moves along the grid, but never confirms or goes back twice.
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
      // A confirm or back may have closed this screen: the rest of the press is not for it.
      if (!this.root.isConnected) return;
    }
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };

  private handle(action: MenuAction): void {
    switch (action) {
      case 'confirm':
        this.activate();
        break;
      case 'back':
        if (!this.options.onBack) break;
        this.options.feedback?.('back');
        this.options.onBack();
        break;
      default: {
        const moved = movedCursor(this.cursor, action, this.layout);
        if (moved.index === this.cursor.index) break;
        this.options.feedback?.('move');
        this.select(moved.index, moved.column);
      }
    }
  }

  /** Puts the yellow frame on tile `index` and shows who stands there. */
  private select(index: number, column = index % this.layout.columns): void {
    this.tiles[this.cursor.index]?.classList.remove('selected');
    this.cursor = {
      index,
      column: index < this.layout.tiles ? index % this.layout.columns : column,
    };
    this.tiles[index]?.classList.add('selected');
    const fighter = this.options.fighters[index];
    const about = fighter ?? (index < this.layout.tiles ? COMING : RANDOM);
    this.name.textContent = about.name;
    this.description.textContent = about.description;
    const mirrored = fighter && fighter.id === this.options.taken;
    const look = mirrored ? (fighter.mirrorLook ?? fighter.look) : fighter?.look;
    this.paintFigure(look);
  }

  /** The fighter standing in guard, its idle playing; an empty frame when none stands there. */
  private paintFigure(look: FighterLook | undefined): void {
    const { figure } = this;
    this.playing?.cancel();
    this.playing = undefined;
    figure.classList.remove('empty');
    if (!look) {
      figure.classList.add('empty');
      figure.style.backgroundImage = 'none';
      return;
    }
    const { strip, frames, width, height, idle } = look;
    figure.style.backgroundImage = `url("${strip}")`;
    figure.style.backgroundSize = `${percent(frames)} 100%`;
    figure.style.backgroundPositionX = stripPosition(idle[0]?.frame ?? 0, frames);
    figure.style.aspectRatio = `${width} / ${height}`;
    // Kept still, the fighter stands on its first frame.
    if (idle.length < 2 || this.options.still === true) return;
    const { keyframes, duration } = idleKeyframes(look);
    this.playing = figure.animate(keyframes, { duration, iterations: Infinity });
  }

  /** Picks what the frame is on: a fighter, or one at random. A tile to come does nothing. */
  private activate(): void {
    const { index } = this.cursor;
    const fighter = this.options.fighters[index];
    if (fighter) {
      this.options.feedback?.('confirm');
      this.options.onPick(fighter.id);
    } else if (index === this.layout.tiles && this.options.onRandom) {
      this.options.feedback?.('confirm');
      this.options.onRandom();
    }
  }
}

/** The bust of `look` on its tile: its square of the first frame, scaled to the tile. */
function paintPortrait(portrait: HTMLElement, look: FighterLook): void {
  const { strip, frames, width, height } = look;
  const { x, y, size } = look.portrait;
  const stripWidth = frames * width;
  portrait.style.backgroundImage = `url("${strip}")`;
  portrait.style.backgroundSize = `${percent(stripWidth / size)} ${percent(height / size)}`;
  portrait.style.backgroundPosition = `${percent(x / (stripWidth - size))} ${percent(height > size ? y / (height - size) : 0)}`;
}

/**
 * The idle of `look` as keyframes, each frame of the strip held until the next (`step-end`): the
 * pace of the game, its uneven steps included, which a CSS `steps()` would even out.
 */
function idleKeyframes({ frames, idle }: FighterLook): { keyframes: Keyframe[]; duration: number } {
  const total = idle.reduce((sum, { seconds }) => sum + seconds, 0);
  const keyframes: Keyframe[] = [];
  let start = 0;
  for (const { frame, seconds } of idle) {
    keyframes.push({
      offset: start / total,
      easing: 'step-end',
      backgroundPositionX: stripPosition(frame, frames),
    });
    start += seconds;
  }
  // The last frame holds to the end of the loop.
  keyframes.push({
    offset: 1,
    backgroundPositionX: stripPosition(idle.at(-1)?.frame ?? 0, frames),
  });
  return { keyframes, duration: total * 1000 };
}

/** Where the strip sits to show its frame `frame`, out of `frames` side by side. */
function stripPosition(frame: number, frames: number): string {
  return frames > 1 ? percent(frame / (frames - 1)) : '0%';
}

function percent(ratio: number): string {
  return `${Math.round(ratio * 10000) / 100}%`;
}
