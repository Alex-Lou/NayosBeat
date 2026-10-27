/** What every fighter's data is written with: authoring helpers and shared rules. */

import type { Box } from '../../core/config';
import { px } from '../../core/constants';
import type { FrameRange, MoveData, MoveKind, RootMotion } from '../../core/move-data';

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

/**
 * Steps (sub-pixels per tick) of a dash covering `distancePx` pixels in `frames` ticks, on a
 * quadratic ease-out: a strong push, then a soft brake, the "pop" of a fighting-game dash. Each
 * step is the difference of two rounded totals, so the steps add up to the distance exactly.
 * Integer arithmetic only (rounded half up), the same on every engine.
 */
export function dashCurve(distancePx: number, frames: number): number[] {
  const distance = px(distancePx);
  const total = (tick: number): number => {
    const covered = distance * tick * (2 * frames - tick);
    const square = frames * frames;
    return Math.floor((2 * covered + square) / (2 * square));
  };
  return Array.from({ length: frames }, (_, i) => total(i + 1) - total(i));
}

/** How a dash or backdash is written: frame 0 sets off, the curve, then the recovery. */
interface DashSpec {
  readonly name: string;
  /** Ticks of the whole move. */
  readonly duration: number;
  /** Ticks during which it moves, from frame 1. */
  readonly frames: number;
  readonly distancePx: number;
  /** Backward: a backdash. */
  readonly back?: boolean;
  readonly throwInvincible?: FrameRange;
  /** Riff's footwork: cancelled from this frame into a normal or the grab, momentum kept. */
  readonly freeCancelFrom?: number;
}

/** A footwork dash is cancelled into a normal or the grab, never into a special. */
const FOOTWORK_CANCELS: readonly MoveKind[] = ['normal', 'grab'];

/**
 * A dash as a move of kind `movement`: it never strikes, its motion is the curve, and its
 * "active" frames are the ones that move (frame data reads like any move's).
 */
export function dash(spec: DashSpec): MoveData {
  const { name, duration, frames, distancePx, back = false } = spec;
  const steps = dashCurve(distancePx, frames).map((step) => (back ? -step : step));
  const dx = [0, ...steps, ...Array.from({ length: duration - 1 - frames }, () => 0)];
  return {
    name,
    kind: 'movement',
    startup: 1,
    active: frames,
    recovery: duration - 1 - frames,
    damage: 0,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    pushback: 0,
    guard: 'mid',
    motion: { dx },
    ...(spec.throwInvincible && { throwInvincible: spec.throwInvincible }),
    ...(spec.freeCancelFrom !== undefined && {
      freeCancelFrom: spec.freeCancelFrom,
      cancelInto: FOOTWORK_CANCELS,
    }),
  };
}

/** Light normals chain into other normals and specials on contact; heavies into specials. */
export const LIGHT_CANCELS: readonly MoveKind[] = ['normal', 'special'];
export const HEAVY_CANCELS: readonly MoveKind[] = ['special'];
