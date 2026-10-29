import { solve, type Face } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, planted, toeOf, type Foot, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * walkForward: 10 frames of 2 ticks, looping (20 ticks, 38 px at her 1.9 px/tick). A toprock
 * cross-step, the strut of a b-girl stalking in: the rear foot drives off its ball, the knee
 * swings up high in front of the lead leg (the strut) and stamps down on its ball past the lead
 * foot (the cross, the small beat: the chest pops out, the shoulders roll back); then the lead
 * foot flicks up behind, whips through and reaches out, and she lands on its heel into her ginga
 * base (the big beat). One step a foot a loop.
 *
 * The base never collapses: the legs only stack on the cross itself. The stride is fixed by the
 * game (38 px a loop for feet 31 px apart in the guard), so the crossing foot can only land 7 px
 * past the lead one; it lands on the ball, the heel high, which puts its ankle about 10 px ahead,
 * and the next frame the lead foot is already up behind her. Passing, the swinging foot is high
 * (the strut's knee, the flicked heel), so the legs read as two shapes at 1x, never one column.
 *
 * The feet are placed on the stage and drawn in the cell: a planted foot slides back 3.8 px a
 * frame in the cell while the game carries her forward over it, so it never slides on the floor,
 * and a foot rolling on its ball (or rocking on its heel) keeps that point on one floor pixel.
 * Frame 0 is the guard moved back 1.9 px, the last frame sits about as far the other way: the
 * walk leaves the idle and comes back to it without a pop.
 *
 * Weight: low and elastic, the hips never more than 2 px over the guard's: they surge on the
 * push-off, give on the cross, ride the passing leg and drop on the lead heel. The upper body
 * counters the legs: leaning into the push-off (+6 degrees), the chest popped back on the cross
 * (-5); the shoulders turn against the stepping leg (the chest opens to the viewer as the rear
 * leg comes through, closes as the lead leg does) while the rear shoulder rolls down and back,
 * then up into the collar. The lead fist swings against the lead leg, inside the no-clinch line;
 * the cocked rear fist rides its shoulder a frame late and bounces after each beat.
 *
 * The rear knee bends forward all the way, as in the guard: it straightens on the push-off, comes
 * through, drives up to the strut and lands long and straight behind her (frame 8).
 */

/** How far a planted foot slides back in the cell each frame (1.9 px/tick, 2 ticks). */
const SLIDE = 3.8;
/** Frame 0 is GUARD moved back this much (world px); the lead foot a little more. */
const SHIFT = -1.9;
const LEAD_SHIFT = -2.4;

/** A foot placed on the stage at `frame`, drawn in the cell. */
function inCell(foot: Foot, frame: number): Foot {
  return { ...foot, x: foot.x - SLIDE * frame };
}

/** A foot in the air at `frame`, its ankle at (x, y) in the cell, pointing `angle` degrees. */
function air(frame: number, x: number, y: number, angle: number): Foot {
  return { x: x + SLIDE * frame, y, angle };
}

const GUARD_HEEL = GUARD.nearFoot.angle ?? 0;
/** The rear toe's floor pixel at frame 0, and where it crosses to: next loop's frame 0. */
const REAR_TOE = toeOf(GUARD.nearFoot) + SHIFT;
const CROSS_TOE = REAR_TOE + SLIDE * 10;
/** The lead ankle on the stage at frame 0, flat, and where it lands: next loop's frame 0. */
const LEAD_X = GUARD.farFoot.x + LEAD_SHIFT;
const LEAD_LAND = planted(LEAD_X + SLIDE * 10);
/** The lead heel strike: toes up, rocking down onto the flat foot (the heel's corner stays put). */
const STRIKE = 18;

/** The rear (near) foot on the stage, frame by frame. */
const REAR: readonly Foot[] = [
  // 0: the guard's, up on its ball.
  onBall(REAR_TOE, GUARD_HEEL),
  // 1: the push-off: the heel up, the toe on its floor pixel, the leg long.
  onBall(REAR_TOE, -23),
  // 2: off the floor, the knee driving through, the heel flicked up under the seat.
  air(2, -12.5, 13.5, -66),
  // 3: the strut: the knee high in front of the lead leg, the toe pointed down.
  air(3, -1.8, 17.5, -58),
  // 4: the cross, stamped down on its ball past the lead foot, the heel high.
  onBall(CROSS_TOE, -40),
  // 5-7: the heel comes down as the weight rolls over it.
  onBall(CROSS_TOE, -20),
  onBall(CROSS_TOE, -8),
  onBall(CROSS_TOE, 0),
  // 8: the leg trailing long and straight behind her, the heel down.
  onBall(CROSS_TOE, 0),
  // 9: folding into the plié, the heel back up on the ball.
  onBall(CROSS_TOE, GUARD_HEEL),
];

/** The lead (far) foot on the stage, frame by frame. */
const LEAD: readonly Foot[] = [
  // 0-4: planted, the weight rolling over it.
  planted(LEAD_X),
  planted(LEAD_X),
  planted(LEAD_X),
  planted(LEAD_X),
  planted(LEAD_X),
  // 5: flicked up behind her, the heel to the seat.
  air(5, -15, 19.5, -45),
  // 6-8: whipping through and reaching out, slowing down over its spot.
  air(6, 1.6, 11.5, -32),
  air(7, 6.4, 8.2, -14),
  air(8, 7.2, 6.4, 6),
  // 9: the heel strike, the toes up; frame 0 rocks the foot flat on that heel.
  onHeel(LEAD_LAND, STRIKE),
];

interface Beat {
  /** The hips from the guard's, in the cell (world px): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees). */
  readonly lean: number;
  readonly twist: number;
  /** The rear shoulder into the collar, from the guard's. */
  readonly shrug: number;
  /**
   * The cocked rear fist from its place on the rear shoulder, `lag` of the way back to where
   * that shoulder was the frame before (the loop wraps).
   */
  readonly near: readonly [number, number];
  readonly lag: number;
  /** The lead fist from the guard's, riding the hips. */
  readonly far: readonly [number, number];
  /** The on-screen head angle from the guard's (chin up: negative). */
  readonly chin?: number;
  readonly face?: Face;
}

// prettier-ignore
const BEATS: readonly Beat[] = [
  // 0: set on the lead foot: the guard.
  { hip: [SHIFT, 0], lean: 0, twist: 0.45, shrug: 0, near: [0, -0.6], lag: 0.4, far: [0, 0] },
  // 1: the rear leg drives long and straight, the lean into the push; the chest closes, the rear
  // shoulder rolls up into the collar.
  { hip: [-2.4, 1.6], lean: 4, twist: 0.3, shrug: 1.4, near: [0, 0], lag: 0.5, far: [0.4, 0.2] },
  // 2: the knee comes through, the lean at its deepest; the chest starts to open.
  { hip: [-2.6, 2.0], lean: 5, twist: 0.42, shrug: 1.2, near: [0.4, 0.6], lag: 0.6, far: [0.8, 0.2] },
  // 3: the strut: the knee at its top, the hips coming through, the chest opening wide, the rear
  // shoulder rolled back.
  { hip: [-1.4, 2.0], lean: 1, twist: 0.62, shrug: -0.4, near: [0.6, 1.2], lag: 0.6, far: [1.2, -0.2] },
  // 4: the cross, the small beat: the hips thrust in between the feet, the knees give, the chest
  // popped back out over them, the shoulders back.
  { hip: [0.6, 0], lean: -5, twist: 0.72, shrug: -1.6, near: [0.2, 0.6], lag: 0.8, far: [-1.6, -0.8] },
  // 5: the rebound, the lead heel flicked up; the cocked fist lands late, low.
  { hip: [0, 1.0], lean: -4.5, twist: 0.7, shrug: -1.4, near: [-0.4, -1.8], lag: 0.7, far: [-0.4, -0.6] },
  // 6: driving off the crossed foot, the lead leg whipping through; the chest closing.
  { hip: [0.4, 1.8], lean: -2.5, twist: 0.5, shrug: -0.2, near: [0, -0.4], lag: 0.5, far: [-2, 0.4] },
  // 7: the lead foot reaching out, the hips first, the lead fist swung back against it.
  { hip: [1.2, 2.0], lean: -3.5, twist: 0.3, shrug: 1.0, near: [0.4, 0.6], lag: 0.5, far: [-3.4, 0.6] },
  // 8: the rear leg long and straight behind her.
  { hip: [2.5, 2.0], lean: -4.5, twist: 0.22, shrug: 1.6, near: [0.6, 1.0], lag: 0.5, far: [-4.4, 0.4] },
  // 9: down on the lead heel, the big beat, the chest dropping in, the knees opening into the
  // plié.
  { hip: [-0.8, -0.1], lean: 1.5, twist: 0.32, shrug: 0.6, near: [-0.8, -0.6], lag: 0.6, far: [-1.6, -0.6] },
];

const GUARD_SHRUG = GUARD.shrug ?? 0;
/** The guard's head angle on screen: the source drawing, the sideways look. */
const HEAD = GUARD.torso + GUARD.head;
/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return { x: GUARD.nearFist.x - shoulder.x, y: GUARD.nearFist.y - shoulder.y };
})();

