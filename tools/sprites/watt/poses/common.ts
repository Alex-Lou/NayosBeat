/**
 * Shared vocabulary of Watt's animation: authoring helpers and the reference poses every strip
 * starts from. Character space (see skeleton.ts): feet anchor at the origin, x toward the
 * opponent, y up, in world pixels; his body is WATT_BODY (a flat foot on the ground has its
 * ankle at WATT_BODY.ankle), so poses are solved with it.
 *
 * Neutral poses (guard, idle, walks, crouch, block) keep everything above the shins inside his
 * box: nothing above y = 12 past x = 14 standing (16 crouching), the feet up to 17 (19): at
 * point blank the two fighters touch, they never look locked in a clinch.
 * tests/tools/watt-sprites.test.ts will check it with his walks (porte 3).
 */

import type { Point } from '../../raster.ts';
import {
  blend,
  planted as plantedOn,
  solve,
  type Effect,
  type Foot,
  type Pose,
} from '../../skeleton.ts';
import { WATT_BODY } from '../body.ts';

export { blend, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

/** A foot of his planted at `x`, its lowest point exactly on the ground (see skeleton.ts). */
export function planted(x: number, angle = 0): Foot {
  return plantedOn(x, angle, WATT_BODY);
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
 * A foot of his up on its ball, the heel `-angle` degrees off the floor, its toe tip at `toe`:
 * the ankle is placed so that the ball stays put whatever the heel does (a heel pop pivots on
 * the ball, it never slides it).
 */
export function onBall(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  const sole = WATT_BODY.ankle - WATT_BODY.footRadius;
  return planted(toe - Math.sin(a) * sole - Math.cos(a) * WATT_BODY.foot, angle);
}

/** How far behind the ankle the back of his boot's sole sits (look.ts's drawBoot). */
const BOOT_HEEL = 3.7;

/**
 * A flat planted `foot` with its toes lifted `angle` degrees, rocking back on the heel: the
 * back corner of the sole stays put on the floor (a tap of the toes never slides the foot).
 */
export function onHeel(foot: Foot, angle: number): Foot {
  if (angle === 0) return foot;
  const a = (angle * Math.PI) / 180;
  const corner = foot.x - BOOT_HEEL;
  return {
    x: corner + BOOT_HEEL * Math.cos(a) - WATT_BODY.ankle * Math.sin(a),
    y: BOOT_HEEL * Math.sin(a) + WATT_BODY.ankle * Math.cos(a),
    angle,
  };
}

/** The toe tip of a foot (the inverse of onBall): where a heel pop pivots. */
export function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  const sole = WATT_BODY.ankle - WATT_BODY.footRadius;
  return foot.x + Math.sin(a) * sole + Math.cos(a) * WATT_BODY.foot;
}

/**
 * The guard (docs/watt.md §10): a colosse's, low and heavy, three quarters to the viewer like the
 * reference (near limbs on the camera side: his rear arm and leg). The weight on both legs, the
 * knees bent, the rear foot on its ball, the lead foot flat; the torso leaning in 11 degrees, the
 * shoulders rolled forward and up into the collar; both clamps closed in front of the chest, the
 * rear one a little higher, the lead one out in front: ready to strike or to grab. The bulb sits
 * upright above the collar. The lead clamp stays inside the no-clinch line (x = 14).
 */
export const GUARD: Pose = {
  hip: at(-9, 37.5),
  torso: 8,
  head: -11,
  shrug: 2.8,
  nearFoot: onBall(-18, -18),
  farFoot: planted(7.5, 0),
  nearFist: at(-0.5, 53),
  farFist: at(7, 52.5),
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front' },
  twist: 0.35,
};

/**
 * His crouch, the hips and the boots every crouching pose starts from (crouch.ts, the low
 * blows, the crouching reactions): the hips low enough that the bulb tops out under 65 px, so
 * that his crouch ducks what the cast's crouches duck (tools/sprites/measure-boxes.ts).
 */
export const CROUCHED = {
  hip: [-12.5, 24.5],
  nearFoot: onBall(-20, -24),
  farFoot: planted(8.5),
} as const;

/**
 * The least angle his rear ankle keeps between the shin and the foot (90: the shin square to
 * the sole): a combat boot does not let it close much more.
 */
export const MIN_ANKLE = 55;
/** The highest a planted rear heel rises to keep that angle (degrees up, negative). */
const HIGHEST_HEEL = -55;

/** The angle between the rear shin and the rear foot of `pose`, in degrees. */
export function rearAnkle(pose: Pose): number {
  const { knee, ankle, heel, toe } = solve(pose, WATT_BODY).near;
  const shin = { x: knee.x - ankle.x, y: knee.y - ankle.y };
  const foot = { x: toe.x - heel.x, y: toe.y - heel.y };
  const cos =
    (shin.x * foot.x + shin.y * foot.y) / (Math.hypot(shin.x, shin.y) * Math.hypot(foot.x, foot.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * `pose` with its planted rear foot's heel lifted as far as the knee needs: when the knee drives
 * forward over a foot on the floor, the heel comes up and the foot rolls onto its ball (the
 * ball stays put: the foot never slides), until the ankle keeps MIN_ANKLE. A foot off the floor,
 * or one whose ankle already keeps that angle, is left as it is.
 */
export function springAnkle(pose: Pose): Pose {
  const foot = pose.nearFoot;
  const angle = foot.angle ?? 0;
  const grounded = Math.abs(foot.y - planted(foot.x, angle).y) < 0.01;
  if (!grounded || angle > 0 || rearAnkle(pose) >= MIN_ANKLE) return pose;
  const toe = toeOf(foot);
  let best = pose;
  for (let heel = Math.floor(angle) - 1; heel >= HIGHEST_HEEL; heel--) {
    best = { ...pose, nearFoot: onBall(toe, heel) };
    if (rearAnkle(best) >= MIN_ANKLE) break;
  }
  return best;
}

/** Where the guard holds each clamp from its shoulder (the shoulders do not depend on the hands). */
const GUARD_HOLD = (() => {
  const { near, far } = solve(GUARD, WATT_BODY);
  return {
    near: { x: GUARD.nearFist.x - near.shoulder.x, y: GUARD.nearFist.y - near.shoulder.y },
    far: { x: GUARD.farFist.x - far.shoulder.x, y: GUARD.farFist.y - far.shoulder.y },
  };
})();

/** `p` turned `degrees` clockwise on screen (a lean forward). */
function leaned(p: Point, degrees: number): Point {
  const a = (-degrees * Math.PI) / 180;
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) };
}

/**
 * `pose` with its clamps held from its shoulders as the guard holds them, turned with the
 * torso's lean, then moved by `near` and `far` (world px): the arms keep the guard's fold
 * whatever the body does, so the far elbow never folds back out of the chest (anatomy.ts,
 * farArmBack). For the strips the no-clinch rule does not bind (the air, the moves).
 */
export function fistsOnShoulders(pose: Pose, near: Point = at(0, 0), far: Point = at(0, 0)): Pose {
  const s = solve(pose, WATT_BODY);
  const lean = pose.torso - GUARD.torso;
  const n = leaned(GUARD_HOLD.near, lean);
  const f = leaned(GUARD_HOLD.far, lean);
  return {
    ...pose,
    nearFist: at(s.near.shoulder.x + n.x + near.x, s.near.shoulder.y + n.y + near.y),
    farFist: at(s.far.shoulder.x + f.x + far.x, s.far.shoulder.y + f.y + far.y),
  };
}
