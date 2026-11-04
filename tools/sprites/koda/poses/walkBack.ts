import { NAYO_CLIPS } from '../../../../src/art/nayo/clips.ts';
import { toPx } from '../../../../src/core/constants.ts';
import { NAYO as TEMPLATE } from '../../../../src/data/fighters/nayo.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, type Foot, type Pose } from './common.ts';

/**
 * walkBack: 12 frames, looping, a boxer's retreat twice per loop in Tazz's high guard. The lead
 * foot pushes off its ball and the rear foot pops back, landing on its ball; he sits back onto
 * it (the heel settling), and the lead foot is drawn back low, slowing into its landing, to
 * restore the stance. The hips lead the retreat. The feet never cross.
 *
 * A foot on the floor stays put on the stage: in the cell it slides forward by exactly what the
 * game carries him back while the previous frame showed (the walking speed times that frame's
 * ticks, both read from the game: src/data/fighters/nayo.ts, src/art/nayo/clips.ts), so a
 * planted ball never skates or jitters, whatever the clip's timing. A foot in the air is placed
 * on the stage too, eased along its step in time (not in frames), then brought back into the
 * cell.
 *
 * The upper body is GUARD's, pixel-locked like the idle: it moves by whole sprite pixels (0.5
 * world px), the torso and the upper arms never turn (only the lead forearm trails the bounce,
 * about its elbow), so the jacket, the sleeve emblem and the headphone ring never boil. Frame 0
 * is exactly GUARD: the retreat starts from idle without a pop.
 */

const FRAMES = 12;
const HALF = 6;
/** The game's walking speed backward (px per tick) and how long it shows each frame (ticks). */
const SPEED = toPx(TEMPLATE.walkBackSpeed);
const TICKS = NAYO_CLIPS.walkBack.ticks;

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
 * One retreat step (frames 0-5 of a half loop, `ticks` its six durations), in the cell:
 *   0 set (GUARD)  1 the lead pushes off its ball, the rear pops back  2 the rear lands on its
 *   ball  3 he sits back onto it, the lead drawn back low  4-5 the lead slows into its landing.
 */
function stride(ticks: readonly number[]): { lead: Foot[]; rear: Foot[] } {
  // How far back the game has carried him when each frame comes up (px), over the whole step.
  const start: number[] = [0];
  ticks.forEach((tick, k) => start.push((start[k] ?? 0) + tick));
  const travel = (k: number): number => SPEED * (start[k] ?? 0);
  const step = travel(HALF);
  // The lead leaves the floor after frame 1 and lands on frame 0 of the next step: placed on
  // the stage along that flight, in ticks, then seen from the cell.
  const flight = (k: number): number =>
    glide(((start[k] ?? 0) - (start[1] ?? 0)) / ((start[HALF] ?? 1) - (start[1] ?? 0)));
  const air = (k: number): number => LEAD - step * flight(k) + travel(k);
  return {
    lead: [
      GUARD.nearFoot,
      // Pushing off, the ball pinned on the stage, the heel up.
      lead(LEAD + travel(1), -10),
      lead(air(2), -9, 1.2),
      lead(air(3), -6, 2.0),
      lead(air(4), -4, 1.8),
      lead(air(5), -3, 0.9),
    ],
    rear: [
      GUARD.farFoot,
      // Popping back, toes reaching for the floor: 60% of its step on the stage.
      rear(REAR - 0.6 * step + travel(1), -22, 2.4),
      // On its ball from here, pinned on the stage where it lands (a step behind GUARD's mark),
      // the heel settling as he sits back onto it.
      rear(REAR - step + travel(2), -24),
      rear(REAR - step + travel(3), -20),
      rear(REAR - step + travel(4), -17),
      rear(REAR - step + travel(5), -15),
    ],
  };
}

/** Each half loop's feet, from its own ticks. */
const STRIDES = [stride(TICKS.slice(0, HALF)), stride(TICKS.slice(HALF, FRAMES))];

/**
 * Upper body offset from GUARD, in whole sprite pixels (0.5 world px), the hips leading the
 * retreat: light on the push, dropping onto the rear foot as it lands, rising as the lead is
 * drawn in.
 */
const BODY: readonly (readonly [number, number])[] = [
  [0, 0],
  [-0.5, 0.5],
  [-1, -0.5],
  [-1.5, -1],
  [-1, -0.5],
  [-0.5, 0],
];
/** The lead forearm trails the bounce (degrees, + lifts the glove), turning about its elbow. */
const NEAR_TRAIL: readonly number[] = [0, -1.2, 2.4, 1.2, -1.2, -1.2];
/**
 * The far glove trails the sit-back a frame late, then eases home with the body: never more
 * than one sprite pixel a frame, so it lands on GUARD's glove on frame 0 (the half-cycle and
 * the loop seam) without a catch-up jump.
 */
const FAR_LAG: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 0],
  [-0.5, 0],
  [-1, -0.5],
  [-1, -0.5],
  [-0.5, 0],
];
/**
 * Once a loop, as he sits back onto the first step, the lead shoulder rolls up to the chin
 * (the shrug of the idle's breath, exactly one sprite pixel): the two steps differ.
 */
const SHRUG: readonly number[] = [0, 0, 0.68, 0.68, 0, 0, 0, 0, 0, 0, 0, 0];

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
