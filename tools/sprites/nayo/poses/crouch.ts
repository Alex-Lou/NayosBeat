import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * crouch: 7 frames. 0-2 drop from GUARD into the crouch (2 ticks each): the hips fall back
 * and down first, the chest folds after them, the hands arrive last; he sinks a hair past the
 * crouch and settles. 3-6 loop (8 ticks each): breathing in the crouch, the chest lifting, the
 * shoulders a beat later, the hands last.
 *
 * The crouch is the guard's Philly shell, sitting low on the rear leg: lead shoulder rolled up
 * to the chin, lead forearm across the thigh, rear fist at the jaw, eyes over the shoulder.
 * The crouching block raises both forearms from there. Compact enough to stay inside the
 * crouching pushbox (no clinch at point blank) and about as tall as the crouching hurtbox.
 * The lead foot never moves; the rear heel peels up around its toes.
 */

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A foot pivoting on its toes: the heel rises by `angle` (negative) around a fixed toe. */
function onToes(flatX: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return { ...planted(flatX, angle), x: flatX + 7 - 2.3 * Math.sin(a) - 7 * Math.cos(a) };
}

const REAR_HEEL = -30;

/** The crouching shell at rest, but for the hands (placed around the head, see guarded). */
const SEAT: Pose = {
  hip: at(-10, 15),
  torso: 22,
  head: -4,
  shrug: 4.2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot.x, REAR_HEEL),
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
};

/** Hands relative to the head: lead fist low over the knee, rear fist at the jaw. */
const LEAD = at(7, -20);
const REAR = at(8.5, -3.5);

/** Puts the hands around the head of `pose`, nudged by `lead` and `rear` (world px). */
function guarded(pose: Pose, lead = at(0, 0), rear = at(0, 0)): Pose {
  const { head } = solve(pose);
  return {
    ...pose,
    nearFist: at(head.x + LEAD.x + lead.x, head.y + LEAD.y + lead.y),
    farFist: at(head.x + REAR.x + rear.x, head.y + REAR.y + rear.y),
  };
}

/** Where the hands sit around the head in GUARD, as nudges from the crouch's. */
const GUARD_HEAD = solve(GUARD).head;
const FROM_GUARD = {
  lead: at(GUARD.nearFist.x - GUARD_HEAD.x - LEAD.x, GUARD.nearFist.y - GUARD_HEAD.y - LEAD.y),
  rear: at(GUARD.farFist.x - GUARD_HEAD.x - REAR.x, GUARD.farFist.y - GUARD_HEAD.y - REAR.y),
};

/** How far each part has gone from GUARD to the crouch, 0 to 1 (overlapping action). */
interface Progress {
  readonly hipX: number;
  readonly hipY: number;
  readonly torso: number;
  readonly head: number;
  readonly lead: number;
  readonly rear: number;
  readonly heel: number;
}

function between(p: Progress): Pose {
  return guarded(
    {
      ...SEAT,
      hip: at(mix(GUARD.hip.x, SEAT.hip.x, p.hipX), mix(GUARD.hip.y, SEAT.hip.y, p.hipY)),
      torso: mix(GUARD.torso, SEAT.torso, p.torso),
      head: mix(GUARD.head, SEAT.head, p.head),
      shrug: mix(GUARD.shrug ?? 0, SEAT.shrug ?? 0, p.torso),
      farFoot: onToes(GUARD.farFoot.x, REAR_HEEL * p.heel),
    },
    at(FROM_GUARD.lead.x * (1 - p.lead), FROM_GUARD.lead.y * (1 - p.lead)),
    at(FROM_GUARD.rear.x * (1 - p.rear), FROM_GUARD.rear.y * (1 - p.rear)),
  );
}

/**
 * The drop: hips back and down (back first, so the lead knee stays home), chest tipping in,
 * eyes level, the rear heel peeling up; the hands ride along, the rear fist glued to the jaw.
 */
const DROP = between({
  hipX: 0.92,
  hipY: 0.7,
  torso: 0.85,
  head: 0.8,
  lead: 0.5,
  rear: 0.7,
  heel: 0.8,
});

/** Sinks past the crouch: hips low, chest folded, chin tucked; the hands still trail. */
const LOW = guarded(
  {
    ...SEAT,
    hip: at(SEAT.hip.x - 0.3, SEAT.hip.y - 1.4),
    torso: SEAT.torso + 3,
    head: SEAT.head + 3,
  },
  at(-1, -1.4),
  at(-0.9, -1.2),
);

/** Settles back up, the hands overshooting a touch. */
const SETTLE = guarded(
  {
    ...SEAT,
    hip: at(SEAT.hip.x - 0.1, SEAT.hip.y - 0.4),
    torso: SEAT.torso + 1,
    head: SEAT.head + 1,
  },
  at(0, 0.4),
  at(0, 0.3),
);

/**
 * Breathing in the crouch, each channel from 0 (rest) to 1: `chest` lifts the hips and
 * straightens the back, `shoulders` roll the lead shoulder up and the chin with it, `hands`
 * let the fists ride up after them.
 */
function breathe(chest: number, shoulders: number, hands: number): Pose {
  return guarded(
    {
      ...SEAT,
      hip: at(SEAT.hip.x, SEAT.hip.y + 0.7 * chest),
      torso: SEAT.torso - 1.5 * chest,
      head: SEAT.head + 1.5 * shoulders,
      shrug: (SEAT.shrug ?? 0) + 0.5 * shoulders,
    },
    at(-0.2 * hands, 0.4 * hands - 0.7 * chest),
    at(-0.2 * hands, 0.3 * hands - 0.6 * chest),
  );
}

export const POSES: readonly Pose[] = [
  DROP,
  LOW,
  SETTLE,
  breathe(0, 0.15, 0.25),
  breathe(0.55, 0.35, 0.1),
  breathe(1, 0.85, 0.45),
  breathe(0.45, 0.8, 0.9),
];
