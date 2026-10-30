import { solve, type Foot } from '../../skeleton.ts';
import { at, CROUCH, planted, smear, type Effect, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * crouchHeavy (Balayage): out of the crouch he rocks back onto the rear toes, coiling, then
 * dives: the rear leg slides back into a split, the rear hand slaps the floor, and the lead leg
 * sweeps along the ground in a wide arc, the foot hooked, the trail skimming the floor and the
 * dust following the foot. Then he pushes off the hand and folds back into the crouch. The lead
 * glove keeps a boxer's guard in front of the chin throughout, the eyes stay on the opponent.
 *
 * The rear foot stays on its toes the whole way, upright off the ball of the foot, the sole facing
 * back: the rear shin lies along the floor (in the split, under the thigh in the crouch), so a
 * foot laid forward would fold the toes in toward the knee, an ankle bent up 50 to 70 degrees.
 * The sweeping foot is turned up, the sole leading, never pointed in line with the leg.
 */

/** The crouch at rest (first frame of its loop): where the move starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;
const REST_HEAD = solve(REST).head;
/** How high the crouch holds the rear heel (degrees, negative: up). */
const REST_HEEL = REST.farFoot.angle ?? 0;

/** The crouch's high guard, both gloves carried with the head, nudged (world px). */
function guarded(pose: Pose, lead = at(0, 0), rear = at(0, 0)): Pose {
  const { head } = solve(pose);
  const carry = (fist: { x: number; y: number }, nudge: { x: number; y: number }) =>
    at(head.x + fist.x - REST_HEAD.x + nudge.x, head.y + fist.y - REST_HEAD.y + nudge.y);
  return { ...pose, nearFist: carry(REST.nearFist, lead), farFist: carry(REST.farFist, rear) };
}

/**
 * Low, the lead glove up in front of the chin, `dx`, `dy` from the lead shoulder, elbow in
 * right under the shoulder (the sleeve's square stays upright, on whole pixels).
 */
function leadGuard(pose: Pose, dx = 8.6, dy = -4.6): Pose {
  const { near } = solve(pose);
  return {
    ...pose,
    nearFist: at(near.shoulder.x + dx, near.shoulder.y + dy),
    bends: { ...pose.bends, nearElbow: 'back' },
  };
}

/** A planted foot pivoting on its toes, its heel `angle` degrees up (the toes stay put). */
function onToes(foot: Foot, angle: number): Foot {
  /** How far the toes reach past the ankle, foot at `degrees`. */
  const toes = (degrees: number) => {
    const a = (degrees * Math.PI) / 180;
    return 2.3 * Math.sin(a) + 7 * Math.cos(a);
  };
  return planted(foot.x + toes(foot.angle ?? 0) - toes(angle), angle);
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** The open rear hand flat on the floor, under the far shoulder. */
const PALM = at(16, 4);
/**
 * The rear foot on its toes at the far end of the split, upright, the sole facing back; the leg
 * long but not locked (the hips never pull it past its length).
 */
const SPLIT = planted(-31.8, -88);

/**
 * Rocks back onto the rear toes, coiling against the dive to come: the hips sink back over the
 * rear foot, the chest straightens and turns away, the lead shoulder rolls in over the chin,
 * the guard shut tight.
 */
const LOAD: Pose = guarded(
  {
    ...REST,
    hip: at(-13, 18.5),
    torso: 15,
    head: 1,
    shrug: 3,
    twist: -0.8,
    farFoot: onToes(REST.farFoot, REST_HEEL - 4),
  },
  // The lead glove tucked up under the chin, carried forward as the chest straightens so the
  // elbow stays under its shoulder (the sleeve's square upright, no chicken wing).
  at(2.4, -0.4),
  at(-0.4, 0.2),
);

/**
 * Dives: the rear leg slides back skimming the floor (its trail and the dust where it left show
 * the slide), the rear hand reaching down past the lead knee for the floor, the elbow soft; the
 * lead foot pivots on its toes, the last support before the sweep.
 */
const DIVE: Pose = leadGuard({
  ...REST,
  hip: at(-4, 19.6),
  torso: 50,
  head: -34,
  shrug: 3,
  twist: -0.7,
  nearFoot: onToes(REST.nearFoot, -24),
  farFoot: planted(-32, -94),
  farFist: at(17, 12),
  farHand: 'open',
  bends: { farKnee: 'down' },
  effects: [smear(3, [-13, 9.5], [-21, 9.5], [-29, 9.5]), dust(-12, 2.2, 0.05)],
});

/**
 * Hand and rear toes hit the floor; the hips lead, the lead leg whips out low, most of the way
 * (the last of it snaps out on the hit): already opening out past the knee, so the thigh swings
 * clear of the belly the chest is folded over (tools/sprites/anatomy.ts: tucked in tighter, the
 * hip folds past its stop).
 */
const SWING: Pose = leadGuard({
  ...REST,
  hip: at(0, 14.4),
  torso: 53,
  head: -38,
  shrug: 3,
  twist: -0.2,
  nearFoot: { x: 31.5, y: 6.5, angle: 11 },
  farFoot: SPLIT,
  farFist: PALM,
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down', farElbow: 'back' },
  effects: [
    smear(5, [8, 6], [16, 4.5], [24, 4.8], [30.5, 6.3]),
    dust(PALM.x, 3, 0.15),
    dust(-35, 3, 0.1),
  ],
});

/**
 * Contact: the leg long along the floor, the foot turned up (the heel skims the floor, the sole
 * leads), the trail sweeping in low.
 */
const SWEEP: Pose = leadGuard({
  ...REST,
  hip: at(5.5, 12.6),
  torso: 51,
  head: -36,
  shrug: 3.2,
  twist: 0.35,
  nearFoot: { x: 43.1, y: 6, angle: 47 },
  farFoot: SPLIT,
  farFist: PALM,
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down', farElbow: 'back' },
  face: 'effort',
  effects: [
    // Short, thin and riding just over the floor, led by the sole (just ahead of the ankle): a
    // long trail flares so wide that drawSmear lifts the whole band off the floor, up to the
    // chest, where it reads as the lead glove's trail.
    smear(4, [22, 6.5], [33, 5.6], [45, 5]),
    { kind: 'flash', center: at(49.3, 5.5), radius: 4.5, tone: 'strike' },
    dust(44.5, 4, 0.15),
    dust(PALM.x, 3, 0.4),
    dust(-35, 3, 0.4),
  ],
});

/**
 * Follow-through: the sweep carries on a touch, the dust rising behind the foot (the lead glove
 * a hair forward, so the sleeve's square stays on whole pixels).
 */
const HOLD: Pose = leadGuard(
  {
    ...SWEEP,
    hip: at(5.7, 12.4),
    torso: 52,
    head: -37,
    twist: 0.45,
    nearFoot: { x: 43.1, y: 5.9, angle: 49 },
    effects: [dust(45.5, 5, 0.45), dust(PALM.x, 3, 0.65), dust(-35, 3, 0.7)],
  },
  8.8,
);

/**
 * Pushes off the hand: the lead leg folds back in, the hips come up, the rear toes slide in,
 * the rear hand peeling off the floor.
 */
const PULL: Pose = leadGuard({
  ...SWEEP,
  hip: at(1.2, 17.5),
  torso: 50,
  head: -34,
  twist: 0.2,
  nearFoot: { x: 23.5, y: 6.5, angle: 4 },
  farFoot: planted(-30.5, -92),
  farFist: at(19.5, 16),
  face: 'focus',
  effects: [dust(44, 5, 0.75), dust(PALM.x, 3, 0.9)],
});

/**
 * Gathers: the lead foot home, the rear leg folding in under the hips, the rear glove on its
 * way back up to the cheek, the guard closing.
 */
const RISE: Pose = guarded(
  {
    ...REST,
    hip: at(-6.2, 19),
    torso: 34,
    head: -16,
    shrug: 2.6,
    twist: 0.1,
    farFoot: planted(-12.5, -98),
    bends: { ...REST.bends, farKnee: 'down' },
    // The rear foot has slid in from the split: a puff where it left.
    effects: [dust(44, 5, 0.95), dust(-30, 2.2, 0.35)],
  },
  at(1, -1.2),
  at(-1.5, -6),
);

/** Sits back into the crouch, sinking a touch past it, the gloves settling last. */
const SETTLE: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 0.2, REST.hip.y - 0.6),
    torso: REST.torso + 1,
    head: REST.head,
    shrug: 2.2,
    farFoot: onToes(REST.farFoot, REST_HEEL - 4),
  },
  at(0.3, 0.5),
  at(0.2, 0.4),
);

export const POSES: readonly Pose[] = [LOAD, DIVE, SWING, SWEEP, HOLD, PULL, RISE, SETTLE, REST];
