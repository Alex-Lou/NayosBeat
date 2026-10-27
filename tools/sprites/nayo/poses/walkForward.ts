import { solve } from '../../skeleton.ts';
import { at, GUARD, type Foot, type Pose } from './common.ts';

/**
 * walkForward: 12 frames of 2 ticks, looping (0.4 s, 28.8 px), a boxer's step-drag twice per
 * loop in Tazz's high guard. The rear foot drives on its ball (the heel rising) while the lead
 * foot snaps out of its heel peel, glides out low and slows into its landing on the ball; the
 * rear foot is dragged in behind it, skimming the canvas, and sets softly. The hips hang back
 * on the push, then lurch past GUARD onto the lead and sink two sprite pixels as it lands (the
 * lead knee taking the weight), and brake. The feet never cross; a foot on the floor stays put
 * on the stage: in the cell it slides back at the walking speed.
 *
 * The upper body is GUARD's, pixel-locked like the idle: it moves by whole sprite pixels (0.5
 * world px), the torso and the upper arms never turn (only the lead forearm trails the bounce,
 * about its elbow), so the jacket, the sleeve emblem and the headphone ring never boil. Frame 0
 * is exactly GUARD: the walk starts from idle without a pop.
 */

const FRAMES = 12;
const HALF = 6;
/** How far a planted foot travels back in the cell each frame: 1.2 px/tick, 2 ticks. */
const SLIDE = 2.4;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * The front corner of the drawn sole (the ball of the foot): it stays on the same floor pixel
 * while the heel rises, so a foot rolling onto its toes never slides.
 */
function ballOf(foot: Foot): { x: number; y: number } {
  const a = radians(foot.angle ?? 0);
  return {
    x: foot.x + 8 * Math.cos(a) + 4.7 * Math.sin(a),
    y: foot.y + 8 * Math.sin(a) - 4.7 * Math.cos(a),
  };
}

/** A foot shaped like `guard`, its ball at `x`, the heel raised by `-angle`, `lift` px up. */
function onBall(guard: Foot, x: number, angle: number, lift = 0): Foot {
  const depth = ballOf(guard).y;
  const shape = ballOf({ x: 0, y: 0, angle });
  return { x: x - shape.x, y: depth - shape.y + lift, angle };
}

/**
 * 2.4 px is not a whole number of sprite pixels: drawn on the cell's grid, a ball pinned on the
 * stage rounds about 0.4 px ahead of GUARD's floor pixels. Pulled back by that much, it keeps
 * them (measured on the drawn sole).
 */
const SNAP = 0.4;
const LEAD = ballOf(GUARD.nearFoot).x;
const REAR = ballOf(GUARD.farFoot).x;
const lead = (x: number, angle: number, lift = 0): Foot => onBall(GUARD.nearFoot, x, angle, lift);
/** The rear ball sits a quarter pixel up: its raised toe cap never dips into the floor. */
const rear = (x: number, angle: number, lift = 0.25): Foot => onBall(GUARD.farFoot, x, angle, lift);

// One step-drag, frame by frame (frames 0-5, then again 6-11), in the cell:
//   0 set (GUARD)  1 the rear drives, the lead heel peels  2-3 the lead glides out low
//   4 it reaches, the rear toes off  5 the lead lands on its ball, the rear is dragged in.
// The lead ball covers 2.7, 4.7, 4.7, 2.7 px of stage from frame 1 to 5: eased at both ends.
const LEAD_STEP: readonly Foot[] = [
  GUARD.nearFoot,
  lead(LEAD - SLIDE - SNAP, -14),
  lead(LEAD - 2.5, -10, 2.2),
  lead(LEAD - 0.2, -4, 3.0),
  lead(LEAD + 2.1, -6, 1.4),
  // Pinned on its ball from here: a frame later it is GUARD's foot again.
  lead(LEAD + SLIDE, -5),
];
const REAR_STEP: readonly Foot[] = [
  GUARD.farFoot,
  // The ball pinned, the heel rising as the rear leg drives.
  rear(REAR - SLIDE - SNAP, -18),
  rear(REAR - 2 * SLIDE - SNAP, -22),
  rear(REAR - 3 * SLIDE - SNAP, -27),
  rear(REAR - 4 * SLIDE - SNAP, -33),
  // Dragged in low, the toe skimming the canvas a pixel up: 9 px of stage, then it sets on
  // GUARD's ball (5.8 px), a snap and a soft set.
  rear(REAR - 3.4, -20, 1.0),
];
/**
 * Upper body offset from GUARD, in whole sprite pixels (0.5 world px): it rides up on the push,
 * hangs back while the lead reaches, then lurches onto it as it lands (a sprite pixel ahead of
 * GUARD, two below: 3.4 px of stage), and brakes on it (1.9 px). Frames 1-4 stay as they are:
 * the lead knee already sits on the 14 px margin while the foot is out.
 */
const BODY: readonly (readonly [number, number])[] = [
  [0, 0],
  [-0.5, 0.5],
  [-1, 0.5],
  [-1, 0.5],
  [-0.5, 0],
  [0.5, -1],
];
/** The lead forearm trails the bounce (degrees, + lifts the glove), turning about its elbow. */
const NEAR_TRAIL: readonly number[] = [0, -1.2, 0, 0, 1.2, 1.2];
/** The far glove rides the body a frame late (on GUARD's glove on frame 0). */
const FAR_LAG: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 0],
  [-0.5, 0.5],
  [-1, 0.5],
  [-1, 0.5],
  [-0.5, 0],
];
/**
 * Once a loop, on the first landing, the lead shoulder rolls up to the chin (the shrug of the
 * idle's breath, exactly one sprite pixel): the two steps differ, the walk has a groove.
 */
const SHRUG: readonly number[] = [0, 0, 0, 0, 0.68, 0.68, 0, 0, 0, 0, 0, 0];

const ARM = solve(GUARD).near;
const UP = solve(GUARD).up;
const FRONT = solve(GUARD).front;

/**
 * The lead glove for a body offset, a shoulder roll and a forearm turn: the upper arm keeps
 * GUARD's angle (the sleeve emblem is the same pixels), only the forearm turns about the elbow.
 */
function nearGlove(dx: number, dy: number, roll: number, turn: number): { x: number; y: number } {
  const shift = {
    x: dx + roll * (UP.x + 0.45 * FRONT.x),
    y: dy + roll * (UP.y + 0.45 * FRONT.y),
  };
  const a = radians(turn);
  const fx = ARM.wrist.x - ARM.elbow.x;
  const fy = ARM.wrist.y - ARM.elbow.y;
  return at(
    ARM.elbow.x + shift.x + fx * Math.cos(a) - fy * Math.sin(a),
    ARM.elbow.y + shift.y + fx * Math.sin(a) + fy * Math.cos(a),
  );
}

function walk(frame: number): Pose {
  const k = frame % HALF;
  const [dx, dy] = BODY[k] ?? [0, 0];
  const [fx, fy] = FAR_LAG[k] ?? [0, 0];
  const roll = SHRUG[frame] ?? 0;
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + dx, GUARD.hip.y + dy),
    shrug: (GUARD.shrug ?? 0) + roll,
    nearFist: nearGlove(dx, dy, roll, NEAR_TRAIL[k] ?? 0),
    farFist: at(GUARD.farFist.x + fx, GUARD.farFist.y + fy),
    nearFoot: LEAD_STEP[k] ?? GUARD.nearFoot,
    farFoot: REAR_STEP[k] ?? GUARD.farFoot,
  };
}

export const POSES: readonly Pose[] = Array.from({ length: FRAMES }, (_, frame) => walk(frame));
