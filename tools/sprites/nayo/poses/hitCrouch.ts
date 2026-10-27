import { solve } from '../../skeleton.ts';
import { at, CROUCH, type Pose } from './common.ts';
import { POSES as CROUCH_STRIP } from './crouch.ts';
import { onHeel, onToes, skid } from './hitHigh.ts';

/**
 * hitCrouch: 3 frames, 3, 4 ticks, then held while the hitstun lasts (docs/combat-v2.md §9.4:
 * standing, the hit strips by height take over).
 *
 * The blow rocks him in his crouch: frame 0, held through the hitstop, carries the whole
 * reaction (the hips thrown back onto the rear knee, the chest snapped upright, the head whipped
 * back, the arms flung apart). Then the knees soak it while the feet skid (the pushback slides
 * him), the gloves climb back, and he holds a shaken crouch, hurt at a glance, one small step
 * from the crouch he recovers into. Every beat moves away from the opponent, never into him.
 */

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

/** hitCrouch: the snap, the rebound, the held shaken crouch. */
export const POSES: readonly Pose[] = [LOW_SNAP, LOW_REBOUND, LOW_SHAKEN];
