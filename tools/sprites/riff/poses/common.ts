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
 * A foot of hers up on its ball, the heel `-angle` degrees off the floor, its toe tip at `toe`:
 * the ankle is placed so that the ball stays put whatever the heel does (a heel pop pivots on
 * the ball, it never slides it).
 */
export function onBall(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  const sole = RIFF_BODY.ankle - RIFF_BODY.footRadius;
  return planted(toe - Math.sin(a) * sole - Math.cos(a) * RIFF_BODY.foot, angle);
}

/** The toe tip of a foot (the inverse of onBall): where a heel pop pivots. */
export function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  const sole = RIFF_BODY.ankle - RIFF_BODY.footRadius;
  return foot.x + Math.sin(a) * sole + Math.cos(a) * RIFF_BODY.foot;
}

/**
 * The guard: a street punk's stance, three quarters to the viewer like the reference (near
 * limbs on the camera side: her rear arm and leg, the lead ones behind the body), leaning into
 * the opponent. A wide stance, the hips low between the feet: the rear foot flat, its knee
 * giving; the lead foot light on its ball, the heel up, the knee bent over it, ready to sweep or
 * to snap the scorpion kick. One line of action from the rear foot up through the hips to the
 * head, pitched forward: the torso leans in 9 degrees, the head turned back by as much so that
 * it stays upright on screen (under head.ts's 20 degrees, the face as drawn), the sideways look
 * on the opponent. The lead fist hangs low and loose in front of the belly, out toward the
 * opponent, the elbow down (Iori's lead hand: she baits, she doesn't cover); the rear hand rests
 * on the hip, the elbow cocked out behind (B. Jenet's taunt), while the rest of her leans in:
 * come on, then. Her guard stands about 74 px tall, 0.94 of Nayo's.
 *
 * The lead knee, the top of the lead boot and the fist stay inside the no-clinch line (x = 14
 * for anything above the shins): the hips sit back of centre by 3 px for it.
 */
export const GUARD: Pose = {
  hip: at(-6.5, 31.3),
  torso: 9,
  head: -8,
  nearFoot: planted(-16.5, 0),
  farFoot: onBall(15.2, -14),
  nearFist: at(-11.5, 36.2),
  farFist: at(8.8, 43.5),
  bends: { nearElbow: 'back', farElbow: 'down' },
  twist: 0.5,
};
