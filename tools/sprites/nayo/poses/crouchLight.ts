import { solve, type Foot } from '../../skeleton.ts';
import { at, CROUCH, ease, planted, smear, tween, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * crouchLight (Coup bas): a quick low kick to the shin with the lead foot, out of the crouch.
 * Economical: the high guard stays shut (near glove under the chin, far glove by the cheek) and
 * rides with the head; the weight rocks back onto the rear toes, the hips slide in behind the
 * kick and the torso tips back against it, one line from the head down to the toes; only the
 * lead leg snaps out flat along the floor and back.
 */

/** The crouch at rest (first frame of its loop): where the move starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;
const REST_HEAD = solve(REST).head;

/**
 * The crouch's gloves, kept where they sit around the head wherever the head goes; `lead`
 * nudges the near glove (world px): carried forward as the torso tips back, so the lead elbow
 * stays under its shoulder and the guard reads as the crouch's, shut in front of the chin.
 */
function guarded(pose: Pose, lead = at(0, 0)): Pose {
  const { head } = solve(pose);
  const carry = (fist: { x: number; y: number }, nudge = at(0, 0)) =>
    at(head.x + fist.x - REST_HEAD.x + nudge.x, head.y + fist.y - REST_HEAD.y + nudge.y);
  return { ...pose, nearFist: carry(REST.nearFist, lead), farFist: carry(REST.farFist) };
}

/** The rear foot pivoting on its toes, its heel `angle` degrees up (the toes stay put). */
function onToes(angle: number): Foot {
  /** How far the toes reach past the ankle, foot at `degrees`. */
  const toes = (degrees: number) => {
    const a = (degrees * Math.PI) / 180;
    return 2.3 * Math.sin(a) + 7 * Math.cos(a);
  };
  const rest = REST.farFoot;
  return planted(rest.x + toes(rest.angle ?? 0) - toes(angle), angle);
}

/** Rocks back onto the rear toes, the lead knee lifting, the foot peeling off the floor. */
const CHAMBER: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 1, REST.hip.y + 1),
    torso: REST.torso - 4,
    head: REST.head + 2,
    shrug: 2.4,
    nearFoot: { x: 9, y: 8.4, angle: -24 },
    farFoot: onToes(-36),
    bends: { ...REST.bends, nearKnee: 'up' },
  },
  at(1.6, -0.3),
);

/** Contact: the leg long and flat, toes into the shin; the torso tipped back, eyes level. */
const STRIKE: Pose = guarded(
  {
    ...REST,
    hip: at(-6.4, 17.6),
    torso: 12,
    head: 4,
    shrug: 3,
    twist: 0.15,
    nearFoot: { x: 30.6, y: 9.4, angle: -8 },
    farFoot: onToes(-44),
    bends: { ...REST.bends, nearKnee: 'up' },
    effects: [
      smear(5, [11, 10.5], [19, 10.6], [28, 9.8], [35.5, 8.2]),
      { kind: 'flash', center: at(37.5, 8), radius: 3.5, tone: 'strike' },
    ],
  },
  at(3.3, -0.4),
);

/** Snapping out: most of the way there in one frame, the hips sliding in behind it. */
const SNAPPING = tween(CHAMBER, STRIKE, 0.68, ease.out);
const SNAP: Pose = {
  ...SNAPPING,
  // The lead glove a hair forward of the in-between: the sleeve's square lands on whole pixels.
  nearFist: at(SNAPPING.nearFist.x + 0.6, SNAPPING.nearFist.y),
  nearFoot: { x: 23, y: 10.4, angle: -14 },
  bends: { ...REST.bends, nearKnee: 'up' },
  effects: [smear(4, [10, 10], [16.5, 11], [25, 10.4])],
};

/** Snapped back, the knee up, the hips following the foot home. */
const RECOIL: Pose = guarded(
  {
    ...REST,
    hip: at(-7.8, 16.8),
    torso: 16,
    head: 1,
    shrug: 2.6,
    nearFoot: { x: 15.6, y: 9.8, angle: -20 },
    farFoot: onToes(-38),
    bends: { ...REST.bends, nearKnee: 'up' },
  },
  at(2.1, -0.3),
);

/** The foot back down on its spot, the hips sinking a touch past the crouch before they settle. */
const LAND: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 0.2, REST.hip.y - 0.8),
    torso: REST.torso + 1,
    head: REST.head,
    shrug: 2.2,
    farFoot: onToes(-33),
  },
  at(1, -0.5),
);

export const POSES: readonly Pose[] = [CHAMBER, SNAP, STRIKE, RECOIL, LAND, REST];
