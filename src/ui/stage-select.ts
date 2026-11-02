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

/**
 * A layer of a place's thumbnail: its image, where it lies over the view and how large, each a
 * share of the view's width or height (0 to 1, beyond where it overflows: the view crops it).
 */
export interface ThumbLayer {
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A place the screen offers: its name, what it is like, its thumbnail (back to front). */
export interface SelectPlace<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly thumb: readonly ThumbLayer[];
}

export interface StageSelectOptions<Id extends string> {
  readonly places: readonly SelectPlace<Id>[];
  /** Tiles a row: « Aléatoire » first, then the places. */
  readonly columns: number;
  /** The place the cursor starts on; « Aléatoire » when none. */
  readonly initial?: Id | 'random';
  readonly onPick: (id: Id | 'random') => void;
  /** Escape / B / back button. */
  readonly onBack: () => void;
  /** Called on navigation, e.g. to play a sound. */
  readonly feedback?: (action: MenuFeedback) => void;
}

const RANDOM = { name: 'Aléatoire', description: 'Un lieu au hasard' } as const;

/**
 * The « Lieu » screen (docs/art/decor-rue.md §14): « Aléatoire » first, then a tile per place, its
 * thumbnail the stage as the fight opens on it; beside them, the one under the cursor larger, its
 * name and what it is like. Driven by keyboard, gamepad, mouse or touch like the character select
 * screen (a tap or a click picks). Nothing is focusable: the selection is managed here.
 */
export class StageSelect<Id extends string> {
  private readonly root: HTMLDivElement;
  private readonly tiles: HTMLButtonElement[] = [];
  private readonly view: HTMLDivElement;
  private readonly name: HTMLParagraphElement;
  private readonly description: HTMLParagraphElement;
  private readonly layout: GridLayout;
  private cursor: GridCursor = { index: 0, column: 0 };
  private frameRequest = 0;
  /** Gamepad buttons held on the previous poll; starts with what is held right now. */
  private previousPad = readMenuPad();

  constructor(
    parent: HTMLElement,
    private readonly options: StageSelectOptions<Id>,
  ) {
    const { places, columns } = options;
    this.layout = { tiles: places.length + 1, columns, extra: false };
    this.root = element('div', 'menu select stage-select');
    const panel = element('div', 'select-panel');
    panel.appendChild(element('h1', 'menu-title', 'Lieu'));
    panel.appendChild(element('p', 'menu-subtitle', 'Choisis où se battre'));

    const body = element('div', 'select-body');
    const preview = element('div', 'select-preview stage-preview');
    this.view = element('div', 'stage-thumb stage-view');
    this.name = element('p', 'select-name');
    this.description = element('p', 'select-description');
    preview.append(this.view, this.name, this.description);

    const grid = element('div', 'select-grid');
    grid.style.gridTemplateColumns = `repeat(${columns}, var(--stage-tile))`;
    const random = element('button', 'select-tile stage-tile');
    random.append(
      element('span', 'stage-thumb stage-unknown', '?'),
      element('span', 'select-tile-name', RANDOM.name),
    );
    this.wire(random, 0, grid);
    places.forEach((place, index) => {
      const tile = element('button', 'select-tile stage-tile');
      const thumb = element('span', 'stage-thumb');
      paintThumb(thumb, place.thumb);
      tile.append(thumb, element('span', 'select-tile-name', place.name));
      this.wire(tile, index + 1, grid);
    });
    body.append(preview, grid);
    panel.appendChild(body);
    // "Echap" without accent: the pixel font has no capital É.
    panel.appendChild(
      helpLine('Flèches choisir · Entrée / A valider · Echap / B retour', 'Touche un lieu'),
    );
    this.root.appendChild(backButton(options.onBack, options.feedback));
    this.root.appendChild(panel);
    parent.appendChild(this.root);

    const initial = places.findIndex(({ id }) => id === options.initial);
    this.select(initial + 1);
    window.addEventListener('keydown', this.onKeyDown);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    cancelAnimationFrame(this.frameRequest);
    this.root.remove();
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

  /** Puts the yellow frame on tile `index` and shows that place larger, or « Aléatoire ». */
  private select(index: number, column = index % this.layout.columns): void {
    this.tiles[this.cursor.index]?.classList.remove('selected');
    this.cursor = { index, column };
    this.tiles[index]?.classList.add('selected');
    const place = this.options.places[index - 1];
    this.name.textContent = place?.name ?? RANDOM.name;
    this.description.textContent = place?.description ?? RANDOM.description;
    this.view.replaceChildren();
    if (place) {
      this.view.classList.remove('stage-unknown');
      paintThumb(this.view, place.thumb);
    } else {
      this.view.classList.add('stage-unknown');
      this.view.textContent = '?';
    }
  }

  private activate(): void {
    const place = this.options.places[this.cursor.index - 1];
    this.options.feedback?.('confirm');
    this.options.onPick(place?.id ?? 'random');
  }
}

/** The layers of a thumbnail in `view`, back to front, each where it lies over the view. */
function paintThumb(view: HTMLElement, layers: readonly ThumbLayer[]): void {
  for (const { url, x, y, width, height } of layers) {
    const image = element('img', 'stage-layer');
    image.src = url;
    image.alt = '';
    image.draggable = false;
    Object.assign(image.style, {
      left: percent(x),
      top: percent(y),
      width: percent(width),
      height: percent(height),
    });
    view.appendChild(image);
  }
}

function percent(ratio: number): string {
  return `${Math.round(ratio * 10000) / 100}%`;
}
