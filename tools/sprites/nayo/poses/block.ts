import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, planted, type Effect, type Foot, type Pose } from './common.ts';

/**
 * block: 6 frames. Standing 0-2 (2, 3 ticks, then held), crouching 3-5 (same). The Philly
 * shell's shoulder roll: the lead shoulder rides up to the chin, the lead forearm rises across
 * the ribs, the rear glove covers the cheek, the chin tucks behind the shoulder. One curve from
 * the rear heel to the gloves.
 *
 * Frame 0 is held through the whole hitstop, so it carries the extreme: the blow rolls the
 * chest away, rocks him onto his heels and sinks the knees. Frame 1 rebounds halfway (the
 * feet scuff the floor), frame 2 settles into the held shell. Everything stays inside the
 * pushbox: at point blank the fighters touch, they never look locked in a clinch.
 */

/**
 * The gloves ride with the body: the lead wrist placed from the lead shoulder (the forearm
 * across the ribs, the elbow tucked), the rear wrist from the head's center (glove at the cheek).
 */
function shell(pose: Omit<Pose, 'nearFist' | 'farFist'>, lead: Point, rear: Point): Pose {
  const sketch: Pose = { ...pose, nearFist: at(0, 0), farFist: at(0, 0) };
  const { head, near } = solve(sketch);
  return {
    ...pose,
    nearFist: at(near.shoulder.x + lead.x, near.shoulder.y + lead.y),
    farFist: at(head.x + rear.x, head.y + rear.y),
  };
}

/** Dust where the feet scrape back: an already spreading puff. */
function scuff(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** A foot on its toes, heel raised by `angle` (negative) around the toe of a flat foot at `x`. */
function onToes(x: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return { ...planted(x, angle), x: x + 7 - 2.3 * Math.sin(a) - 7 * Math.cos(a) };
}

/** Lead forearm across the ribs (from the lead shoulder); rear glove at the cheek (from the head). */
const LEAD = at(8.8, -10.8);
const REAR = at(9.4, -4.2);
/** Crouching, the lead forearm rides a little closer (the crouching pushbox is narrower). */
const LOW_LEAD = at(8, -11.5);

// Standing ----------------------------------------------------------------------------------

const REAR_FOOT = planted(-13.5);

/** Contact, held through the hitstop: chest rolled away, rocked onto the heels, knees giving. */
const IMPACT = shell(
  {
    hip: at(-6.8, 34.2),
    torso: -5,
    head: 15,
    shrug: 6.2,
    twist: -0.6,
    nearFoot: planted(5.6, 9),
    farFoot: REAR_FOOT,
    face: 'effort',
  },
  at(LEAD.x - 1.2, LEAD.y + 1.4),
  at(REAR.x - 1.4, REAR.y + 0.2),
);

/** Halfway back: the chest comes round, the toes drop, the feet scuff the floor. */
const RECOIL = shell(
  {
    hip: at(-6, 35),
    torso: -2,
    head: 13,
    shrug: 5.8,
    twist: -0.45,
    nearFoot: planted(5.6, 4),
    farFoot: REAR_FOOT,
    face: 'effort',
    effects: [scuff(12.5, 2.2, 0.58), scuff(-16, 1.6, 0.5)],
  },
  at(LEAD.x - 0.6, LEAD.y + 0.6),
  at(REAR.x - 0.6, REAR.y + 0.1),
);

/** Settled in the shell, held while the blockstun lasts. */
const HOLD = shell(
  {
    hip: at(-4.8, 35.4),
    torso: 1.5,
    head: 10,
    shrug: 5.4,
    twist: -0.3,
    nearFoot: planted(5.6),
    farFoot: REAR_FOOT,
    face: 'focus',
  },
  LEAD,
  REAR,
);

// Crouching: the crouch's low shell (same feet, the rear heel up), the same shoulder roll.

const LOW = { nearFoot: planted(5.6), farFoot: onToes(-13.5, -30) } as const;

const LOW_IMPACT = shell(
  {
    ...LOW,
    hip: at(-12.2, 14.4),
    torso: 14,
    head: 12,
    shrug: 6,
    twist: -0.6,
    nearFoot: planted(5.6, 7),
    face: 'effort',
  },
  at(LOW_LEAD.x - 1.2, LOW_LEAD.y + 1.4),
  at(REAR.x - 1.4, REAR.y + 0.2),
);

const LOW_RECOIL = shell(
  {
    ...LOW,
    hip: at(-11.6, 14.7),
    torso: 18,
    head: 9,
    shrug: 5.6,
    twist: -0.45,
    nearFoot: planted(5.6, 3),
    face: 'effort',
    effects: [scuff(12.5, 2.2, 0.58), scuff(-15, 1.6, 0.5)],
  },
  at(LOW_LEAD.x - 0.6, LOW_LEAD.y + 0.6),
  at(REAR.x - 0.6, REAR.y + 0.1),
);

const LOW_HOLD = shell(
  {
    ...LOW,
    hip: at(-10.6, 15),
    torso: 21,
    head: 6,
    shrug: 5.2,
    twist: -0.3,
    face: 'focus',
  },
  LOW_LEAD,
  REAR,
);

export const POSES: readonly Pose[] = [IMPACT, RECOIL, HOLD, LOW_IMPACT, LOW_RECOIL, LOW_HOLD];
