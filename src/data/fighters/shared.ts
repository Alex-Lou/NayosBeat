/** What every fighter's data is written with: authoring helpers and shared rules. */

import type { Box } from '../../core/config';
import { px } from '../../core/constants';
import type {
  FrameRange,
  Guard,
  Knockdown,
  MoveData,
  MoveHurtbox,
  MoveKind,
  RootMotion,
} from '../../core/move-data';

/**
 * How a blow is written, in the order of the frame data tables (docs/combat-v2.md §10): frames
 * (startup, active, recovery), damage, stun (hitstun, 0 for a knockdown; blockstun), hitstop,
 * pushback in pixels per tick, guard, then what it has of its own.
 */
interface StrikeSpec extends Omit<
  MoveData,
  'kind' | 'startup' | 'active' | 'recovery' | 'hitstun' | 'blockstun' | 'pushback'
> {
  /** A normal unless told. */
  readonly kind?: 'normal' | 'special';
  readonly frames: readonly [startup: number, active: number, recovery: number];
  readonly stun: readonly [hitstun: number, blockstun: number];
  readonly pushbackPx: number;
  readonly guard: Guard;
}

/** A strike (a normal or a special) from its line of the frame data table. */
export function strike(spec: StrikeSpec): MoveData {
  const { kind = 'normal', frames, stun, pushbackPx, ...own } = spec;
  const [startup, active, recovery] = frames;
  const [hitstun, blockstun] = stun;
  return { ...own, kind, startup, active, recovery, hitstun, blockstun, pushback: px(pushbackPx) };
}

/** A fighter-relative box in pixels (see `Box`). */
export function box(x: number, y: number, width: number, height: number): Box {
  return { x: px(x), y: px(y), width: px(width), height: px(height) };
}

/**
 * Sends the defender flying at `liftPx` up and `speedPx` away (pixels per tick), then down; a
 * sweep trips it onto its back, a launcher allows one more blow in the air (`juggle`).
 */
export function kd(
  liftPx: number,
  speedPx: number,
  how: Pick<Knockdown, 'trip' | 'juggle'> = {},
): Knockdown {
  return { vx: px(speedPx), vy: px(liftPx), ...how };
}

/**
 * The motion of a move lasting `frames` ticks that steps forward from frame `from` (included)
 * to `to` (excluded), and stands still otherwise: at `speed` pixels per tick, or `distancePx`
 * pixels in all, spread as evenly as whole sub-pixels allow (the steps add up exactly).
 */
export function advance(
  frames: number,
  range: FrameRange & ({ readonly speed: number } | { readonly distancePx: number }),
): RootMotion {
  const { from, to } = range;
  const steps =
    'speed' in range
      ? Array.from({ length: to - from }, () => px(range.speed))
      : evenSteps(px(range.distancePx), to - from);
  return { dx: placed(frames, from, steps) };
}

/**
 * A move that glides `distancePx` pixels from frame `from` to `to` (excluded) on the dash's
 * ease-out (`dashCurve`): thrown into it, then braking (the Glissade).
 */
export function glide(
  frames: number,
  { from, to, distancePx }: FrameRange & { readonly distancePx: number },
): RootMotion {
  return { dx: placed(frames, from, dashCurve(distancePx, to - from)) };
}

/**
 * A leap that really leaves the ground (the Saut de l'ange): the height of the feet on each
 * frame, a half sine from frame `from` (just off the floor) to `to` (back on it), `apexPx` high
 * in the middle. Whole sub-pixels, computed once with the data.
 */
export function leapArc(
  frames: number,
  { from, to, apexPx }: FrameRange & { readonly apexPx: number },
): number[] {
  const span = to - from + 1;
  return Array.from({ length: frames }, (_, frame) =>
    frame >= from && frame < to
      ? Math.round(px(apexPx) * Math.sin((Math.PI * (frame - from + 1)) / span))
      : 0,
  );
}

/** `total` sub-pixels in `count` steps as even as whole numbers allow, adding up exactly. */
function evenSteps(total: number, count: number): number[] {
  return Array.from(
    { length: count },
    (_, i) => Math.floor((total * (i + 1)) / count) - Math.floor((total * i) / count),
  );
}

/** One entry per frame of a move lasting `frames` ticks: `steps` from frame `from`, 0 elsewhere. */
function placed(frames: number, from: number, steps: readonly number[]): number[] {
  return Array.from({ length: frames }, (_, frame) => steps[frame - from] ?? 0);
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
  /** Its own hurtboxes where the drawing leaves the posture's (a hop, a flip). */
  readonly hurtboxes?: readonly MoveHurtbox[];
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
    ...(spec.hurtboxes && { hurtboxes: spec.hurtboxes }),
    ...(spec.freeCancelFrom !== undefined && {
      freeCancelFrom: spec.freeCancelFrom,
      cancelInto: FOOTWORK_CANCELS,
    }),
  };
}

/**
 * The cancel table (docs/combat-v2.md §7.1), once a move has hit or been blocked, until its
 * end: lights (L, ↓L, Riff's Toprock) into another normal or a special; heavies, the second hit
 * of the chain, Nayo's Jab chassé and the launchers into a special. Overheads, sweeps, the
 * chain's finishers, air attacks, specials and grabs cancel into nothing (no `cancelInto`).
 * The chain itself is the moves' `chain`.
 */
export const LIGHT_CANCELS: readonly MoveKind[] = ['normal', 'special'];
export const HEAVY_CANCELS: readonly MoveKind[] = ['special'];

/** How a pummel or a throw is written: what happens on the held opponent (docs/combat-v2.md §4.3). */
interface ThrowSpec {
  readonly name: string;
  /** The frame the pummel lands, or the throw lets go. */
  readonly startup: number;
  readonly recovery: number;
  /** Fixed: no scaling, no bonus. */
  readonly damage: number;
  readonly hitstop: number;
  /** Throws only: the flight of the opponent let go. */
  readonly knockdown?: Knockdown;
  /** The throw backward: when the opponent goes over to the holder's back. */
  readonly sideSwitchFrame?: number;
}

/**
 * A pummel or a throw as a move of kind `throw`: played on the held opponent, it lands on its
 * startup frame (one active tick) without a hitbox, and nothing blocks it.
 */
export function throwMove(spec: ThrowSpec): MoveData {
  const { knockdown, sideSwitchFrame, ...timing } = spec;
  return {
    ...timing,
    kind: 'throw',
    active: 1,
    hitstun: 0,
    blockstun: 0,
    pushback: 0,
    guard: 'mid',
    ...(knockdown && { knockdown }),
    ...(sideSwitchFrame !== undefined && { sideSwitchFrame }),
  };
}
