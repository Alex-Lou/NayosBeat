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
import { movedCursor, type GridCursor, type GridLayout } from './select-grid';

/** How a fighter looks on the select screen: its standing pose, from its idle strip. */
export interface FighterLook {
  /** URL of the idle strip's image: its frames cut and packed (an atlas), or side by side. */
  readonly strip: string;
  /** That image's size, in art pixels. */
  readonly image: { readonly width: number; readonly height: number };
  /** One frame, its whole cell, in art pixels. */
  readonly width: number;
  readonly height: number;
  /** Where each frame of the strip is in the image. */
  readonly cuts: readonly FrameCut[];
  /** The bust on its tile: a square of the first frame, in art pixels. */
  readonly portrait: { readonly x: number; readonly y: number; readonly size: number };
  /** The bust drawn for the tile (its URL), shown whole in place of `portrait`. */
  readonly portraitImage?: string;
  /** Its idle at the game's pace: the frames of the strip it plays in turn, round and round. */
  readonly idle: readonly IdleFrame[];
}

/**
 * A frame of the strip as its image holds it: the rectangle of its cell it shows (around it, the
 * cell is empty), in art pixels, and where that rectangle's top left corner is in the image.
 */
export interface FrameCut {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

/** One step of an idle: a frame of the strip, and how long it stays on screen. */
export interface IdleFrame {
  readonly frame: number;
  readonly seconds: number;
}

/** A rectangle of a cell, in art pixels: the part an element shows (the whole cell, the bust). */
interface View {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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
  /** The fighter shown in the figure: its frame (`cutElement`), and its idle while it plays. */
  private shown: HTMLElement | undefined;
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
    // The frame shown is placed in it (`cutElement`).
    this.figure.style.position = 'relative';
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
      helpLine('Flèches choisir · Entrée / A valider · Echap / B retour', 'Touche un combattant'),
    );
    if (options.onBack) this.root.appendChild(backButton(options.onBack, options.feedback));
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
    this.shown?.remove();
    this.shown = undefined;
    figure.classList.remove('empty');
    if (!look) {
      figure.classList.add('empty');
      return;
    }
    const { width, height, idle } = look;
    const cell = { x: 0, y: 0, width, height };
    figure.style.aspectRatio = `${width} / ${height}`;
    this.shown = cutElement(look, idle[0]?.frame ?? 0, cell);
    figure.appendChild(this.shown);
    // Kept still, the fighter stands on its first frame.
    if (idle.length < 2 || this.options.still === true) return;
    const { keyframes, duration } = idleKeyframes(look, cell);
    this.playing = this.shown.animate(keyframes, { duration, iterations: Infinity });
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

/**
 * The bust of `look` on its tile, scaled to the tile: the one drawn for it, else its square of the
 * first frame.
 */
function paintPortrait(portrait: HTMLElement, look: FighterLook): void {
  if (look.portraitImage !== undefined) {
    portrait.style.backgroundImage = `url("${look.portraitImage}")`;
    portrait.style.backgroundSize = '100% 100%';
    portrait.style.backgroundPosition = '0 0';
    return;
  }
  const { x, y, size } = look.portrait;
  portrait.appendChild(cutElement(look, 0, { x, y, width: size, height: size }));
}

/**
 * Frame `frame` of `look`, in an element that its parent (which shows `view` of the cell, scaled
 * to its size) places over the frame's cut: the image shows there, the rest of the cell is empty.
 */
function cutElement(look: FighterLook, frame: number, view: View): HTMLElement {
  const cut = element('span', 'select-cut');
  Object.assign(cut.style, {
    position: 'absolute',
    backgroundImage: `url("${look.strip}")`,
    backgroundRepeat: 'no-repeat',
    ...cutStyle(look, frame, view),
  });
  return cut;
}

/**
 * Where the element of `cutElement` goes to show frame `frame`, in percentages of its parent (which
 * shows `view`), and where its image goes in it: the part of the frame's cut inside the view.
 */
function cutStyle(look: FighterLook, frame: number, view: View): Record<string, string> {
  const cut = look.cuts[frame] ?? { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 };
  const x = Math.max(cut.x, view.x);
  const y = Math.max(cut.y, view.y);
  const width = Math.max(0, Math.min(cut.x + cut.width, view.x + view.width) - x);
  const height = Math.max(0, Math.min(cut.y + cut.height, view.y + view.height) - y);
  const { image } = look;
  // The image scaled so that `width` by `height` of it fill the element, moved so that the
  // part shown starts at the element's corner (a percentage of the room left around it).
  const scale = (size: number, part: number): string => (part > 0 ? percent(size / part) : '0%');
  const shift = (at: number, room: number): string => (room > 0 ? percent(at / room) : '0%');
  return {
    left: percent((x - view.x) / view.width),
    top: percent((y - view.y) / view.height),
    width: percent(width / view.width),
    height: percent(height / view.height),
    backgroundSize: `${scale(image.width, width)} ${scale(image.height, height)}`,
    backgroundPosition: `${shift(cut.left + x - cut.x, image.width - width)} ${shift(cut.top + y - cut.y, image.height - height)}`,
  };
}

/**
 * The idle of `look` as keyframes of the element of `cutElement`, each frame of the strip held
 * until the next (`step-end`): the pace of the game, its uneven steps included, which a CSS
 * `steps()` would even out.
 */
function idleKeyframes(look: FighterLook, view: View): { keyframes: Keyframe[]; duration: number } {
  const { idle } = look;
  const total = idle.reduce((sum, { seconds }) => sum + seconds, 0);
  const keyframes: Keyframe[] = [];
  let start = 0;
  for (const { frame, seconds } of idle) {
    keyframes.push({ offset: start / total, easing: 'step-end', ...cutStyle(look, frame, view) });
    start += seconds;
  }
  // The last frame holds to the end of the loop.
  keyframes.push({ offset: 1, ...cutStyle(look, idle.at(-1)?.frame ?? 0, view) });
  return { keyframes, duration: total * 1000 };
}

function percent(ratio: number): string {
  return `${Math.round(ratio * 10000) / 100}%`;
}
