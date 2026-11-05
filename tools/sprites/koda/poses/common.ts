/**
 * Shared vocabulary of Koda's animation: authoring helpers and the reference poses every strip
 * starts from. Character space (see skeleton.ts): feet anchor at the origin, x toward the
 * opponent, y up, in world pixels; a flat foot on the ground has its ankle at BODY.ankle.
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

/** Acoustic energy held on the silver bracers or palms. */
export function energy(x: number, y: number, radius: number): Effect {
  return { kind: 'energy', center: at(x, y), radius };
}

/** Easing curves for in-betweens, `t` from 0 to 1. */
export const ease = {
  linear: (t: number): number => t,
  out: (t: number): number => 1 - (1 - t) * (1 - t),
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
 * Koda's guard: a martial-arts open-palm acoustic stance. The lead hand is open at chest height to
 * feel the vibration, the silver forearm vambrace angled forward; the rear hand is open and
 * chambered higher near the collar/cheek, ready to clash the two silver bracers together.
 */
export const GUARD: Pose = {
  hip: at(-6.6, 36.5),
  torso: 15,
  head: 2,
  shrug: 1,
  nearFoot: planted(6.35, -2),
  farFoot: planted(-22, -15),
  nearFist: at(8.6, 52.0),
  farFist: at(9.8, 61.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
};

/** Crouching guard: low martial stance, open palms and silver vambraces raised in front. */
export const CROUCH: Pose = {
  hip: at(-2, 21),
  torso: 36,
  head: -12,
  shrug: 2,
  nearFoot: planted(9),
  farFoot: planted(-11, -14),
  nearFist: at(12.2, 37.5),
  farFist: at(10.5, 45.5),
  nearHand: 'open',
  farHand: 'open',
};
