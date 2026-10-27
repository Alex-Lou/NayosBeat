import type { Box } from './config';
import type { Facing } from './state';

/** An axis-aligned rectangle in stage coordinates (y pointing up from the ground). */
export interface WorldBox {
  readonly left: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Places a fighter-relative box in the stage, mirroring it when the fighter faces left.
 * For drawing (debug view, grey boxes): collisions use `overlaps`, which allocates nothing.
 */
export function toWorld(box: Box, x: number, y: number, facing: Facing): WorldBox {
  return {
    left: leftEdge(box, x, facing),
    bottom: y + box.y,
    width: box.width,
    height: box.height,
  };
}

/** Whether two fighter-relative boxes, each placed at its owner's position, overlap. */
export function overlaps(
  box: Box,
  x: number,
  y: number,
  facing: Facing,
  other: Box,
  otherX: number,
  otherY: number,
  otherFacing: Facing,
): boolean {
  const left = leftEdge(box, x, facing);
  const otherLeft = leftEdge(other, otherX, otherFacing);
  const bottom = y + box.y;
  const otherBottom = otherY + other.y;
  return (
    left < otherLeft + other.width &&
    otherLeft < left + box.width &&
    bottom < otherBottom + other.height &&
    otherBottom < bottom + box.height
  );
}

/** Horizontal middle of the overlap of two placed boxes (see `overlaps`), in sub-pixels. */
export function overlapMiddleX(
  box: Box,
  x: number,
  facing: Facing,
  other: Box,
  otherX: number,
  otherFacing: Facing,
): number {
  const left = leftEdge(box, x, facing);
  const otherLeft = leftEdge(other, otherX, otherFacing);
  const from = Math.max(left, otherLeft);
  const to = Math.min(left + box.width, otherLeft + other.width);
  return Math.trunc((from + to) / 2);
}

/** Vertical middle of the overlap of two placed boxes (see `overlaps`), in sub-pixels. */
export function overlapMiddleY(box: Box, y: number, other: Box, otherY: number): number {
  const from = Math.max(y + box.y, otherY + other.y);
  const to = Math.min(y + box.y + box.height, otherY + other.y + other.height);
  return Math.trunc((from + to) / 2);
}

function leftEdge(box: Box, x: number, facing: Facing): number {
  return facing === 1 ? x + box.x : x - box.x - box.width;
}
