import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * specialAntiAir, the uppercut "le drop". Ticks 3,[3],[5],4,4,4,4,4,4,4 (active: frames 1-2).
 *
 * The bass drop as an uppercut. Out of the high guard he sinks into a deep coil (the lead fist
 * dropped to the hip, the beat hitting the floor as a sound shockwave), then everything releases
 * at once: the back toe drives, the lead knee rises, the lead fist rips up the front of the body
 * to above his head (hitbox top, y ~100) while the rear arm flings down and back past the hip as
 * a counterweight. A sound column shoots up in front of him, right beside the fist, through the
 * airborne opponent.
 *
 * Line of action: a tight C curled over the lead knee on the dip, one straight diagonal from the
 * back toe to the fist on the launch, a slight backward arc at the peak (chin up, he looks up at
 * what he hit, legs tucked, airborne). He is still carried up a hair to the apex, hangs there,
 * then the fist folds down into the high guard while he falls, the back toe finds the floor
 * first, a heavy landing held low in the wide stance (the move stays punishable until tick 39,
 * so the drawing commits until then), and he rises into the guard, handing over to the idle's
 * last frame. The column falls back like an equalizer bar as he comes down.
 *
 * Faces: focus, effort on the launch, kiai only at the peak, focus again from the hang on.
 */

const ring = (x: number, y: number, radius: number, progress: number, squash?: number): Effect => ({
  kind: 'ring',
  center: at(x, y),
  radius,
  progress,
  tone: 'sound',
  ...(squash === undefined ? {} : { squash }),
});

/**
 * An arm set by its joints, as tools/sprites/anatomy.ts measures them in the torso's frame: the
 * upper arm `shoulder` degrees from hanging (90 = straight ahead, 180 = overhead, negative =
 * behind), the elbow flexed `elbow` degrees (0 = straight, always the way an elbow bends). The
 * pose with that fist in place and the bend that makes the solver pick that elbow.
 */
function withArm(pose: Pose, which: 'near' | 'far', shoulder: number, elbow: number): Pose {
  const s = solve(pose);
  const root = s[which].shoulder;
  const turn = (v: Point, degrees: number): Point => {
    const a = (degrees * Math.PI) / 180;
    return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
  };
  const upper = turn({ x: -s.up.x, y: -s.up.y }, shoulder);
  const joint = add(root, scale(upper, BODY.upperArm));
  const fist = add(joint, scale(turn(upper, elbow), BODY.forearm));
  // The other elbow the solver could pick: the mirror image across the shoulder-fist line.
  const line = sub(fist, root);
  const axis = scale(line, 1 / (Math.hypot(line.x, line.y) || 1));
  const offset = sub(joint, root);
  const along = offset.x * axis.x + offset.y * axis.y;
  const mirror = add(root, sub(scale(axis, 2 * along), offset));
  const dx = joint.x - mirror.x;
  const dy = joint.y - mirror.y;
  const bend: Bend =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'down' : 'up') : dx > 0 ? 'front' : 'back';
  return which === 'near'
    ? { ...pose, nearFist: at(fist.x, fist.y), bends: { ...pose.bends, nearElbow: bend } }
    : { ...pose, farFist: at(fist.x, fist.y), bends: { ...pose.bends, farElbow: bend } };
}

/** Where the guard's rear toe touches the floor (heel up). */
const REAR_TOE = solve(GUARD).far.toe.x;

/**
 * A foot on its toes at `toe`, the heel raised `angle` degrees (negative): the heel rises and
 * sinks around the toe, which stays put on the floor.
 */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

/**
 * The drop hitting the floor: a flat sound shockwave spreading from between the feet. `lift`
 * raises its center so a fading ring keeps its front arc above the cell's floor clip (whole, not
 * broken into two hooks).
 */
const floorRing = (progress: number, radius = 28, lift = 0): Effect =>
  ring(-2, 1.5 + lift, radius, progress, 0.3);

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/**
 * The sound column, standing on the floor inside the hitbox, just in front of the fist (so it
 * never hides the punching arm), from `bottom` up to `top` (world y).
 */
const column = (bottom: number, top: number, width: number, progress: number): Effect => ({
  kind: 'column',
  base: at(21, bottom),
  height: (top - bottom) / (0.4 + 0.6 * progress),
  width,
  progress,
});

// 0 - The dip (3 ticks): low on both legs in the wide stance, curled over the lead knee, the
// lead shoulder dropped and the lead fist sunk to the hip (elbow behind), the chest opened
// toward us. Rear fist in front of the chin, eyes up on the target.
const DIP: Pose = {
  hip: at(-6.6, 28.8),
  torso: 31,
  head: -13,
  shrug: 0.2,
  twist: 0.5,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -40),
  nearFist: at(-3, 30),
  farFist: at(16, 49),
  bends: { nearElbow: 'back', farElbow: 'down' },
};

// 1 - The launch (3 ticks, active): uncoiled in one line from the back toe (still pivoting on
// the floor) to the fist above the head; the lead knee starts driving up, the chin tucked behind
// the rising lead shoulder, the rear arm flung down and back behind the hip, long, the elbow
// pointing back (never the forearm folded back the wrong way out of the hip).
const LAUNCH_BODY: Pose = {
  hip: at(-4.6, 44),
  torso: 13,
  head: 3,
  shrug: 4.4,
  reach: { near: 3 },
  twist: -0.35,
  nearFoot: { x: 8.5, y: 15, angle: -40 },
  farFoot: onToes(REAR_TOE, -60),
  nearFist: at(15.2, 91.6),
  farFist: at(-13, 45),
  bends: { nearElbow: 'front', farElbow: 'down' },
  face: 'effort',
};
const LAUNCH = withArm(LAUNCH_BODY, 'far', -30, 25);

