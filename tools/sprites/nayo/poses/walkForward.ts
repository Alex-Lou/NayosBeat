import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * walkForward: 12 frames of 2 ticks, looping (0.4 s, 28.8 px). A boxer's step-drag, twice per
 * loop. The rhythm is push, fall, settle: the hips hang back while the lead foot reaches out,
 * then fall onto it as its heel strikes, and the rear foot snaps in behind. The feet never
 * cross, and a foot on the floor stays put on the stage: in the cell it slides back at the
 * walking speed, 2.4 px per frame.
 *
 * On the stage the hips travel 1.9, 1.9, 2.5, 2.9, 2.8, 2.4 px per frame (slow, slow, fast,
 * fast, settle) and the head leads the fall by a frame. Frame 0 is the guard (feet a little
 * narrower): the walk starts from idle without a pop.
 */

const FRAMES = 12;
const HALF = 6;
const TAU = Math.PI * 2;
/** How far a planted foot travels back in the cell each frame: 1.2 px/tick, 2 ticks. */
const SLIDE = 2.4;

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

/**
 * A foot with its toes up (positive angle) rocking on its heel, `lift` px off the floor (0: the
 * heel on the floor, the heel strike). The ankle is at `x`.
 */
function onHeel(x: number, angle: number, lift = 0): Foot {
  const foot = planted(x, angle);
  return { ...foot, y: foot.y + lift };
}

/**
 * Where the back of the drawn sole touches the floor, from the ankle, toes up by `angle`: the
 * heel the foot rolls over as the toes come down.
 */
function heelX(angle: number): number {
  const a = (angle * Math.PI) / 180;
  return 4.7 * Math.sin(a) - 3.6 * Math.cos(a);
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

/** The groove on top, once a loop (the beat he walks to): 0 on frame 0, 1 half a loop later. */
function groove(t: number, lag: number): number {
  const wave = (f: number): number => (1 - Math.cos((TAU * (f - lag)) / FRAMES)) / 2;
  return wave(t) - wave(0);
}

/** The shoulder roll, once a loop, a little ahead of the nod: 0 on frame 0, from -0.7 to 1.3. */
function roll(t: number): number {
  const wave = (f: number): number => Math.sin((TAU * (f - 0.5)) / FRAMES);
  return wave(t) - wave(0);
}

// One step-drag, frame by frame (frames 0-5, then again 6-11): set, push, reach, heel strike
// (frame 3 to 4), toes down and drag, (frame 0) the rear foot lands.
const LEAD = 4.4;
const REAR = -13;
/** The heel strike: toes up this much, then they slap down with the heel pinned. */
const STRIKE = 4;
/** Where the lead ankle lands so that the heel stays put while the toes come down. */
const LANDING = LEAD + 2 * SLIDE - (heelX(STRIKE) - heelX(0));
const lead = {
  // Ankle (in the air or rocking on the heel) or ball (flat): slow off the floor, fast through
  // the reach, slowing into the heel strike, then pinned.
  x: [LEAD, LEAD - 0.3, LEAD + 2.0, LEAD + 3.9, LANDING, LEAD + SLIDE],
  lift: [0, 0.8, 1.3, 0.6, 0, 0],
  angle: [0, 3, 7, 7, STRIKE, 0],
};
const rear = {
  // Peeling off the floor heel first (the ball pinned), then snapping in, toes hanging.
  x: [REAR, REAR - SLIDE, REAR - 2 * SLIDE, REAR - 3 * SLIDE, REAR - 4 * SLIDE, REAR - 2.8],
  lift: [0, 0, 0, 0, 0, 1.8],
  angle: [0, -5, -10, -13, -16, -20],
};
const step = {
  // The hips hang back while the lead foot reaches, then fall onto it.
  hipX: [-3.4, -3.9, -4.4, -4.3, -3.8, -3.4],
  hipY: [37.3, 37.7, 38.0, 37.9, 37.3, 36.9],
  // The chest pitches into the fall a frame ahead of the hips (the head leads), then settles.
  torso: [-1.8, -1.2, 0.2, 1.6, 2.3, 0.6],
  // Counters most of the pitch (the eyes stay on the opponent), dips on the heel strike.
  head: [9.8, 9.2, 8.1, 7.2, 8.0, 8.7],
  // Capped so the chin always shows over the rolled shoulder.
  shrug: [3.4, 3.55, 3.75, 3.9, 3.75, 3.5],
  reach: [0, 0.15, 0.3, 0.4, 0.3, 0.1],
  // A narrow band: the jacket front does not flap from frame to frame.
  twist: [-0.1, -0.13, -0.16, -0.18, -0.16, -0.12],
  // The lead hand hangs loose: it lags back as the body pushes off, swings home as it lands.
  swing: [0, 0.3, 0.75, 1.0, 0.55, 0.15],
  // The rear fist ticks down with the heel strike (the beat) and springs back to the jaw.
  tick: [0, 0, 0, 0, 1, 0.3],
};

/** Hips, torso and head at time `t` (frames), without the limbs. */
function body(t: number): Pose {
  const k = ((t % HALF) + HALF) % HALF;
  const nod = groove(t, 0);
  const rolled = roll(t);
  return {
    ...GUARD,
    hip: at(sample(step.hipX, k), sample(step.hipY, k)),
    torso: sample(step.torso, k),
    head: sample(step.head, k) + 2 * nod,
    shrug: sample(step.shrug, k) + 0.2 * rolled,
    reach: { near: sample(step.reach, k) },
    twist: sample(step.twist, k) - 0.03 * rolled,
  };
}

/** The rear fist follows the head this many frames late, the lead hand the shoulder. */
const HEAD_LAG = 0.6;
const SHOULDER_LAG = 1.2;
/** Where they are on frame 0: the fists are exactly GUARD's there. */
const HEAD_ON_FRAME_0 = solve(body(-HEAD_LAG)).head;
const SHOULDER_ON_FRAME_0 = solve(body(-SHOULDER_LAG)).near.shoulder;

function walk(frame: number): Pose {
  const k = frame % HALF;
  const pick = (values: readonly number[]): number => values[k] ?? 0;
  const [x, lift, angle] = [pick(lead.x), pick(lead.lift), pick(lead.angle)];
  const nearFoot = angle > 0 ? onHeel(x, angle, lift) : onBall(x, angle, lift);
  const farFoot = onBall(pick(rear.x), pick(rear.angle), pick(rear.lift));
  const head = solve(body(frame - HEAD_LAG)).head;
  const shoulder = solve(body(frame - SHOULDER_LAG)).near.shoulder;
  const swing = pick(step.swing);
  return {
    ...body(frame),
    nearFoot,
    farFoot,
    // Leaning in, the fists stay home: closer to the face, not out toward the opponent.
    farFist: at(
      GUARD.farFist.x + 0.3 * (head.x - HEAD_ON_FRAME_0.x),
      GUARD.farFist.y + head.y - HEAD_ON_FRAME_0.y - 0.8 * pick(step.tick),
    ),
    // Back and down only: nothing reaches out toward the opponent.
    nearFist: at(
      GUARD.nearFist.x + 0.3 * (shoulder.x - SHOULDER_ON_FRAME_0.x) - 1.2 * swing,
      GUARD.nearFist.y + 0.8 * (shoulder.y - SHOULDER_ON_FRAME_0.y) - 0.5 * swing,
    ),
  };
}

export const POSES: readonly Pose[] = Array.from({ length: FRAMES }, (_, frame) => walk(frame));
