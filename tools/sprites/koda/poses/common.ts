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
 * Koda's guard: an anime-fighter / kung-fu open-hand resonance stance (distinct from Nayo's high
 * boxing guard). The lead arm is extended lower at rib/solar-plexus height (`y = 46.5`) with an
 * open knife-hand showing the silver gauntlet's tuning blade; the rear hand is poised high and
 * back near the temple/collar (`x = 5.5, y = 62.5`), open palm ready to clash the two gauntlets.
 */
export const GUARD: Pose = {
  hip: at(-6.6, 36.5),
  torso: 14,
  head: 2,
  shrug: 1.2,
  nearFoot: planted(6.35, -2),
  farFoot: planted(-22, -15),
  nearFist: at(9.0, 48.0),
  farFist: at(9.8, 61.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
};

/** Crouching guard: low martial stance, open knife-hands and silver gauntlets poised. */
export const CROUCH: Pose = {
  hip: at(-2, 21),
  torso: 36,
  head: -12,
  shrug: 2,
  nearFoot: planted(9),
  farFoot: planted(-11, -14),
  nearFist: at(12.2, 35.5),
  farFist: at(8.5, 46.5),
  nearHand: 'open',
  farHand: 'open',
};
