import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, blend, CROUCH, GUARD, planted, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * block: 6 frames. Standing 0-2 (2, 3 ticks, then held), crouching 3-5 (same).
 *
 * The high guard, tightened: the gloves are already up, so the block closes them, the far glove
 * pulled in to the temple, the near one up over the chin, elbows on the ribs, the lead shoulder
 * rolled up and the chin tucked behind the gloves. The body takes the blow: frame 0, held
 * through the hitstop, carries the extreme (the lean rocked back, the knees sinking, the rear
 * heel dropping to brace, the lead toes peeling up); frame 1 springs back, the feet scuffing
 * the floor as the pushback slides him; frame 2 is the shell held while the blockstun lasts,
 * one breath from the guard (or the crouch) it returns to.
 *
 * Everything stays inside the pushbox: at point blank the fighters touch, never clinch.
 */

/** Dust where the feet scrape back: an already spreading puff. */
function scuff(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** How far the toes reach past the ankle, foot at `degrees`. */
function toes(degrees: number): number {
  const a = (degrees * Math.PI) / 180;
  return 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** How far the heel sits behind the ankle, foot at `degrees`. */
function heel(degrees: number): number {
  const a = (degrees * Math.PI) / 180;
  return 2.6 * Math.cos(a) - 2.3 * Math.sin(a);
}

/** `foot` turned to `angle` around its toes (the ball of the foot stays put). */
function onToes(foot: Foot, angle: number): Foot {
  return planted(foot.x + toes(foot.angle ?? 0) - toes(angle), angle);
}

/** `foot` turned to `angle` around its heel (the toes peel up, the heel stays put). */
function onHeel(foot: Foot, angle: number): Foot {
  return planted(foot.x - heel(foot.angle ?? 0) + heel(angle), angle);
}

/**
 * The gloves placed around the head of `pose` (world px from the head's center): wherever the
 * blow rocks the head, the gloves stay glued to it.
 */
function shell(pose: Omit<Pose, 'nearFist' | 'farFist'>, near: Point, far: Point): Pose {
  const { head } = solve({ ...pose, nearFist: at(0, 0), farFist: at(0, 0) });
  return {
    ...pose,
    nearFist: at(head.x + near.x, head.y + near.y),
    farFist: at(head.x + far.x, head.y + far.y),
  };
}

// Standing ----------------------------------------------------------------------------------

/** The gloves in the closed shell: near over the chin, far at the temple (from the head). */
const NEAR = at(6, -11);
const FAR = at(7.1, -4.4);

/** Contact, held through the hitstop: rocked back onto the rear foot, knees giving. */
const IMPACT = shell(
  {
    hip: at(-9.4, 33.1),
    torso: 6,
    head: 12,
    shrug: 3.4,
    twist: -0.25,
    nearFoot: onHeel(GUARD.nearFoot, 8),
    farFoot: onToes(GUARD.farFoot, -4),
    face: 'effort',
  },
  at(NEAR.x - 1, NEAR.y + 0.5),
  at(FAR.x - 1.1, FAR.y - 0.3),
);

/** Settled in the shell, held while the blockstun lasts: the guard, closed and sunk. */
const HOLD = shell(
  {
    hip: at(-7.1, 35.6),
    torso: 14,
    head: 4.5,
    shrug: 2.6,
    twist: -0.1,
    nearFoot: GUARD.nearFoot,
    farFoot: onToes(GUARD.farFoot, -13),
    face: 'focus',
  },
  NEAR,
  FAR,
);

/**
 * Springing back up, a hair past the shell: the hips and the lean lead, the gloves and the chin
 * a beat behind, the rear heel rising, the lead toes coming down; the pushback scuffs the floor.
 */
const RECOIL = shell(
  {
    ...HOLD,
    hip: at(-7.2, 36.1),
    torso: 15.5,
    head: 3.5,
    shrug: 3.2,
    twist: -0.15,
    nearFoot: onHeel(GUARD.nearFoot, 3),
    farFoot: onToes(GUARD.farFoot, -10),
    face: 'effort',
    effects: [scuff(14.5, 2.2, 0.55), scuff(-17, 1.6, 0.5)],
  },
  at(NEAR.x - 0.5, NEAR.y + 0.3),
  at(FAR.x - 0.5, FAR.y - 0.2),
);

// Crouching: the crouch's own shell, tightened the same way -------------------------------

/** The crouch at rest (first frame of its loop): where the crouching block starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;
const REST_HEAD = solve(REST).head;
/** A head tilt that keeps the head under 20 degrees on a torso leaning `torso` (drawn upright). */
const upright = (torso: number, head: number): number => Math.min(head, 19 - torso);
/** The crouch's gloves around its head, pulled in tight (world px from the head's center). */
const LOW_NEAR = at(REST.nearFist.x - REST_HEAD.x - 1.2, REST.nearFist.y - REST_HEAD.y + 1.4);
const LOW_FAR = at(REST.farFist.x - REST_HEAD.x - 1.0, REST.farFist.y - REST_HEAD.y + 0.6);

const LOW_IMPACT = shell(
  {
    ...REST,
    hip: at(REST.hip.x - 1.8, REST.hip.y - 1.0),
    torso: REST.torso - 7,
    head: upright(REST.torso - 7, REST.head + 6),
    shrug: (REST.shrug ?? 0) + 1.2,
    twist: -0.25,
    nearFoot: onHeel(REST.nearFoot, 6),
    farFoot: onToes(REST.farFoot, Math.min(0, (REST.farFoot.angle ?? 0) + 10)),
    face: 'effort',
  },
  at(LOW_NEAR.x - 0.9, LOW_NEAR.y + 0.6),
  at(LOW_FAR.x - 1.0, LOW_FAR.y - 0.3),
);

const LOW_HOLD = shell(
  {
    ...REST,
    hip: at(REST.hip.x - 0.5, REST.hip.y - 0.4),
    torso: REST.torso - 1,
    head: upright(REST.torso - 1, REST.head + 2),
    shrug: (REST.shrug ?? 0) + 0.8,
    twist: -0.1,
    face: 'focus',
  },
  LOW_NEAR,
  LOW_FAR,
);

const LOW_RECOIL = shell(
  {
    ...blend(LOW_IMPACT, LOW_HOLD, 0.62),
    torso: LOW_HOLD.torso - 2,
    head: upright(LOW_HOLD.torso - 2, LOW_HOLD.head + 2),
    nearFoot: onHeel(REST.nearFoot, 2),
    farFoot: onToes(REST.farFoot, (REST.farFoot.angle ?? 0) + 5),
    face: 'effort',
    effects: [scuff(14.5, 2.2, 0.55), scuff(-15, 1.6, 0.5)],
  },
  at(LOW_NEAR.x - 0.5, LOW_NEAR.y + 0.3),
  at(LOW_FAR.x - 0.5, LOW_FAR.y - 0.2),
);

export const POSES: readonly Pose[] = [IMPACT, RECOIL, HOLD, LOW_IMPACT, LOW_RECOIL, LOW_HOLD];
