import { at, GUARD, lifted, onBall, planted, type Foot, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * walkForward: 10 frames of 3 ticks, looping (30 ticks, 36 px at his 1.2 px/tick). A colosse's
 * plod in two beats, twice a loop: the rear leg gathers in behind the lead one (the feet come
 * close, the weight sinks onto them), then the lead foot steps out, heel first, and the guard is
 * back. One foot off the floor at a time, for two frames of five: the steps are short and heavy,
 * the boots never higher than 3 px.
 *
 * The feet are placed on the stage and drawn in the cell: a planted foot slides back 3.6 px a
 * frame in the cell while the game carries him forward over it, so it never slides on the floor.
 * The lead foot never lands past its place in the guard (x = 7.5, its toe on the pushbox's limit,
 * tests/tools/watt-sprites.test.ts): it lands there and slides back from it. Frame 0 is the
 * guard: the walk leaves the idle and comes back to it without a pop.
 *
 * Weight: the hips sink as the rear foot comes down by the lead one, rise as the lead foot
 * leaves; the torso leans into the gather and straightens as the lead foot reaches; the
 * shoulders turn with the stepping leg, the near one forward as the rear leg comes through. The
 * clamps ride the hips, never in front of their place in the guard, the near one a frame late.
 */

/** How far a planted foot slides back in the cell each frame (1.2 px/tick, 3 ticks). */
const SLIDE = 3.6;
const GUARD_HEEL = GUARD.nearFoot.angle ?? 0;
/** The rear toe in the guard, and where the gathered rear foot lands: three frames later. */
const REAR_TOE = -18;
const GATHERED = REAR_TOE + 3 * SLIDE;
/** The lead ankle in the guard: where it lands, and where it is two frames later. */
const LEAD_X = 7.5;

/** One beat of the plod, frames 0 to 4; frames 5 to 9 play it again. */
const REAR: readonly Foot[] = [
  // 0: the guard's, up on its ball.
  onBall(REAR_TOE, GUARD_HEEL),
  // 1: off the floor, the toe trailing down, coming through low.
  lifted(onBall(REAR_TOE + 5.4, -30), 2.5),
  // 2-4: down by the lead foot on its ball, then sliding back with the floor.
  onBall(GATHERED, GUARD_HEEL),
  onBall(GATHERED - SLIDE, GUARD_HEEL),
  onBall(GATHERED - 2 * SLIDE, GUARD_HEEL),
];

const LEAD: readonly Foot[] = [
  // 0-2: planted, the floor carrying it back under him.
  planted(LEAD_X),
  planted(LEAD_X - SLIDE),
  planted(LEAD_X - 2 * SLIDE),
  // 3: off the floor, the heel first.
  lifted(planted(LEAD_X - 2 * SLIDE + 2.4, 4), 2.5),
  // 4: reaching out, the toes up for the heel strike.
  lifted(planted(LEAD_X - 2.4, 10), 1.2),
];

interface Beat {
  /** The hips from the guard's (world px): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees). */
  readonly lean: number;
  readonly twist: number;
  /** The shoulders into the collar, from the guard's. */
  readonly shrug: number;
  /** Each clamp from its place in the guard, riding the hips: never forward of it. */
  readonly near: readonly [number, number];
  readonly far: readonly [number, number];
}

// prettier-ignore
const BEATS: readonly Beat[] = [
  // 0: the guard.
  { hip: [0, 0], lean: 0, twist: 0.35, shrug: 0, near: [0, 0], far: [0, 0] },
  // 1: the rear leg coming through, the weight on the lead leg, sinking a little.
  { hip: [0, -0.4], lean: 0.5, twist: 0.45, shrug: 0.2, near: [-0.4, -0.2], far: [-0.2, -0.6] },
  // 2: the gather: the rear foot down by the lead one, the hips at their lowest, the lean in.
  { hip: [-0.3, -1], lean: 0.5, twist: 0.45, shrug: 0.5, near: [-0.6, -0.8], far: [-0.1, -1.8] },
  // 3: the lead foot leaving, the hips rising off both legs.
  { hip: [0.3, 0.3], lean: 0.5, twist: 0.38, shrug: 0.2, near: [-0.5, -0.3], far: [-0.2, -0.4] },
  // 4: the lead foot reaching out, the torso straightening, the hips at their highest.
  { hip: [0, 0.6], lean: -0.5, twist: 0.28, shrug: -0.2, near: [-0.2, 0.3], far: [-0.2, 0.3] },
];

const GUARD_SHRUG = GUARD.shrug ?? 0;
/** The guard's head angle on screen: the bulb stays upright over the collar. */
const HEAD = GUARD.torso + GUARD.head;

function body(b: Beat, frame: number): Pose {
  const torso = GUARD.torso + b.lean;
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]),
    torso,
    head: HEAD - torso,
    shrug: GUARD_SHRUG + b.shrug,
    twist: b.twist,
    nearFoot: REAR[frame] ?? GUARD.nearFoot,
    farFoot: LEAD[frame] ?? GUARD.farFoot,
    nearFist: at(GUARD.nearFist.x + b.near[0], GUARD.nearFist.y + b.hip[1] + b.near[1]),
    farFist: at(GUARD.farFist.x + b.far[0], GUARD.farFist.y + b.hip[1] + b.far[1]),
  };
}

const BEAT: readonly Pose[] = BEATS.map(body);

export const POSES: readonly Pose[] = [...BEAT, ...BEAT];
