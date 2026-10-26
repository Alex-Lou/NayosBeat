import type { Box } from './config';
import type { Facing } from './state';

/** An axis-aligned rectangle in stage coordinates (y pointing up from the ground). */
export interface WorldBox {
  readonly left: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/** Places a fighter-relative box in the stage, mirroring it when the fighter faces left. */
export function toWorld(box: Box, x: number, y: number, facing: Facing): WorldBox {
  const left = facing === 1 ? x + box.x : x - box.x - box.width;
  return { left, bottom: y + box.y, width: box.width, height: box.height };
}

export function intersects(a: WorldBox, b: WorldBox): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.bottom < b.bottom + b.height &&
    b.bottom < a.bottom + a.height
  );
}
