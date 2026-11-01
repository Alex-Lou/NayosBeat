import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import type { GameState } from '../core/state';
import { PIXEL_FONT } from './hud';
import { EMPTY_METER, METER_CELLS, trackFrames, type Cell, type FrameMeter } from './frame-meter';
import {
  buttonsOf,
  directionOf,
  HISTORY_LINES,
  nextHistory,
  type InputLine,
} from './input-history';
import { VIEW_SIZE } from './view';

/** Over the fight, with the HUD (hud.ts). */
const DEPTH = 10;

/** The history: a column on the left, under the HUD, newest line on top. */
const HISTORY_X = 6;
const HISTORY_TOP = 58;
const LINE_HEIGHT = 10;

/** The meter: two rows of cells, player 1 above player 2, centered under the timer. */
const CELL_WIDTH = 3;
const CELL_GAP = 1;
const CELL_HEIGHT = 4;
const ROW_GAP = 1;
const METER_TOP = 46;
const METER_LEFT = Math.round((VIEW_SIZE.width - METER_CELLS * (CELL_WIDTH + CELL_GAP)) / 2);

/**
 * Each cell, a color and a pattern (its rows of 4, top first): never the color alone (docs/polish,
 * GAG « fixed colour alone »). Startup low, active full, recovery high, stun an outline, free a
 * dim line.
 */
const CELL_LOOKS: Readonly<Record<Cell, { color: number; rows: readonly number[] }>> = {
  free: { color: 0x4a4a6a, rows: [3] },
  startup: { color: 0x3fbf5f, rows: [2, 3] },
  active: { color: 0xff4f4f, rows: [0, 1, 2, 3] },
  recovery: { color: 0x4f8fff, rows: [0, 1] },
  stun: { color: 0xffd84a, rows: [0, 3] },
};

/**
 * The directions as 7×7 arrows, up and up-right; the others turn them. A pixel font of the HUD has
 * no arrow but « ↑ », and a turned letter would blur: the arrows are drawn.
 */
const UP = ['...#...', '..###..', '.#.#.#.', '...#...', '...#...', '...#...', '...#...'];
const UP_RIGHT = ['...####', '.....##', '....#.#', '...#..#', '..#....', '.#.....', '#......'];

/** `bitmap` turned a quarter clockwise. */
function turned(bitmap: readonly string[]): string[] {
  return bitmap.map((_, row) =>
    bitmap
      .map((line) => line[row] ?? '.')
      .reverse()
      .join(''),
  );
}

/** The arrow of each keypad direction (5, none, has no arrow). */
const ARROWS: Readonly<Record<number, readonly string[]>> = (() => {
  const right = turned(UP);
  const down = turned(right);
  const downRight = turned(UP_RIGHT);
  const downLeft = turned(downRight);
  return {
    8: UP,
    9: UP_RIGHT,
    6: right,
    3: downRight,
    2: down,
    1: downLeft,
    4: turned(down),
    7: turned(downLeft),
  };
})();

const ARROW_COLOR = 0xffffff;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: PIXEL_FONT,
  fontSize: '8px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 2,
};

/**
 * Training's complete data (docs/polish/AUDIT-ET-PLAN.md, lot 13): player 1's input history and
 * the frame meter of the last exchange. `record` reads every tick, `update` draws once a frame and
 * only what changed.
 */
export class TrainingView {
  private history: readonly InputLine[] = [];
  private meter: FrameMeter = EMPTY_METER;
  private drawnHistory: readonly InputLine[] | undefined;
  private drawnCells: FrameMeter['cells'] | undefined;
  private readonly arrows: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Text[];
  private readonly cells: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
  ) {
    this.arrows = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.cells = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.lines = Array.from({ length: HISTORY_LINES }, (_, index) =>
      scene.add
        .text(HISTORY_X, HISTORY_TOP + index * LINE_HEIGHT, '', TEXT_STYLE)
        .setScrollFactor(0)
        .setDepth(DEPTH),
    );
  }

  /** One tick of the game: what player 1 held, what both fighters did. */
  record(state: GameState): void {
    this.history = nextHistory(this.history, state.fighters[0].input);
    this.meter = trackFrames(this.meter, state, this.config);
  }

  /** Shown or hidden (the training pause's « Données »). */
  show(on: boolean): void {
    this.arrows.setVisible(on);
    this.cells.setVisible(on);
    for (const line of this.lines) line.setVisible(on);
  }

  update(): void {
    if (this.history !== this.drawnHistory) this.drawHistory();
    if (this.meter.cells !== this.drawnCells) this.drawMeter();
  }

  private drawHistory(): void {
    this.drawnHistory = this.history;
    this.arrows.clear().fillStyle(ARROW_COLOR);
    this.lines.forEach((text, index) => {
      const line = this.history[index];
      const content = line ? `${String(line.ticks).padStart(2)}    ${buttonsOf(line.bits)}` : '';
      if (text.text !== content) text.setText(content);
      const arrow = line ? ARROWS[directionOf(line.bits)] : undefined;
      if (!arrow) return;
      const top = HISTORY_TOP + index * LINE_HEIGHT;
      arrow.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '#') this.arrows.fillRect(HISTORY_X + 20 + x, top + y, 1, 1);
        }
      });
    });
  }

  private drawMeter(): void {
    const cells = this.meter.cells;
    this.drawnCells = cells;
    const g = this.cells.clear();
    cells.forEach((row, player) => {
      const top = METER_TOP + player * (CELL_HEIGHT + ROW_GAP);
      row.forEach((cell, index) => {
        const look = CELL_LOOKS[cell];
        g.fillStyle(look.color);
        const left = METER_LEFT + index * (CELL_WIDTH + CELL_GAP);
        for (const y of look.rows) g.fillRect(left, top + y, CELL_WIDTH, 1);
      });
    });
  }
}
