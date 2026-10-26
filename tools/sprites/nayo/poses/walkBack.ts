import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * walkBack: 12 frames of 2 ticks, looping (0.4 s, 24 px). A boxer's retreat, twice per loop:
 * the rear foot pops back first (clear of the floor, landing on the ball), he sits back onto
 * it, then the lead foot is drawn back, slowing into its landing, to restore the stance. Guard
 * tight: lead shoulder up, chin tucked, rear fist on the jaw. The feet never cross, and a foot
 * on the floor stays put on the stage: in the cell it slides forward at the walking speed,
 * 2 px per frame. Frame 0 is the guard: the retreat starts from idle without a pop.
 */

const FRAMES = 12;
const HALF = 6;
const TAU = Math.PI * 2;
/** How far a planted foot travels forward in the cell each frame: 1 px/tick, 2 ticks. */
const SLIDE = 2;

/**
 * Flat foot, or heel raised (negative angle) pivoting on the ball: the ball stays put. The
 * drawn toe cap runs a little past the skeleton's toe: lift it so it never dips into the floor.
 */
function onBall(x: number, angle = 0, lift = 0): Foot {
  const a = (angle * Math.PI) / 180;
  const foot = planted(x, angle);
  const toeCap = 0.9 * Math.max(0, -Math.sin(a));
  return {
    ...foot,
    x: x + 7 - 7 * Math.cos(a) - 2.3 * Math.sin(a),
    y: foot.y + toeCap + lift,
  };
}

/** Smooth periodic curve through one value per frame of the step (Catmull-Rom), at time `t`. */
function sample(values: readonly number[], t: number): number {
  const n = values.length;
  const i = Math.floor(t);
  const u = t - i;
  const v = (k: number): number => values[(((i + k) % n) + n) % n] ?? 0;
  const [p0, p1, p2, p3] = [v(-1), v(0), v(1), v(2)];
  return (
    p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)))
  );
}

/** The groove on top, once a loop: 0 on frame 0, 1 half a loop later. */
function groove(t: number, lag: number): number {
  const wave = (f: number): number => (1 - Math.cos((TAU * (f - lag)) / FRAMES)) / 2;
  return wave(t) - wave(0);
}

// One retreat step, frame by frame (frames 0-5, then again 6-11): set, rear foot back, ball
// lands (frame 2: the beat), sit, draw the lead back, it lands (frame 0).
const LEAD = 4.8;
const REAR = -13.4;
const lead = {
  // Ball of the foot: pinned while the heel peels (pushing off), then slowing into contact.
  x: [LEAD, LEAD + SLIDE, LEAD + 2 * SLIDE, LEAD + 2.6, LEAD, LEAD - 1.4],
  lift: [0, 0, 0, 0.8, 1.4, 0.5],
  angle: [0, -2, -5, -1, -1, -1],
};
const rear = {
  x: [REAR, REAR - 5.4, REAR - 8, REAR - 8 + SLIDE, REAR - 8 + 2 * SLIDE, REAR - 8 + 3 * SLIDE],
  lift: [0, 2.0, 0, 0, 0, 0],
  angle: [-1, -12, -10, -4, 0, 0],
};
const step = {
  hipX: [-3.5, -4.1, -4.9, -5.2, -4.9, -4.3],
  hipY: [37.0, 37.0, 36.6, 36.3, 36.4, 36.7],
  // Sits back onto the rear foot, comes up as the lead is drawn in.
  torso: [-2.4, -2.6, -4.0, -5.2, -4.8, -3.6],
  // Counters the lean (the eyes stay on the opponent, nose and mouth in view), dips on the beat.
  head: [10.6, 10.9, 13.0, 13.0, 12.5, 11.4],
  shrug: [3.5, 3.65, 3.8, 3.85, 3.8, 3.65],
  twist: [-0.1, -0.12, -0.15, -0.17, -0.16, -0.13],
  // The lead hand tucks in as he sits back, and settles as the stance closes.
  tuck: [0, 0.6, 0.9, 1.0, 0.8, 0.35],
  // The rear fist ticks down as the rear foot lands (the beat) and springs back to the jaw.
  tick: [0, 0, 1, 0.35, 0, 0],
};

/** Hips, torso and head at time `t` (frames), without the limbs. */
function body(t: number): Pose {
  const k = ((t % HALF) + HALF) % HALF;
  const nod = groove(t, 0);
  return {
    ...GUARD,
    hip: at(sample(step.hipX, k), sample(step.hipY, k)),
    torso: sample(step.torso, k),
    head: sample(step.head, k) + 1.5 * nod,
    shrug: sample(step.shrug, k),
    twist: sample(step.twist, k),
  };
}

/** The rear fist follows the head this many frames late, the lead hand the shoulder. */
const HEAD_LAG = 0.5;
const SHOULDER_LAG = 1;
/** Where they are on frame 0: the fists are exactly GUARD's there. */
const HEAD_ON_FRAME_0 = solve(body(-HEAD_LAG)).head;
const SHOULDER_ON_FRAME_0 = solve(body(-SHOULDER_LAG)).near.shoulder;

function walk(frame: number): Pose {
  const k = frame % HALF;
  const pick = (values: readonly number[]): number => values[k] ?? 0;
  const nearFoot = onBall(pick(lead.x), pick(lead.angle), pick(lead.lift));
  const farFoot = onBall(pick(rear.x), pick(rear.angle), pick(rear.lift));
  // Guard tight: the rear fist rides the jaw, a touch late; the lead hand follows the rolled
  // shoulder and tucks in, back and up, never out toward the opponent.
  const head = solve(body(frame - HEAD_LAG)).head;
  const shoulder = solve(body(frame - SHOULDER_LAG)).near.shoulder;
  const tuck = pick(step.tuck);
  return {
    ...body(frame),
    nearFoot,
    farFoot,
    farFist: at(
      GUARD.farFist.x + head.x - HEAD_ON_FRAME_0.x,
      GUARD.farFist.y + head.y - HEAD_ON_FRAME_0.y - 0.7 * pick(step.tick),
    ),
    nearFist: at(
      GUARD.nearFist.x + 0.9 * (shoulder.x - SHOULDER_ON_FRAME_0.x) - 1.2 * tuck,
      GUARD.nearFist.y + 0.9 * (shoulder.y - SHOULDER_ON_FRAME_0.y) + 0.6 * tuck,
    ),
  };
}

export const POSES: readonly Pose[] = Array.from({ length: FRAMES }, (_, frame) => walk(frame));