// 2 - The peak (5 ticks, active): off the floor, lead knee high, toes pointed, the body arched
// a touch back under the fist, chin up on what he hit. The shout.
const PEAK_BODY: Pose = {
  hip: at(-1.6, 47.5),
  torso: -4,
  head: -20,
  shrug: 3.5,
  reach: { near: 3 },
  twist: -0.5,
  nearFoot: { x: 6.5, y: 24, angle: -35 },
  farFoot: { x: -12.5, y: 13, angle: -50 },
  nearFist: at(11.5, 95),
  farFist: at(-12.5, 47.5),
  bends: { nearElbow: 'front', farElbow: 'down' },
  face: 'kiai',
};
const PEAK = withArm(PEAK_BODY, 'far', -34, 28);

// 3 - The apex (4 ticks): still carried up a hair past the hit, the arm relaxing at the top,
// the knee starting to drop, the eyes back on the opponent.
const HANG_BODY: Pose = {
  hip: at(-1.5, 49),
  torso: -2,
  head: -8,
  shrug: 3.4,
  reach: { near: 2 },
  twist: -0.4,
  nearFoot: { x: 6.5, y: 23.5, angle: -30 },
  farFoot: { x: -13, y: 14.5, angle: -45 },
  nearFist: at(10.5, 92.5),
  farFist: at(-11, 51.5),
  bends: { nearElbow: 'front', farElbow: 'down' },
};
const HANG = withArm(HANG_BODY, 'far', -26, 34);

// 4 - The hang breaks (4 ticks): he starts to drop, the fist folds down in front of the face,
// the lead knee drops, the rear arm swings forward under the chest (on its way up to the
// guard), the legs reach for the floor.
const TOPPLE: Pose = {
  hip: at(-2.5, 45),
  torso: 3,
  head: 3,
  shrug: 3,
  reach: { near: 1 },
  twist: -0.3,
  nearFoot: { x: 6.5, y: 16.5, angle: -24 },
  farFoot: { x: -15, y: 11.5, angle: -40 },
  nearFist: at(14, 80),
  farFist: at(4.5, 43.6),
  bends: { nearElbow: 'front', farElbow: 'down' },
};

// 5 - Coming down: the fist swings forward and down toward the high guard, the rear hand comes
// back up in front of the chest, the back toe reaches the floor first (where it took off).
const FALL: Pose = {
  hip: at(-4, 40),
  torso: 8,
  head: 8,
  shrug: 2.6,
  twist: -0.2,
  nearFoot: { x: 6, y: 9.5, angle: -10 },
  farFoot: onToes(REAR_TOE, -36),
  nearFist: at(17, 70),
  farFist: at(7, 57),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

// 6 - The heavy landing: both feet back on their guard marks, the knees soaking up the whole
// drop (the rear one on its ball, the heel up under the sunk knee), the lean pitching past the
// guard's, the gloves coming back up.
const LAND: Pose = {
  ...GUARD,
  hip: at(-6.4, 29.5),
  torso: 24,
  head: -6,
  shrug: 1.8,
  twist: 0,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -42),
  nearFist: at(13, 48.5),
  farFist: at(11.5, 54.5),
};

// 7 - Held low: the weight stays sunk in the knees (he still can't act), the chest coming back
// up a touch, the gloves finding their height.
const LOW: Pose = {
  ...LAND,
  hip: at(-6.5, 31),
  torso: 21,
  head: -3,
  nearFist: at(12.5, 50),
  farFist: at(11, 56),
};

// 8 - Rising out of the landing, hands finding the high guard.
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.7, 35),
  torso: 18,
  head: -1,
  shrug: 1.6,
  nearFist: at(10, 52.5),
  farFist: at(11, 59.5),
  farFoot: onToes(REAR_TOE, -17),
};

/**
 * 9 - The idle's last frame (the lead shoulder still up on the breath): the idle's own 9 -> 0
 * beat carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
};

export const POSES: readonly Pose[] = [
  { ...DIP, effects: [floorRing(0.1), dust(5, 3.6, 0.15), dust(-18, 3.2, 0.2)] },
  {
    ...LAUNCH,
    effects: [
      // The fist's path from the hip up the front of the body (behind the body, so only what
      // sticks out of the silhouette shows).
      smear(4, [7, 50], [11, 64], [13, 77], [13.5, 88]),
      column(0, 82, 10, 0.2),
      floorRing(0.45),
      dust(6, 3.6, 0.5),
      dust(-18.5, 3.2, 0.55),
      { kind: 'flash', center: at(15, 96.5), radius: 4, tone: 'strike' },
    ],
  },
  {
    ...PEAK,
    effects: [
      smear(4, [8, 56], [11, 70], [11.5, 84], [11, 93]),
      column(0, 98, 11, 0.45),
      // The shockwave fades out whole, a little tighter, before it can break into hooks.
      floorRing(0.7, 22, 2),
      dust(7, 3.6, 0.85),
      dust(-19, 3.2, 0.9),
      { kind: 'flash', center: at(12.5, 100.5), radius: 6, tone: 'strike' },
    ],
  },
  { ...HANG, effects: [column(0, 100, 10, 0.6)] },
  // The column falls back and thins out like an equalizer bar as he comes down.
  { ...TOPPLE, effects: [column(0, 90, 8.5, 0.74)] },
  { ...FALL, effects: [column(0, 70, 7, 0.85)] },
  { ...LAND, effects: [column(0, 30, 4, 0.95), dust(8, 3.6, 0.2), dust(-18, 3.2, 0.25)] },
  { ...LOW, effects: [dust(9, 3.6, 0.6), dust(-18.5, 3.2, 0.65)] },
  RISE,
  IDLE_HANG,
];
