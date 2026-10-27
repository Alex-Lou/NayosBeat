import { solve } from '../../skeleton.ts';
import { at, CROUCH, GUARD, planted, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';

/**
 * hit: 7 frames. Standing 0-3 (3, 4, 4 ticks, then held while the hitstun lasts), crouching 4-6
 * (3, 4, then held).
 *
 * The blow snaps him out of the high guard: frame 0, held through the hitstop, carries the
 * whole reaction (the head whipped back, the chest thrown open, the guard blown apart, hands
 * open, the lead toes popping up as the weight slams onto the rear heel). Then a decaying
 * settle: the knees soak the blow while the head comes back and the feet skid (the pushback
 * slides him), the gloves climb back, and he holds a shaken guard: hunched, the gloves low,
 * eyes squeezed shut, the jaw clenched. That held frame reads as hurt at a glance and sits one
 * small step from the guard (or the crouch) it recovers into. Every beat moves away from the
 * opponent, never into him.
 */

/** Dust kicked up by the feet sliding back under the blow. */
function skid(x: number, size: number, progress: number): Effect {
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

// Standing ----------------------------------------------------------------------------------

/**
 * Held through the hitstop: the head whipped back, the guard blown open, the rear arm flung out
 * long behind him (the open hand at shoulder height, well clear of the hair).
 */
const SNAP: Pose = {
  hip: at(-5.3, 36.4),
  torso: -11,
  head: -15,
  shrug: 0,
  twist: 0.4,
  nearFoot: onHeel(GUARD.nearFoot, 12),
  farFoot: onToes(GUARD.farFoot, -2),
  nearFist: at(4.6, 43.6),
  farFist: at(-27, 59),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/**
 * The knees soak it up and the chest comes back, the head still lagging behind it; the arms
 * hang loose (the rear one behind the hip, on its way back up), the feet skid back under the
 * pushback.
 */
const REBOUND: Pose = {
  hip: at(-8.6, 33.3),
  torso: 6,
  head: -11,
  shrug: 1,
  twist: 0.2,
  nearFoot: onHeel(GUARD.nearFoot, 2),
  farFoot: onToes(GUARD.farFoot, -6),
  nearFist: at(2, 36.5),
  farFist: at(-15.5, 40.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(14.5, 2.6, 0.5), skid(-17, 1.8, 0.45)],
};

/** Gathering himself: the lean comes back, the head catches up, the gloves climb. */
const RECOVER: Pose = {
  hip: at(-7.8, 34.4),
  torso: 13,
  head: 4,
  shrug: 2.2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -11),
  nearFist: at(6.8, 50.5),
  farFist: at(7.6, 59.6),
  face: 'hurt',
  effects: [skid(15, 2.4, 0.85)],
};

/**
 * The shaken guard, held while the hitstun lasts: hunched over the blow, the shoulders up, the
 * gloves short of their place, eyes squeezed shut and the jaw clenched. Hurt at a glance, one
 * small step from the guard he recovers into.
 */
const SHAKEN: Pose = {
  hip: at(-7.0, 35.5),
  torso: 16.5,
  head: 1.5,
  shrug: 3.3,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -14),
  nearFist: at(7.8, 52.4),
  farFist: at(9.4, 60.8),
  face: 'hurt',
};

// Crouching: same beats, low, out of the crouch ---------------------------------------------

/** The crouch at rest (first frame of its loop): where the crouching hit starts and lands. */
const REST: Pose = CROUCH_STRIP[3] ?? CROUCH;
const REST_HEAD = solve(REST).head;

/** A head tilt that keeps the head under 20 degrees on a torso leaning `torso` (drawn upright). */
const upright = (torso: number, head: number): number => Math.min(head, 19 - torso);

/** The crouch's gloves carried around the head of `pose`, nudged by `near` and `far`. */
function guarded(pose: Pose, near = at(0, 0), far = at(0, 0)): Pose {
  const { head } = solve(pose);
  const carry = (fist: { x: number; y: number }, nudge: { x: number; y: number }) =>
    at(head.x + fist.x - REST_HEAD.x + nudge.x, head.y + fist.y - REST_HEAD.y + nudge.y);
  return { ...pose, nearFist: carry(REST.nearFist, near), farFist: carry(REST.farFist, far) };
}

/**
 * Held through the hitstop: the rock is in the hips (thrown back onto the rear knee), the chest
 * snapped upright and the head whipped back over it, the arms flung apart, hands open: the lead
 * one up off the knee, the rear one trailing out behind.
 */
const LOW_SNAP: Pose = {
  ...REST,
  hip: at(REST.hip.x - 2.8, REST.hip.y - 0.6),
  torso: REST.torso - 21,
  head: -19,
  shrug: 0,
  twist: 0.4,
  nearFoot: onHeel(REST.nearFoot, 10),
  farFoot: onToes(REST.farFoot, Math.min(0, (REST.farFoot.angle ?? 0) + 12)),
  nearFist: at(8, 33),
  farFist: at(-34, 35),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

const LOW_REBOUND: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 2, REST.hip.y - 1.2),
    torso: REST.torso - 8,
    head: upright(REST.torso - 8, REST.head - 4),
    shrug: (REST.shrug ?? 0) - 1,
    twist: 0.15,
    nearFoot: onHeel(REST.nearFoot, 2),
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [skid(14.5, 2.6, 0.5), skid(-15, 1.8, 0.45)],
  },
  at(-3, -4.5),
  at(-7, -6),
);

const LOW_SHAKEN: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 0.6, REST.hip.y - 0.5),
    torso: REST.torso + 1.5,
    head: upright(REST.torso + 1.5, REST.head - 1),
    shrug: (REST.shrug ?? 0) + 0.8,
    face: 'hurt',
  },
  at(-0.8, -2),
  at(-0.8, -2.2),
);

/** hit: standing 0-3 (snap, rebound, recover, held), crouching 4-6 (snap, rebound, held). */
export const POSES: readonly Pose[] = [
  SNAP,
  REBOUND,
  RECOVER,
  SHAKEN,
  LOW_SNAP,
  LOW_REBOUND,
  LOW_SHAKEN,
];
