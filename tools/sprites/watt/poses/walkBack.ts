import { at, GUARD, lifted, onBall, planted, type Foot, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * walkBack: 10 frames of 3 ticks, looping (30 ticks, 30 px at his 1.0 px/tick, the slowest of
 * the cast). The plod backward, in two beats twice a loop: the lead foot comes back first and
 * low, by the rear one, the guard kept up; then the rear foot pushes off its ball and steps back
 * into the stance. One foot off the floor at a time.
 *
 * A planted foot slides forward 3 px a frame in the cell while the game carries him back over
 * it. The lead foot is lifted on frame 0, before the floor would carry it past its place in the
 * guard (x = 7.5, its toe on the pushbox's limit), and lands back there on frame 0 of the next
 * beat. Frame 0 is the guard.
 *
 * Weight: back on the rear leg, the torso a little more upright than in the guard, retreating
 * behind the clamps; the hips rise as the lead foot lifts, sink as it lands, and the rear step
 * pushes them back. The clamps ride the hips, never in front of their place in the guard.
 */

/** How far a planted foot slides forward in the cell each frame (1.0 px/tick, 3 ticks). */
const SLIDE = 3;
const GUARD_HEEL = GUARD.nearFoot.angle ?? 0;
const REAR_TOE = -18;
const LEAD_X = 7.5;
/** Where the lead foot lands, by the rear one: two frames before it is back in place. */
const LEAD_DOWN = LEAD_X - 2 * SLIDE;
/** Where the rear toe lifts from: three frames after the guard's. */
const REAR_UP = REAR_TOE + 3 * SLIDE;

/** One beat of the plod, frames 0 to 4; frames 5 to 9 play it again. */
const LEAD: readonly Foot[] = [
  // 0: the guard's.
  planted(LEAD_X),
  // 1-2: off the floor, coming back low, the toes dragging down.
  lifted(planted(LEAD_X - 2.5, -4), 2.2),
  lifted(planted(LEAD_X - 4.5, -2), 1.4),
  // 3-4: down by the rear foot, sliding forward with the floor.
  planted(LEAD_DOWN),
  planted(LEAD_DOWN + SLIDE),
];

const REAR: readonly Foot[] = [
  // 0-3: on its ball, the floor carrying it forward.
  onBall(REAR_TOE, GUARD_HEEL),
  onBall(REAR_TOE + SLIDE, GUARD_HEEL),
  onBall(REAR_TOE + 2 * SLIDE, GUARD_HEEL),
  // 3: the push-off, the heel up.
  onBall(REAR_UP, -32),
  // 4: off the floor, stepping back, the toe reaching for the floor.
  lifted(onBall(REAR_UP - 4.5, -28), 2.6),
];

interface Beat {
  /** The hips from the guard's (world px): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees). */
  readonly lean: number;
  readonly twist: number;
  readonly shrug: number;
  /** Each clamp from its place in the guard, riding the hips: never forward of it. */
  readonly near: readonly [number, number];
  readonly far: readonly [number, number];
}

// prettier-ignore
const BEATS: readonly Beat[] = [
  // 0: the guard.
  { hip: [0, 0], lean: 0, twist: 0.35, shrug: 0, near: [0, 0], far: [0, 0] },
  // 1: the lead foot up, the weight back on the rear leg, the hips rising, the torso up.
  { hip: [-0.6, 0.5], lean: -1.5, twist: 0.3, shrug: 0.3, near: [-0.4, 0.3], far: [-0.6, 0.4] },
  // 2: the lead foot coming back by the rear one.
  { hip: [-1, 0.3], lean: -2, twist: 0.28, shrug: 0.4, near: [-0.6, 0.2], far: [-0.8, 0.2] },
  // 3: the lead foot down, the hips sinking onto both legs, the rear heel up to push.
  { hip: [-0.4, -0.7], lean: -1, twist: 0.32, shrug: 0.2, near: [-0.4, -0.5], far: [-0.5, -0.6] },
  // 4: the rear step, the push back, the chest closing, the near shoulder back.
  { hip: [-1.2, -0.2], lean: -1.5, twist: 0.25, shrug: 0, near: [-0.8, -0.2], far: [-0.6, -0.2] },
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
