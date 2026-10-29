/** A move of the cursor on the character select screen. */
export type GridMove = 'up' | 'down' | 'left' | 'right';

/**
 * The select screen's tiles: `tiles` in rows of `columns`, and, when `extra`, one more tile
 * under the grid (index `tiles`: « Aléatoire »).
 */
export interface GridLayout {
  readonly tiles: number;
  readonly columns: number;
  readonly extra: boolean;
}

/** Where the cursor stands: a tile, and the grid column it last stood in. */
export interface GridCursor {
  readonly index: number;
  readonly column: number;
}

/**
 * Where `move` takes the cursor. Left and right go round their row; up and down stop at the
 * edges of the grid, except that down from its last row reaches the extra tile, and up from
 * the extra tile goes back to the column the cursor came from. A move with nowhere to go
 * leaves the cursor where it is.
 */
export function movedCursor(cursor: GridCursor, move: GridMove, layout: GridLayout): GridCursor {
  const { tiles, columns, extra } = layout;
  const rows = Math.ceil(tiles / columns);
  if (cursor.index >= tiles) {
    if (move !== 'up') return cursor;
    const lastRow = (rows - 1) * columns;
    return { index: Math.min(lastRow + cursor.column, tiles - 1), column: cursor.column };
  }
  const row = Math.floor(cursor.index / columns);
  const column = cursor.index % columns;
  const rowStart = row * columns;
  const rowLength = Math.min(columns, tiles - rowStart);
  switch (move) {
    case 'left':
    case 'right': {
      const step = move === 'left' ? rowLength - 1 : 1;
      const next = rowStart + ((column + step) % rowLength);
      return { index: next, column: next % columns };
    }
    case 'up':
      return row === 0 ? cursor : { index: cursor.index - columns, column };
    case 'down': {
      const below = cursor.index + columns;
      if (below < tiles) return { index: below, column };
      return extra && row === rows - 1 ? { index: tiles, column } : cursor;
    }
  }
}
