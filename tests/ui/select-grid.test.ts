import { describe, expect, it } from 'vitest';
import { movedCursor, type GridLayout, type GridMove } from '../../src/ui/select-grid';

/** The select screen's grid: two rows of five, « Aléatoire » under them. */
const GRID: GridLayout = { tiles: 10, columns: 5, extra: true };

/** Where `moves` take the cursor from tile `index`. */
function walk(index: number, moves: readonly GridMove[], layout = GRID): number {
  let cursor = { index, column: index % layout.columns };
  for (const move of moves) cursor = movedCursor(cursor, move, layout);
  return cursor.index;
}

describe('select grid', () => {
  it('goes round its row left and right', () => {
    expect(walk(0, ['right'])).toBe(1);
    expect(walk(4, ['right'])).toBe(0);
    expect(walk(0, ['left'])).toBe(4);
    expect(walk(9, ['right'])).toBe(5);
    expect(walk(5, ['left'])).toBe(9);
  });

  it('moves between rows, and stops at the top', () => {
    expect(walk(2, ['down'])).toBe(7);
    expect(walk(7, ['up'])).toBe(2);
    expect(walk(2, ['up'])).toBe(2);
  });

  it('reaches « Aléatoire » down from the last row, and comes back to the same column', () => {
    expect(walk(8, ['down'])).toBe(10);
    expect(walk(8, ['down', 'up'])).toBe(8);
    expect(walk(3, ['down', 'down', 'up', 'up'])).toBe(3);
  });

  it('stays on « Aléatoire » for any move but up', () => {
    for (const move of ['down', 'left', 'right'] as const) {
      expect(movedCursor({ index: 10, column: 3 }, move, GRID)).toEqual({ index: 10, column: 3 });
    }
  });

  it('stops at the bottom when there is no « Aléatoire »', () => {
    expect(walk(7, ['down'], { ...GRID, extra: false })).toBe(7);
  });

  it('keeps to the tiles of a short last row', () => {
    const short: GridLayout = { tiles: 7, columns: 5, extra: true };
    expect(walk(6, ['right'], short)).toBe(5);
    expect(walk(5, ['left'], short)).toBe(6);
    // Nothing under the end of the first row: the cursor stays.
    expect(walk(3, ['down'], short)).toBe(3);
    expect(walk(1, ['down', 'down'], short)).toBe(7);
    // Back up from « Aléatoire » in a column the short row lacks: its last tile.
    expect(movedCursor({ index: 7, column: 4 }, 'up', short)).toEqual({ index: 6, column: 4 });
  });

  it('goes round a single row', () => {
    const single: GridLayout = { tiles: 2, columns: 5, extra: false };
    expect(walk(1, ['right'], single)).toBe(0);
    expect(walk(0, ['left'], single)).toBe(1);
    expect(walk(0, ['up'], single)).toBe(0);
    expect(walk(0, ['down'], single)).toBe(0);
  });
});
