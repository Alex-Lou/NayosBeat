/**
 * The cell every frame of a strip is drawn in (CELL_SIZE, the feet on ANCHOR): what any strip
 * keeps to, drawn by code (tests/tools) or by hand (drawn.ts), and where a box of the frame data
 * falls in it.
 */

import { ANCHOR, ART_SCALE } from '../../src/art/types.ts';

/** Empty sprite pixels kept along the left, right and top edges of a cell: 2 world px. */
export const CELL_MARGIN = 4;
/** The lowest row a body may draw on: the soles end on the anchor's row, give or take. */
export const LOWEST_ROW = ANCHOR.y + 2;
/** The row the lowest pixel of a body standing on the ground reaches at least. */
export const GROUND_ROW = ANCHOR.y - 2;
/** The strips whose feet stand on the ground in every frame. */
export const GROUNDED_STRIPS = ['idle', 'walkForward', 'walkBack', 'crouch', 'block'] as const;

/** A box in world pixels: x toward the opponent and y up, from the feet. */
export interface WorldBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The pixels a box covers in a cell, edges included (not clipped to the cell). */
export interface CellBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * Where a world box falls in a cell. World y 0 is the bottom edge of the row above the anchor's
 * (measure.ts), so a box standing on the ground ends on that row.
 */
export function cellBoxOf(box: WorldBox): CellBox {
  return {
    left: Math.round(ANCHOR.x + box.x * ART_SCALE),
    right: Math.round(ANCHOR.x + (box.x + box.width) * ART_SCALE) - 1,
    top: Math.round(ANCHOR.y - (box.y + box.height) * ART_SCALE),
    bottom: Math.round(ANCHOR.y - box.y * ART_SCALE) - 1,
  };
}
