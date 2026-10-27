import { solve, type Bend, type Face } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, planted, toeOf, type Foot, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * walkBack: 10 frames of 2 ticks, looping (20 ticks, 28 px at her 1.4 px/tick). A toprock back
 * step, the retreat of someone who is not scared: the weight rocks back onto the rear foot, the
 * lead foot is picked up and drawn back and set down on its toes just ahead of the rear one (the
 * stance closed for a beat, the chest back, the chin up, the lid half down: come on then), then
 * the rear foot reaches far back and she sits back into the open plié on it. One step a foot a
 * loop.
 *
 * The stride is fixed by the game (28 px a loop for feet 31 px apart in the guard): stepping the
 * lead foot first, it can only land a few pixels ahead of the rear one (stepping the rear one
 * first would open the stance to 59 px). So the closed stance is a pose, held two frames: the
 * lead foot lands on its toes, the heel high (its ankle 7 px ahead of the rear one), the rear
 * leg straight under her, the lead knee bent forward over the toes, a cocked hip; and the rear
 * foot is off the floor the very next frame.
 *
 * The feet are placed on the stage and drawn in the cell: a planted foot slides forward 2.8 px a
 * frame in the cell while the game carries her back over it, so it never slides on the floor; a
 * foot rolling on its ball keeps its toe on one floor pixel. Frame 0 is the guard with the feet
 * 0.8 px forward, the last frame has them 2 px back: the walk leaves the idle and comes back to
 * it without a pop.
 *
 * The rear knee: turned out (`back`) in the guard, it straightens as the weight rocks back onto
 * that leg (frame 1) and bends forward (`front`) once the foot is under her; reaching back, the
 * leg lands long and straight and turns out again as she sits into the plié. The upper body
 * counters the legs: the chest opens to the viewer and the rear shoulder rolls back as the lead
 * leg goes back, closes and rolls up into the collar as the rear one does; the lean goes back
 * against the retreat, furthest on the closed stance. The cocked rear fist rides its shoulder a
 * frame late and bounces after each step, the lead fist swings against the lead leg, inside the
 * no-clinch line.
 */

/** How far a planted foot slides forward in the cell each frame (1.4 px/tick, 2 ticks). */
const SLIDE = 2.8;
/** Frame 0 has the feet this far forward of the guard's (world px). */
const SHIFT = 0.8;

/** A foot placed on the stage at `frame`, drawn in the cell. */
function inCell(foot: Foot, frame: number): Foot {
  return { ...foot, x: foot.x + SLIDE * frame };
}

/**
 * A foot in the air at `frame`, its ankle at `x` in the cell, its lowest point `clearance` px over
 * the floor, pointing `angle` degrees.
 */
function air(frame: number, x: number, clearance: number, angle: number): Foot {
  return lifted(planted(x - SLIDE * frame, angle), clearance);
}

const GUARD_HEEL = GUARD.nearFoot.angle ?? 0;
/** The rear toe's floor pixel at frame 0, and where it reaches back to: next loop's frame 0. */
const REAR_TOE = toeOf(GUARD.nearFoot) + SHIFT;
const REAR_BACK = REAR_TOE - SLIDE * 10;
/** The lead toe's floor pixel at frame 0, and where it lands: next loop's frame 0. */
const LEAD_TOE = toeOf(planted(GUARD.farFoot.x + SHIFT));
const LEAD_BACK = LEAD_TOE - SLIDE * 10;

/** The lead (far) foot on the stage, frame by frame. */
const LEAD: readonly Foot[] = [
  // 0: the guard's.
  planted(GUARD.farFoot.x + SHIFT),
  // 1-3: picked up, the toe trailing, drawn back under her.
  air(1, 4.4, 0.5, -24),
  air(2, -0.6, 2.2, -34),
  air(3, -3.6, 2.8, -42),
  // 4: down on its toes, the heel high, just ahead of the rear foot.
  onBall(LEAD_BACK, -40),
  // 5-9: the heel down, the weight on it.
  onBall(LEAD_BACK, -10),
  planted(LEAD_BACK - RIFF_BODY.foot),
  planted(LEAD_BACK - RIFF_BODY.foot),
  planted(LEAD_BACK - RIFF_BODY.foot),
  planted(LEAD_BACK - RIFF_BODY.foot),
];

