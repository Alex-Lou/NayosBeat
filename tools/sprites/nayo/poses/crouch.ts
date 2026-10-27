import type { Point } from '../../raster.ts';
import { solve, type Foot } from '../../skeleton.ts';
import { at, GUARD, planted, type Pose } from './common.ts';

/**
 * crouch: 7 frames. 0-2 drop from GUARD into the crouch (2 ticks each): the hips fall back
 * and down first, the chest folds after them, the gloves ride the head a beat late; the rear
 * foot is drawn in under the hips, he sinks a hair past the crouch and settles. 3-6 loop (8
 * ticks each): breathing in the crouch, the hips rising and sinking a pixel at a time (a soft
 * sine), the lead shoulder rolling up a beat later, the lead glove last.
 *
 * The crouch is the guard sunk on its haunches: the same high guard (far glove up by the cheek,
 * near glove under the chin, elbows tucked down onto the knees), the torso leaning in, eyes over
 * the gloves. Compact enough to stay inside the crouching pushbox (no clinch at point blank)
 * and about as tall as the crouching hurtbox. The lead foot never moves; the rear foot is drawn
 * in under the hips from the guard's wide stance, on its toes.
 *
 * Pixel-locked loop: the torso and the head never turn and the hips move by whole sprite
 * pixels (0.5 world px), the arms ride rigidly with the shoulders (a glove only swings about
 * its elbow), so the sleeve's emblem, the headphone ring and the face are the same pixels in
 * every frame, only shifted: nothing boils.
 */

/** A foot pivoting on its toes: the heel rises by `angle` (negative) around a fixed toe. */
function onToes(flatX: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return { ...planted(flatX, angle), x: flatX + 7 - 2.3 * Math.sin(a) - 7 * Math.cos(a) };
}

const REAR_HEEL = -30;
/** Where the rear foot sits in the crouch: drawn in under the hips from the guard's wide stance. */
const REAR_X = -13.5;

/** One sprite pixel, in world pixels: the step of every move of the loop. */
const PIXEL = 0.5;

/** The gloves around the head, as in GUARD: near glove under the chin, far glove by the cheek. */
const GUARD_HEAD = solve(GUARD).head;
const LEAD = at(GUARD.nearFist.x - GUARD_HEAD.x, GUARD.nearFist.y - GUARD_HEAD.y);
const REAR = at(GUARD.farFist.x - GUARD_HEAD.x, GUARD.farFist.y - GUARD_HEAD.y);

/** Puts the gloves around the head of `pose` as in the guard, nudged by `lead` and `rear`. */
function guarded(pose: Pose, lead = at(0, 0), rear = at(0, 0)): Pose {
  const { head } = solve(pose);
  return {
    ...pose,
    nearFist: at(head.x + LEAD.x + lead.x, head.y + LEAD.y + lead.y),
    farFist: at(head.x + REAR.x + rear.x, head.y + REAR.y + rear.y),
  };
}

/** The crouching guard at rest (first frame of the loop): where the low moves start and land. */
const REST: Pose = guarded({
  hip: at(-10, 15),
  torso: 22,
  head: -4,
  shrug: 2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(REAR_X, REAR_HEEL),
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
  bends: { ...GUARD.bends },
});

// ---------------------------------------------------------------------------------------------
// The drop

/**
 * The drop, nearly all the way at once (a crouch must answer the stick): hips back and down,
 * back first so the lead knee stays over the toes, the chest tipping in, eyes level; the gloves
 * lag a hair above their place. Both feet on the floor: the rear foot snaps in under the hips
 * with the fall, onto its crouch spot. The clip also restarts here when he settles back into
 * the crouch after a low attack, a block or a hit, so this frame is a near-crouch: from the
 * guard it is most of the fall, from the crouch only a breath up, the feet never shuffling.
 */
const DROP: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x + 0.1, REST.hip.y + 1.5),
    torso: 20.5,
    head: -2,
    shrug: 1.6,
  },
  at(-1.4, 0.8),
  at(-0.2, 0.6),
);

/** Sinks past the crouch: hips low, chest folded, the rear heel rising; the gloves catch up. */
const LOW: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 0.3, REST.hip.y - 1),
    torso: REST.torso + 2,
    head: REST.head - 1.5,
    shrug: (REST.shrug ?? 0) + 0.5,
    farFoot: onToes(REAR_X, REAR_HEEL - 4),
  },
  at(1, -0.6),
  at(0.1, -0.5),
);

/** Settles back up, the gloves overshooting a touch. */
const SETTLE: Pose = guarded(
  {
    ...REST,
    hip: at(REST.hip.x - 0.1, REST.hip.y - 0.5),
    torso: REST.torso + 0.5,
    head: REST.head - 0.5,
  },
  at(-0.6, 0.5),
  at(0, 0.3),
);

// ---------------------------------------------------------------------------------------------
// The breathing loop, pixel-locked

const REST_BONES = solve(REST);

/** Turns `v` by `degrees` (counterclockwise, y up). */
function turn(v: Point, degrees: number): Point {
  const a = (degrees * Math.PI) / 180;
  return at(v.x * Math.cos(a) - v.y * Math.sin(a), v.x * Math.sin(a) + v.y * Math.cos(a));
}

/**
 * A glove carried rigidly by its elbow (moved by `shift`), the forearm swung `swing` degrees
 * about the elbow (+ = the glove rises): the upper arm and its emblem keep their pixels.
 */
function carried(side: 'near' | 'far', shift: Point, swing: number): Point {
  const { elbow, wrist } = REST_BONES[side];
  const forearm = turn(at(wrist.x - elbow.x, wrist.y - elbow.y), swing);
  return at(elbow.x + shift.x + forearm.x, elbow.y + shift.y + forearm.y);
}

/** Shrug that rolls the lead shoulder up and forward by one sprite pixel (along the torso). */
const ROLL =
  PIXEL / (Math.cos((REST.torso * Math.PI) / 180) - 0.45 * Math.sin((REST.torso * Math.PI) / 180));
const roll = (amount: number): Point => {
  const up = REST_BONES.up;
  const front = REST_BONES.front;
  const k = ROLL * amount;
  return at(up.x * k + front.x * k * 0.45, up.y * k + front.y * k * 0.45);
};

/**
 * One frame of the breathing: hips `lift` sprite pixels up, the lead shoulder rolled `rolled`
 * pixels, each forearm swung about its elbow (degrees, + = the glove rises).
 */
function breath(lift: number, rolled: number, leadSwing: number, rearSwing: number): Pose {
  const hip = at(0, lift * PIXEL);
  const shoulder = roll(rolled);
  return {
    ...REST,
    hip: at(REST.hip.x + hip.x, REST.hip.y + hip.y),
    shrug: (REST.shrug ?? 0) + ROLL * rolled,
    nearFist: carried('near', at(hip.x + shoulder.x, hip.y + shoulder.y), leadSwing),
    farFist: carried('far', hip, rearSwing),
  };
}

export const POSES: readonly Pose[] = [
  DROP,
  LOW,
  SETTLE,
  // Exhaled, settled.
  REST,
  // The breath lifts the hips a pixel, the lead glove left behind.
  breath(1, 0, -5, -2),
  // Top of the breath, a pixel more: the lead shoulder rolls up on it, the glove riding after.
  breath(2, 1, 1, 0),
  // Breathing out: the hips sink back a pixel, the shoulder and the glove still up.
  breath(1, 1, 4, 2),
];