function body(b: Beat, frame: number): Pose {
  const torso = GUARD.torso + b.lean;
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]),
    torso,
    head: HEAD + (b.chin ?? 0) - torso,
    shrug: GUARD_SHRUG + b.shrug,
    twist: b.twist,
    nearFoot: inCell(REAR[frame] ?? GUARD.nearFoot, frame),
    farFoot: inCell(LEAD[frame] ?? GUARD.farFoot, frame),
    farFist: at(GUARD.farFist.x + b.hip[0] + b.far[0], GUARD.farFist.y + b.hip[1] + b.far[1]),
    ...(b.face ? { face: b.face } : {}),
  };
}

const BODIES: readonly Pose[] = BEATS.map(body);
const SHOULDERS = BODIES.map((pose) => solve(pose, RIFF_BODY).near.shoulder);

export const POSES: readonly Pose[] = BODIES.map((pose, i) => {
  const b = BEATS[i];
  const now = SHOULDERS[i];
  const before = SHOULDERS[(i + BEATS.length - 1) % BEATS.length];
  if (!b || !now || !before) return pose;
  // The loaded rear fist follows its shoulder `lag` of a frame late.
  const x = now.x + (before.x - now.x) * b.lag + COCKED.x + b.near[0];
  const y = now.y + (before.y - now.y) * b.lag + COCKED.y + b.near[1];
  return { ...pose, nearFist: at(x, y) };
});
