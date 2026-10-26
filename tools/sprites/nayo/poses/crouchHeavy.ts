import { solve, type Foot } from '../../skeleton.ts';
import { at, CROUCH, planted, smear, type Effect, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * crouchHeavy (Balayage): out of the crouch he rocks back, then dives: the rear leg shoots back
 * into a split, the rear hand slaps the floor, and the lead leg sweeps along the ground in a
 * wide arc, the trail skimming the floor and the dust following the foot. Then he pushes off
 * the hand and folds back into the crouch. The lead fist keeps a boxer's guard throughout.
 */

/** The crouch at rest (first frame of its loop): where the move starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;

/** The lead fist up in front, `dx`, `dy` from the lead shoulder, the elbow tucked. */
function leadGuard(pose: Pose, dx = 8.6, dy = -3.4, elbow: 'back' | 'down' = 'back'): Pose {
  const { near } = solve(pose);
  return {
    ...pose,
    nearFist: at(near.shoulder.x + dx, near.shoulder.y + dy),
    bends: { ...pose.bends, nearElbow: elbow },
  };
}

/** The rear fist kept at the jaw, where the crouch holds it, wherever the head goes. */
function rearAtJaw(pose: Pose): Pose {
  const rest = solve(REST).head;
  const { head } = solve(pose);
  return {
    ...pose,
    farFist: at(head.x + REST.farFist.x - rest.x, head.y + REST.farFist.y - rest.y),
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

/** The open rear hand flat on the floor. */
const PALM = at(18, 4.4);
/** The rear foot on its toes at the far end of the split. */
const SPLIT = planted(-34, -40);

/** Rocks back and up onto the rear toes, coiling: chest turned away, the lead fist coming up. */
const LOAD: Pose = leadGuard(
  rearAtJaw({
    ...REST,
    hip: at(REST.hip.x - 0.6, REST.hip.y + 3.4),
    torso: REST.torso - 4,
    head: REST.head + 2,
    shrug: 4.8,
    twist: -0.8,
    farFoot: onToes(REST.farFoot, -38),
  }),
  5.5,
  -9,
  'down',
);

/** Dives: the rear leg shoots back, the rear hand reaches for the floor. */
const DIVE: Pose = leadGuard({
  ...REST,
  hip: at(-3, 20.5),
  torso: 50,
  head: -34,
  shrug: 4.4,
  twist: -0.7,
  nearFoot: onToes(REST.nearFoot, -24),
  farFoot: { x: -29, y: 14, angle: -32 },
  farFist: at(15, 10),
  farHand: 'open',
  bends: { farKnee: 'down' },
});

/** Hand and rear toes hit the floor; the hips lead, the lead leg whips out low. */
const SWING: Pose = leadGuard({
  ...REST,
  hip: at(1.2, 13.8),
  torso: 55,
  head: -40,
  shrug: 4.4,
  twist: -0.2,
  nearFoot: { x: 34, y: 6.8, angle: 16 },
  farFoot: SPLIT,
  farFist: PALM,
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down' },
  effects: [
    smear(5, [-8, 5.5], [2, 3], [14, 2.4], [26, 3.5], [37, 6.5]),
    dust(17, 3, 0.15),
    dust(-35, 3, 0.1),
  ],
});

/** Contact: the leg long along the floor, the trail sweeping in from behind. */
const SWEEP: Pose = leadGuard({
  ...REST,
  hip: at(3, 13),
  torso: 55,
  head: -40,
  shrug: 4.6,
  twist: 0.35,
  nearFoot: { x: 40.5, y: 6.4, angle: 25 },
  farFoot: SPLIT,
  farFist: PALM,
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down' },
  face: 'effort',
  effects: [
    smear(6, [-14, 6], [-2, 3.2], [14, 2.3], [30, 3.4], [44, 6.2]),
    { kind: 'flash', center: at(48.5, 5.5), radius: 4.5, tone: 'strike' },
    dust(44, 4, 0.15),
    dust(17, 3, 0.4),
  ],
});

/** Follow-through: the sweep carries on a touch, the dust rising behind the foot. */
const HOLD: Pose = leadGuard({
  ...SWEEP,
  hip: at(3.2, 12.8),
  torso: 56,
  head: -41,
  twist: 0.45,
  nearFoot: { x: 40, y: 6.3, angle: 20 },
  effects: [dust(45, 5, 0.45), dust(29, 3, 0.3)],
});

/** Pushes off the hand: the lead leg folds back in, the hips come up, the rear toes slide in. */
const PULL: Pose = leadGuard({
  ...SWEEP,
  hip: at(2, 17.5),
  torso: 50,
  head: -34,
  twist: 0.2,
  nearFoot: { x: 24, y: 6.5, angle: 4 },
  farFoot: planted(-28, -40),
  farFist: at(19, 12),
  face: 'focus',
  effects: [dust(45, 5, 0.75), dust(29, 3, 0.6)],
});

/** Gathers: the lead foot home, the rear leg folding under, the hands coming back up. */
const RISE: Pose = leadGuard(
  rearAtJaw({
    ...REST,
    hip: at(-5.5, 21),
    torso: 34,
    head: -16,
    shrug: 4.4,
    twist: 0.1,
    farFoot: { x: -17, y: 9, angle: -28 },
    bends: { farKnee: 'down' },
    effects: [dust(45, 5, 0.95)],
  }),
  5.5,
  -9,
  'down',
);

/** Sits back into the crouch, sinking a touch past it. */
const SETTLE: Pose = {
  ...REST,
  hip: at(REST.hip.x - 0.2, REST.hip.y - 0.8),
  torso: REST.torso + 2.5,
  head: REST.head - 1.5,
  nearFist: at(REST.nearFist.x + 0.4, REST.nearFist.y - 0.8),
  farFist: at(REST.farFist.x + 0.2, REST.farFist.y - 1),
};

export const POSES: readonly Pose[] = [LOAD, DIVE, SWING, SWEEP, HOLD, PULL, RISE, SETTLE, REST];
