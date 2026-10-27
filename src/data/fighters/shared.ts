/** What every fighter's data is written with: authoring helpers and shared rules. */

import type { Box } from '../../core/config';
import { px } from '../../core/constants';
import type { FrameRange, MoveKind, RootMotion } from '../../core/move-data';

/** A fighter-relative box in pixels (see `Box`). */
export function box(x: number, y: number, width: number, height: number): Box {
  return { x: px(x), y: px(y), width: px(width), height: px(height) };
}

/**
 * The motion of a move lasting `frames` ticks that steps forward at `speed` pixels per tick
 * from frame `from` (included) to `to` (excluded), and stands still otherwise.
 */
export function advance(
  frames: number,
  { from, to, speed }: FrameRange & { readonly speed: number },
): RootMotion {
  const step = px(speed);
  return {
    dx: Array.from({ length: frames }, (_, frame) => (frame >= from && frame < to ? step : 0)),
  };
}

/** Light normals chain into other normals and specials on contact; heavies into specials. */
export const LIGHT_CANCELS: readonly MoveKind[] = ['normal', 'special'];
export const HEAVY_CANCELS: readonly MoveKind[] = ['special'];