/** The rear (near) foot on the stage, frame by frame. */
const REAR: readonly Foot[] = [
  // 0: the guard's, up on its ball.
  onBall(REAR_TOE, GUARD_HEEL),
  // 1-4: the heel down, the weight rocked back onto it.
  onBall(REAR_TOE, 0),
  onBall(REAR_TOE, 0),
  onBall(REAR_TOE, 0),
  onBall(REAR_TOE, 0),
  // 5-7: off the floor at once, reaching far back, the toe pointed.
  air(5, -16, 4.2, -48),
  air(6, -21.4, 3.4, -38),
  air(7, -26.2, 1.4, -30),
  // 8: down on its ball, the leg long; 9: the heel settling as she sits into the plié.
  onBall(REAR_BACK, -24),
  onBall(REAR_BACK, GUARD_HEEL),
];

interface Beat {
  /** The hips from the guard's, in the cell (world px): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees). */
  readonly lean: number;
  readonly twist: number;
  /** The rear shoulder into the collar, from the guard's. */
  readonly shrug: number;
  /** The rear knee: turned out (`back`) in the guard and the plié, forward under her. */
  readonly knee: Bend;
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
  // 0: the guard.
  { hip: [0, 0], lean: 0, twist: 0.45, shrug: 0, knee: 'back', near: [0, 0], lag: 0.4, far: [0, 0] },
  // 1: the weight rocks back and up onto the rear leg, straight; the lead foot picked up.
  { hip: [-0.2, 2.0], lean: -2, twist: 0.52, shrug: -0.4, knee: 'back', near: [0, 0], lag: 0.6, far: [0, 0] },
  // 2-3: the lead foot drawn back, the chest opening and coming back, the rear shoulder rolling
  // down and back.
  { hip: [-1.2, 1.6], lean: -4.5, twist: 0.6, shrug: -1.0, knee: 'front', near: [0.2, 0.4], lag: 0.6, far: [1.2, 0.2] },
  { hip: [-1.8, 1.8], lean: -6.5, twist: 0.68, shrug: -1.4, knee: 'front', near: [0.4, 0.6], lag: 0.6, far: [1.8, 0.4] },
  // 4: the stance closed on the lead toes, the hip cocked: the chest right back, the chin up,
  // the lid half down: come on then.
  { hip: [-2.0, 1.6], lean: -11, twist: 0.72, shrug: -1.8, knee: 'front', near: [0.2, 0.2], lag: 0.8, far: [1.4, 0.4], chin: -6, face: 'cool' },
  // 5: held a breath, the rear foot already off the floor; the cocked fist lands late, low.
  { hip: [-2.2, 1.8], lean: -10, twist: 0.66, shrug: -1.4, knee: 'front', near: [-0.4, -1.6], lag: 0.7, far: [1.8, 0.2], chin: -5, face: 'cool' },
  // 6-7: the rear foot reaching far back, the chest closing, the rear shoulder rolling up.
  { hip: [-2.6, 1.4], lean: -6, twist: 0.48, shrug: -0.2, knee: 'front', near: [0, -0.4], lag: 0.6, far: [0.4, 0] },
  { hip: [-2.2, 1.2], lean: -3, twist: 0.3, shrug: 0.9, knee: 'front', near: [0.4, 0.4], lag: 0.5, far: [-0.8, -0.2] },
  // 8: down on the rear ball, the leg long and straight: its knee turns out through the straight.
  { hip: [-0.6, 1.0], lean: 0, twist: 0.22, shrug: 1.6, knee: 'back', near: [0.6, 0.8], lag: 0.5, far: [-1.6, -0.2] },
  // 9: sitting back into the plié, the chest dropping in over the lead leg.
  { hip: [-0.8, -0.6], lean: 1.5, twist: 0.32, shrug: 1.0, knee: 'back', near: [-0.6, -1.0], lag: 0.6, far: [-1.2, -0.6] },
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
    bends: { ...GUARD.bends, nearKnee: b.knee },
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
