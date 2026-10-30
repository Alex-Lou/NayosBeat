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
import {
  blend,
  planted as plantedOn,
  solve,
  type Effect,
  type Foot,
  type Pose,
} from '../../skeleton.ts';
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

/** How far behind the ankle the back of her boot's sole sits (look.ts's drawBoot). */
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
    x: corner + BOOT_HEEL * Math.cos(a) - RIFF_BODY.ankle * Math.sin(a),
    y: BOOT_HEEL * Math.sin(a) + RIFF_BODY.ankle * Math.cos(a),
    angle,
  };
}

/** The toe tip of a foot (the inverse of onBall): where a heel pop pivots. */
export function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  const sole = RIFF_BODY.ankle - RIFF_BODY.footRadius;
  return foot.x + Math.sin(a) * sole + Math.cos(a) * RIFF_BODY.foot;
}

/**
 * The guard, « la prédatrice »: b-girl plié legs, a street brawler's guard, the punk's face,
 * three quarters to the viewer like the reference (near limbs on the camera side: her rear arm
 * and leg, the lead ones behind the body). The legs carry the dance (the sweeps, the windmill,
 * the scorpion kick, the slide), the arms the street fight (the backfist, the spinning elbow,
 * the headbutt).
 *
 * The legs: low and springy, both knees bent forward over their feet, the rear one too: folded
 * back over the heel like a dancer's turned-out plié, it read at full size (the select screen)
 * as a knee bent the wrong way. The feet about 30 px apart (0.42 of her height), the
 * thighs about 40 degrees down: ready to push off, not a rooted horse stance. The hips a little
 * over the lead leg (0.7 px ahead of the feet's midpoint); the rear foot springy on its ball,
 * the heel 32 degrees up under the forward knee, a boxer's rear foot (the foot that whips the
 * sweeps and the scorpion kick: the idle pumps that heel a few degrees, the ball never moves),
 * the lead foot flat and planted.
 *
 * The body: hunched in, a predator. The torso leans in 19 degrees, the chest still open to the
 * viewer, the rear shoulder shrugged up into the popped collar, the head on an on-screen tilt of
 * 9 degrees: under stamp.ts's UPRIGHT_TOLERANCE (20), so the head is the source drawing as is,
 * chin up, the sideways look on the opponent. The head never rotates on screen below 20 degrees
 * (and RotSprite past it ruins the face): head motion comes from the torso and the hips.
 *
 * The arms: a street brawler's guard, nothing like Nayo's high shell. The lead hand low and
 * loose, out in front of the belly, the forearm angled about 45 degrees at the opponent, the
 * knuckles forward, the chin left open on that side (the provocation). The rear arm hangs from
 * its shoulder: the elbow down on the ribs, the forearm up across the chest, the fist under the
 * chin, the knuckles forward, the face clear above it. The backfist, the spinning elbow and the
 * haymaker start from it, and her block and grab. (It used to be cocked by the ear, the elbow
 * out and back, a « wing »: on the picture it read as an arm folded backward, and the owner
 * turned it down.) At 1x it reads « low hand, fist at the chin », never a walk, a wave or a fan
 * at a gig. She stands about
 * 72 px tall, 0.91 of Nayo's 79.
 *
 * Her low poses keep the plié, the rear knee turned out and folded back over the heel
 * (`nearKnee: 'back'`, its boot turned out toward the camera by look.ts): the crouch and the moves
 * from it, the landings into the plié, the getup, the deepest frames of the falls. There a knee
 * in front would sink into the floor, or kneel (a kneel is Nayo's). On the way between them and
 * the guard the knee comes over once, on a frame where the whole body moves.
 *
 * The lead knee and the lead fist stay inside the no-clinch line (x = 14 for anything above the
 * shins): the body reaches 13.5 at the lead fist (its wrist at x = 9.5; at 10.5 it would cross
 * the line), the knee at about 8; dropping the hips (the idle's downbeat, every crouch on the
 * way down) bends it further forward.
 */
export const GUARD: Pose = {
  hip: at(-6.8, 32),
  torso: 19,
  head: -10,
  shrug: 2.2,
  nearFoot: onBall(-17.5, -32),
  farFoot: planted(7.4, 0),
  nearFist: at(6, 52),
  farFist: at(9.5, 46),
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front' },
  twist: 0.45,
};

/**
 * The least angle her rear ankle keeps between the shin and the foot (90: the shin square to
 * the sole): a combat boot does not let it close much more.
 */
export const MIN_ANKLE = 55;
/** The highest a planted rear heel rises to keep that angle (degrees up, negative). */
const HIGHEST_HEEL = -55;

/** The angle between the rear shin and the rear foot of `pose`, in degrees. */
export function rearAnkle(pose: Pose): number {
  const { knee, ankle, heel, toe } = solve(pose, RIFF_BODY).near;
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
