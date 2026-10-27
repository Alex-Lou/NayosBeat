import type { Cell } from '../art/types';

/**
 * The origin that puts a cell's feet anchor on the sprite's position. Phaser mirrors a flipped
 * frame inside its own box (around the frame's centre, not around its origin), so the anchor of
 * a flipped cell sits at the mirrored place: without this, a fighter facing left would be drawn
 * (width - 2 * anchor.x) / 2 world pixels away from where the game places it.
 */
export function anchorOrigin(cell: Cell, flip: boolean): { x: number; y: number } {
  const x = cell.anchor.x / cell.width;
  return { x: flip ? 1 - x : x, y: cell.anchor.y / cell.height };
}
