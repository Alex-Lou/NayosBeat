/**
 * Shared vocabulary of Riff's animation: authoring helpers and the reference poses every strip
 * starts from. Character space (see skeleton.ts): feet anchor at the origin, x toward the
 * opponent, y up, in world pixels; her body is RIFF_BODY (a flat foot on the ground has its
 * ankle at RIFF_BODY.ankle), so poses are solved with it.
 *
 * Neutral poses (guard, idle, walks, crouch, block) keep everything above the shins inside her
 * box: nothing above y = 12 past x = 14 standing (16 crouching), the feet up to 17 (19): at
 * point blank the two fighters touch, they never look locked in a clinch.
 * tests/tools/riff-sprites.test.ts checks it.
 */

import type { Point } from '../../raster.ts';
import { blend, planted as plantedOn, type Effect, type Foot, type Pose } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';

export { blend, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

/** A foot of hers planted at `x`, its lowest point exactly on the ground (see skeleton.ts). */
export function planted(x: number, angle = 0): Foot {
  return plantedOn(x, angle, RIFF_BODY);
}

/** A foot raised `height` pixels off the ground (a step). */
export function lifted(foot: Foot, height: number): Foot {
  return { ...foot, y: foot.y + height };
}

/** Motion trail of a fast limb through `points` (tail first), `width` px wide at the limb. */
export function smear(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  return { kind: 'smear', width, points: points.map(([x, y]) => at(x, y)) };
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

/** `frames` copies of a pose: a strip not animated yet still runs through the pipeline. */
export function hold(pose: Pose, frames: number): readonly Pose[] {
  return Array.from({ length: frames }, () => pose);
}

// ---------------------------------------------------------------------------------------------
// Reference poses

/**
 * The guard: a b-girl's ready stance, low and springy. Weight sunk into bent knees and thrown
 * forward, the lead foot flat and pointing at the opponent, the rear one far back up on its
 * ball, ready to push off; the torso tipped well forward over the lead knee, shoulders loose (no
 * shrug: she is not hiding). The lead hand open and low, palm out, its shoulder reaching after
 * it (a "come on"); the rear fist up under the chin; the head up and level, looking straight at
 * the opponent. Head angle (torso + head) under head.ts's 20 degrees, so the face is the one
 * drawn, never turned.
 *
 * The hands stay inside the no-clinch line (x = 14 for anything above the shins), which is why
 * the lead wrist stops at x = 8: the open hand reaches 6 px past it.
 */
export const GUARD: Pose = {
  hip: at(-5.5, 32.0),
  torso: 18,
  head: -6,
  shrug: 0,
  nearFoot: planted(6.4, -2),
  farFoot: planted(-19, -15),
  nearFist: at(8, 39),
  farFist: at(9, 47),
  reach: { near: 1 },
  nearHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
};
