/**
 * Shared vocabulary of Nayo's animation: authoring helpers and the reference poses every strip
 * starts from. Character space (see skeleton.ts): feet anchor at the origin, x toward the
 * opponent, y up, in world pixels; a flat foot on the ground has its ankle at BODY.ankle.
 *
 * Neutral poses (guard, walks, crouch, block) keep everything above the shins inside the
 * pushbox (14 px each side, 16 crouching): at point blank the two fighters touch, they never
 * look locked in a clinch. tests/tools/sprites.test.ts checks it.
 */

import type { Point } from '../../raster.ts';
import { blend, planted, type Effect, type Foot, type Pose } from '../../skeleton.ts';

export { blend, planted, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

/** A foot raised `height` pixels off the ground (a step). */
export function lifted(foot: Foot, height: number): Foot {
  return { ...foot, y: foot.y + height };
}

/** Motion trail of a fast limb through `points` (tail first), `width` px wide at the limb. */
export function smear(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  return { kind: 'smear', width, points: points.map(([x, y]) => at(x, y)) };
}

/** Sound energy held in the hands. */
export function energy(x: number, y: number, radius: number): Effect {
  return { kind: 'energy', center: at(x, y), radius };
}

/** Easing curves for in-betweens, `t` from 0 to 1. */
export const ease = {
  linear: (t: number): number => t,
  /** Fast start, soft landing: strikes snapping out, recoveries settling. */
  out: (t: number): number => 1 - (1 - t) * (1 - t),
  /** Soft start, fast end: anticipations, wind-ups. */
  in: (t: number): number => t * t,
  inOut: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
} as const;

/** The pose `t` of the way from `a` to `b`, along an easing curve. */
export function tween(
  a: Pose,
  b: Pose,
  t: number,
  curve: (t: number) => number = ease.inOut,
): Pose {
  return blend(a, b, curve(t));
}

// ---------------------------------------------------------------------------------------------
// Reference poses

/**
 * The guard, a "Philly shell": lead shoulder rolled up to the chin, lead arm low across the
 * body, rear fist by the jaw, weight on the back leg. Classy, and compact enough that two
 * fighters at point blank only touch.
 */
export const GUARD: Pose = {
  hip: at(-3.2, 37.2),
  torso: -2,
  head: 10,
  shrug: 3.4,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5),
  nearFist: at(7.5, 43),
  farFist: at(7.5, 62),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

/** Crouching guard: low, compact, forearms up in front of the face and the chest. */
export const CROUCH: Pose = {
  hip: at(-2, 21),
  torso: 36,
  head: -12,
  shrug: 2,
  nearFoot: planted(9),
  farFoot: planted(-11, -14),
  nearFist: at(13, 38),
  farFist: at(11, 46),
};
