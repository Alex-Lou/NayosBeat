import { solve, type Foot } from '../../skeleton.ts';
import { at, CROUCH, planted, smear, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * crouchLight (Coup bas): a quick low kick to the shin with the lead foot, out of the crouch.
 * Economical: the shell stays closed (lead shoulder up, rear fist at the jaw) and rides with
 * the head, the hips rise and slide in behind the kick, the rear heel peels up around its toes,
 * and only the lead leg snaps out and back.
 */

/** The crouch at rest (first frame of its loop): where the move starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;
const REST_HEAD = solve(REST).head;

/**
 * The crouch's hands, kept where they sit around the head wherever the head goes; `lead` nudges
 * the lead fist (world px), swinging against the kick.
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

/** Rocks back a hair onto the rear foot, the lead foot peeling off the floor. */
const CHAMBER: Pose = guarded({
  ...REST,
  hip: at(REST.hip.x - 0.8, REST.hip.y + 0.6),
  torso: REST.torso - 3,
  head: REST.head + 2,
  shrug: 4.8,
  nearFoot: { x: 8.5, y: 7.6, angle: -28 },
  farFoot: onToes(-34),
  bends: { nearKnee: 'up' },
});

/** The leg snapping out, the hips sliding in behind it. */
const SNAP: Pose = guarded(
  {
    ...REST,
    hip: at(-8, 16.6),
    torso: 15,
    head: REST.head + 4,
    shrug: 5,
    nearFoot: { x: 22, y: 10.6, angle: -16 },
    farFoot: onToes(-38),
    bends: { nearKnee: 'up' },
    effects: [smear(4, [10, 9], [16, 10.5], [24, 10.5])],
  },
  at(-1, 0.5),
);

/** Contact: toes into the shin, the torso tipped back, the lead shoulder up to the chin. */
const STRIKE: Pose = guarded(
  {
    ...REST,
    hip: at(-6, 17.5),
    torso: 12,
    head: REST.head + 6,
    shrug: 5.4,
    twist: 0.2,
    nearFoot: { x: 30.5, y: 9.6, angle: -10 },
    farFoot: onToes(-42),
    bends: { nearKnee: 'up' },
    effects: [
      smear(5, [10, 9.5], [18, 11], [27, 10.4], [35, 8.6]),
      { kind: 'flash', center: at(37.5, 8), radius: 3.5, tone: 'strike' },
    ],
  },
  at(-2.2, 1),
);

/** Snapped back, knee up, the hips following. */
const RECOIL: Pose = guarded(
  {
    ...REST,
    hip: at(-7.8, 16.6),
    torso: 16,
    head: REST.head + 3,
    shrug: 4.8,
    nearFoot: { x: 16, y: 10.6, angle: -24 },
    farFoot: onToes(-36),
    bends: { nearKnee: 'up' },
  },
  at(-1, 0.5),
);

/** The foot back down, the hips sinking a touch past the crouch before they settle. */
const LAND: Pose = guarded({
  ...REST,
  hip: at(REST.hip.x - 0.1, REST.hip.y - 0.7),
  torso: REST.torso + 2.5,
  head: REST.head - 1,
});

export const POSES: readonly Pose[] = [CHAMBER, SNAP, STRIKE, RECOIL, LAND, REST];
