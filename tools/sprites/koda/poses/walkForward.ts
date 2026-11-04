import { NAYO_CLIPS } from '../../../../src/art/nayo/clips.ts';
import { toPx } from '../../../../src/core/constants.ts';
import { NAYO as TEMPLATE } from '../../../../src/data/fighters/nayo.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, type Foot, type Pose } from './common.ts';

/**
 * walkForward: 12 frames, looping, a boxer's step-drag twice per loop in Tazz's high guard. The
 * rear foot drives on its ball (the heel rising) while the lead foot snaps out of its heel peel,
 * glides out low and slows into its landing on the ball; the rear foot is dragged in behind it,
 * skimming the canvas, and sets softly. The hips hang back on the push, then lurch past GUARD
 * onto the lead and sink two sprite pixels as it lands (the lead knee taking the weight), and
 * brake. The feet never cross.
 *
 * A foot on the floor stays put on the stage: in the cell it slides back by exactly what the
 * game carries him while the previous frame showed (the walking speed times that frame's ticks,
 * both read from the game: src/data/fighters/nayo.ts, src/art/nayo/clips.ts), so a planted ball
 * never skates or jitters, whatever the clip's timing. A foot in the air is placed on the stage
 * too, eased along its step in time (not in frames), then brought back into the cell.
 *
 * The upper body is GUARD's, pixel-locked like the idle: it moves by whole sprite pixels (0.5
 * world px), the torso and the upper arms never turn (only the lead forearm trails the bounce,
 * about its elbow), so the jacket, the sleeve emblem and the headphone ring never boil. Frame 0
 * is exactly GUARD: the walk starts from idle without a pop.
 */

const FRAMES = 12;
const HALF = 6;
/** The game's walking speed (px per tick) and how long it shows each frame (ticks). */
const SPEED = toPx(TEMPLATE.walkForwardSpeed);
const TICKS = NAYO_CLIPS.walkForward.ticks;

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

const LEAD = ballOf(GUARD.nearFoot).x;
const REAR = ballOf(GUARD.farFoot).x;
const lead = (x: number, angle: number, lift = 0): Foot => onBall(GUARD.nearFoot, x, angle, lift);
/** The rear ball sits a quarter pixel up: its raised toe cap never dips into the floor. */
const rear = (x: number, angle: number, lift = 0.25): Foot => onBall(GUARD.farFoot, x, angle, lift);

/**
 * A step through the air, `t` from 0 (off the floor) to 1 (landed), in time: out of the floor
 * quickly enough, slowing into the landing.
 */
const glide = (t: number): number => (1 - Math.cos(Math.PI * t ** 0.8)) / 2;

/**
 * One step-drag (frames 0-5 of a half loop, `ticks` its six durations), in the cell:
 *   0 set (GUARD)  1 the rear drives, the lead heel peels  2-3 the lead glides out low
 *   4 it reaches, the rear toes off  5 the lead lands on its ball, the rear is dragged in.
 */
function stride(ticks: readonly number[]): { lead: Foot[]; rear: Foot[] } {
  // Where the game has carried him when each frame comes up (px), and over the whole step.
  const start: number[] = [0];
  ticks.forEach((tick, k) => start.push((start[k] ?? 0) + tick));
  const travel = (k: number): number => SPEED * (start[k] ?? 0);
  const step = travel(HALF);
  // The lead leaves the floor after frame 1 and lands on frame 5: placed on the stage along that
  // flight, in ticks, then seen from the cell.
  const flight = (k: number): number =>
    glide(((start[k] ?? 0) - (start[1] ?? 0)) / ((start[5] ?? 1) - (start[1] ?? 0)));
  const air = (k: number): number => LEAD + step * flight(k) - travel(k);
  return {
    lead: [
      GUARD.nearFoot,
      // The ball pinned on the stage, the heel peeling off.
      lead(LEAD - travel(1), -14),
      lead(air(2), -10, 2.2),
      lead(air(3), -4, 3.0),
      lead(air(4), -6, 1.4),
      // Pinned on its ball from here: a frame later it is GUARD's foot again.
      lead(LEAD + step - travel(5), -5),
    ],
    rear: [
      GUARD.farFoot,
      // The ball pinned, the heel rising as the rear leg drives.
      rear(REAR - travel(1), -18),
      rear(REAR - travel(2), -22),
      rear(REAR - travel(3), -27),
      rear(REAR - travel(4), -33),
      // Dragged in low, the toe skimming the canvas a pixel up, 60% of the way to GUARD's mark
      // on the stage: a snap, then a soft set.
      rear(REAR + 0.6 * step - travel(5), -20, 1.0),
    ],
  };
}

/** Each half loop's feet, from its own ticks. */
const STRIDES = [stride(TICKS.slice(0, HALF)), stride(TICKS.slice(HALF, FRAMES))];

/**
 * Upper body offset from GUARD, in whole sprite pixels (0.5 world px): it rides up on the push,
 * hangs back while the lead reaches, then lurches onto it as it lands (a sprite pixel ahead of
 * GUARD, two below), and brakes on it. Frames 1-4 stay as they are: the lead knee already sits
 * on the 14 px margin while the foot is out.
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
  const feet = STRIDES[Math.floor(frame / HALF)];
  const [dx, dy] = BODY[k] ?? [0, 0];
  const [fx, fy] = FAR_LAG[k] ?? [0, 0];
  const roll = SHRUG[frame] ?? 0;
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + dx, GUARD.hip.y + dy),
    shrug: (GUARD.shrug ?? 0) + roll,
    nearFist: nearGlove(dx, dy, roll, NEAR_TRAIL[k] ?? 0),
    farFist: at(GUARD.farFist.x + fx, GUARD.farFist.y + fy),
    nearFoot: feet?.lead[k] ?? GUARD.nearFoot,
    farFoot: feet?.rear[k] ?? GUARD.farFoot,
  };
}

export const POSES: readonly Pose[] = Array.from({ length: FRAMES }, (_, frame) => walk(frame));
