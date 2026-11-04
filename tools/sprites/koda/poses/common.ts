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
 * The guard: Tazz's own high guard (Zen-Tazzer's defense and powerkick frames). A wide, springy
 * stance, the lead knee over the toes, the rear heel up on the ball of the foot; the torso leans
 * toward the opponent, one line from the rear foot through the hips to the head. Gloves high:
 * the far one up by the cheek, the near one under the chin, elbows tucked on the ribs; he looks
 * over them. Head angle 17, under head.ts's 20, so the face is the one drawn, never turned.
 * Compact: at point blank two fighters touch gloves, nothing above the shins overlaps.
 */
export const GUARD: Pose = {
  hip: at(-6.6, 36.5),
  torso: 15,
  head: 2,
  shrug: 1,
  nearFoot: planted(6.35, -2),
  farFoot: planted(-22, -15),
  nearFist: at(8.6, 54.2),
  farFist: at(10.3, 62.3),
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
