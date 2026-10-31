import type { Point } from '../../raster.ts';
import { solve, type Bend, type Bends } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, toeOf, type Effect, type Foot, type Pose } from './common.ts';
import { atChin } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * knockdown (docs/combat-v2.md §3.8, §11.1): 6 frames, 3, 3, 4, 6, 6, 8 ticks (30), the first
 * three quarters of the 40-tick knockdown; getup plays the last 10. The falls (trip, airHit, the
 * thrown flight) end in BRACED, falling back seat first, and land here.
 *
 * Weight first, then the attitude, then « la prédatrice » getting up. Not a kip-up (Nayo's), not
 * a legs-up freeze on the shoulders (her victory), not legs wheeling on her back (her Windmill):
 * she rocks back into a ball and rolls up onto her feet into a low prowl, on the guard's
 * footprint, the eyes on the opponent.
 *
 * - 0 (3): the seat hits. The hips slam onto the floor (a puff under them) while the upper body
 *   is still on its way down, the chin tucked like a trained fighter's (hurt); the legs fly on
 *   up from the momentum, the rear palm slapping down on the floor by her hip, the lead arm
 *   still up from the fall.
 * - 1 (3): the back slams flat a frame later (overlap: the hips land, then the spine, then the
 *   head, which whips back onto the floor), the legs whipped up high over the hips, the rear arm
 *   flat on the floor at her side, the lead one flopping down across her; a second puff under
 *   the shoulders.
 * - 2 (4): the rebound: the whole body pops off the floor, the arms left lying on it, the head
 *   lifting.
 * - 3 (6): the attitude, in the body: propped up on the rear elbow (the upper arm straight down
 *   under the shoulder to the floor, the forearm along it), the boots planted, the knees up, she
 *   holds the lead palm up at the opponent (« come on ») and looks at him from under a heavy lid
 *   (`cool`). The torso and the head add up to 22 degrees on screen: the face just turned
 *   (RotSprite, on the floor), the jaw line showing. No grin.
 * - 4 (6): she rocks back onto her shoulders, balled up, the knees to the chest, the arms along
 *   her sides, the hands hooked under the shins, the head tucked aside (RotSprite, on the floor).
 * - 5 (8): and rolls up out of it onto her feet, into a low three-point prowl held for a beat,
 *   her crouch gone lower: the rear foot on its ball on the guard's mark, the heel high, the
 *   rear knee driven forward and low under her, floating over the floor; the lead foot flat on
 *   the guard's mark, the knee up over it; the lead palm flat on the floor in front of the boot,
 *   the arm braced; the rear arm as in the guard, the elbow down on the ribs and the fist
 *   tucked under the chin, the face clear (atChin, crouch.ts); the torso pitched 55 degrees
 *   forward and the head lifted against it (16 degrees on screen): the source face, glaring at
 *   the opponent (`focus`). Pitched any further, the chest would close on the lead thigh past
 *   what a hip folds (tools/sprites/anatomy.ts); the lead shoulder reaches down after the palm
 *   instead. A puff where the palm and the lead boot landed. getup drives off that palm.
 *
 * Both knees bend toward the toes in the prowl, as in her crouch (crouch.ts): turned out behind
 * her, the rear knee read on screen as a knee bent backward. Both feet already stand on the
 * guard's marks, so the getup only rises out of it. The rock and the prowl give the strip its
 * turn (torso -115 degrees, then 60 forward): seen at speed, she rolls back and comes up facing
 * him.
 *
 * The joints stay where a body can put them (tools/sprites/anatomy.ts): falling back, the rear
 * arm reaches down for the floor beside her, never back over her head (a shoulder opens about
 * 60 degrees behind the chest); flying or lying, the boots keep about the angle of a relaxed
 * foot to the shin, never pointed on in the line of the leg.
 *
 * Lying poses stretch backward (the head toward negative x), so the boots stay off the
 * opponent; the head turns past 20 degrees on screen (RotSprite) only on the floor and in the
 * falls into it.
 *
 * The chin tucked on a torso tipped far back (BRACED, SEAT, LOOK) never keeps the face upright
 * (the source drawing, under 20 degrees on screen): the neck and the top of the chest then come
 * up level with the mouth, in front of it, and read as a beak of skin or something held in the
 * lips. Those heads tip back to 22-24 degrees on screen instead (the chin still tucked against
 * the torso, 30 to 36 degrees): turned, the jaw line shows and the throat runs under it down to
 * the choker.
 *
 * Her near arm (drawn over the body and the head) stays clear of the face. The far arm is drawn
 * behind the body and the head: it is never left to peek out at the hair line (a few pixels of
 * skin by the skull read as a growth). In the falls it is thrown up and forward, clear of the
 * head; on the floor it flops down across her.
 *
 * The belt's chain hangs on a spring 6 px below the belt (look.ts): flat on her back, it would
 * hang through the floor with the spring at rest. The fall goes seat first, then the back, so the
 * neck drops from high up into the lying frames and the chain's tip still lags above the belt
 * there (its loop rides up): nothing is drawn below the floor line (the tests check it).
 */

/** Dust off the floor at `x`. */
export function dust(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** A limb written by the directions of its two segments, in world degrees (0: forward, 90: up). */
export interface Chain {
  readonly upper: number;
  readonly lower: number;
}

/** A leg chain and the direction of its toes, in world degrees. */
export interface LegChain extends Chain {
  readonly toes: number;
}

type Ends = 'nearFist' | 'farFist' | 'nearFoot' | 'farFoot';

/** A pose whose limbs may be written as chains instead of hand and foot targets. */
export interface Figure extends Omit<Pose, Ends>, Partial<Pick<Pose, Ends>> {
  readonly nearArm?: Chain;
  readonly farArm?: Chain;
  readonly nearLeg?: LegChain;
  readonly farLeg?: LegChain;
}

const direction = (degrees: number): Point => {
  const a = (degrees * Math.PI) / 180;
  return at(Math.cos(a), Math.sin(a));
};

/**
 * The end of a two-segment chain from `root`, and the bend that picks its joint among the IK's
 * two solutions (the other one is the joint mirrored across the line from the root to the end).
 */
function place(root: Point, chain: Chain, first: number, second: number) {
  const u = direction(chain.upper);
  const v = direction(chain.lower);
  const joint = at(root.x + u.x * first, root.y + u.y * first);
  const end = at(joint.x + v.x * second, joint.y + v.y * second);
  const length = Math.hypot(end.x - root.x, end.y - root.y) || 1;
  const n = { x: (end.x - root.x) / length, y: (end.y - root.y) / length };
  const along = (joint.x - root.x) * n.x + (joint.y - root.y) * n.y;
  // From the mirrored joint to this one: twice the joint's offset off the line.
  const dx = 2 * (joint.x - root.x - n.x * along);
  const dy = 2 * (joint.y - root.y - n.y * along);
  const bend: Bend =
    Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'front' : 'back') : dy >= 0 ? 'up' : 'down';
  return { end, bend };
}

/**
 * A body tumbling or lying, authored by its silhouette (forward kinematics): each chain becomes
 * the hand or foot target and the bend that make the skeleton rebuild exactly the joint written.
 * Limbs given as targets keep them, and their bends.
 */
export function figure(body: Figure): Pose {
  const { nearArm, farArm, nearLeg, farLeg, ...rest } = body;
  const { hip } = rest;
  // The shoulders and the hip joints do not depend on the hands and feet.
  const joints = solve(
    { nearFist: hip, farFist: hip, nearFoot: hip, farFoot: hip, ...rest },
    RIFF_BODY,
  );
  const { upperArm, forearm, thigh, shin } = RIFF_BODY;
  const bends: { -readonly [K in keyof Bends]: Bend } = { ...rest.bends };
  let nearFist = body.nearFist ?? hip;
  let farFist = body.farFist ?? hip;
  let nearFoot: Foot = body.nearFoot ?? hip;
  let farFoot: Foot = body.farFoot ?? hip;
  if (nearArm) {
    const p = place(joints.near.shoulder, nearArm, upperArm, forearm);
    nearFist = p.end;
    bends.nearElbow = p.bend;
  }
  if (farArm) {
    const p = place(joints.far.shoulder, farArm, upperArm, forearm);
    farFist = p.end;
    bends.farElbow = p.bend;
  }
  if (nearLeg) {
    const p = place(joints.near.hip, nearLeg, thigh, shin);
    nearFoot = { ...p.end, angle: nearLeg.toes };
    bends.nearKnee = p.bend;
  }
  if (farLeg) {
    const p = place(joints.far.hip, farLeg, thigh, shin);
    farFoot = { ...p.end, angle: farLeg.toes };
    bends.farKnee = p.bend;
  }
  return { ...rest, nearFist, farFist, nearFoot, farFoot, bends };
}

const OPEN = { nearHand: 'open', farHand: 'open' } as const;

/** The ball of the guard's rear foot: she comes up out of the roll with it on that mark. */
const REAR_TOE = toeOf(GUARD.nearFoot);

/**
 * Falling back the last pixels before the floor, seat first: the legs up in front, the rear arm
 * reaching straight down for the floor by her hip, the lead one thrown up and forward for
 * balance, clear of the head; the chin tucked for the landing (hurt), the face turned 24 degrees
 * on screen so the throat shows under the jaw. The falls (trip, airHit) end here and the
 * knockdown lands from it; airHit holds it through a long fall.
 */
export const BRACED: Pose = figure({
  hip: at(-9.5, 10),
  torso: -54,
  head: 30,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: -80, lower: -25 },
  farArm: { upper: 60, lower: 85 },
  nearLeg: { upper: 56, lower: 26, toes: 91 },
  farLeg: { upper: 60, lower: 28, toes: 93 },
  ...OPEN,
  face: 'hurt',
});

/** 0: the seat hits, the upper body still falling, the legs flying on up. */
const SEAT: Pose = figure({
  hip: at(-10, 6.5),
  torso: -60,
  head: 36,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: -55, lower: 3 },
  farArm: { upper: 48, lower: 72 },
  nearLeg: { upper: 66, lower: 30, toes: 95 },
  farLeg: { upper: 64, lower: 26, toes: 91 },
  ...OPEN,
  face: 'hurt',
  effects: [dust(-11, 5, 0.05)],
});

/** 1: the back slams flat, the head whipped back onto the floor, the rear arm slapping it. */
const SLAM: Pose = figure({
  hip: at(-9.5, 5.5),
  torso: -84,
  head: -6,
  shrug: 0,
  twist: 0.35,
  nearArm: { upper: 4, lower: 10 },
  farArm: { upper: 20, lower: 22 },
  nearLeg: { upper: 88, lower: 40, toes: 105 },
  farLeg: { upper: 76, lower: 26, toes: 91 },
  ...OPEN,
  face: 'hurt',
  effects: [dust(-34, 5, 0.05), dust(-11, 5, 0.4)],
});

/** 2: the rebound, off the floor, the arms left on it. */
const REBOUND: Pose = figure({
  hip: at(-10, 9),
  torso: -78,
  head: 20,
  shrug: 0,
  twist: 0.4,
  nearArm: { upper: -18, lower: 0 },
  farArm: { upper: -4, lower: 12 },
  nearLeg: { upper: 70, lower: 10, toes: 75 },
  farLeg: { upper: 55, lower: -5, toes: 60 },
  ...OPEN,
  face: 'hurt',
  effects: [dust(-34, 5, 0.45), dust(-11, 5, 0.75)],
});

/** 3: propped up on the rear elbow, the lead palm up at the opponent: come on. */
const LOOK: Pose = figure({
  hip: at(-9.5, 8),
  torso: -52,
  head: 30,
  shrug: 0,
  twist: 0.35,
  nearFoot: { x: 4, y: 6.5, angle: 0 },
  farFoot: { x: 12, y: 5.6, angle: 20 },
  bends: { nearKnee: 'up', farKnee: 'up' },
  nearArm: { upper: -92, lower: 2 },
  farArm: { upper: 10, lower: 40 },
  ...OPEN,
  face: 'cool',
  effects: [dust(-34, 5, 0.85), dust(13, 3.5, 0.2)],
});

/** 4: rocked back onto her shoulders, balled up, the hands hooked under the shins. */
const ROCK: Pose = figure({
  hip: at(-14, 21.5),
  torso: -115,
  head: 45,
  shrug: 0,
  twist: 0.3,
  nearArm: { upper: 30, lower: 100 },
  farArm: { upper: 40, lower: 110 },
  nearLeg: { upper: 165, lower: 30, toes: 95 },
  farLeg: { upper: 155, lower: 20, toes: 85 },
  ...OPEN,
  face: 'effort',
});

/** 5, held: rolled up onto her feet into a low prowl, the lead palm on the floor, the glare. */
const PROWL: Pose = atChin({
  hip: at(-12.5, 17.5),
  torso: 55,
  head: -39,
  shrug: 1.5,
  reach: { far: 2.6 },
  twist: 0.4,
  nearFoot: onBall(REAR_TOE, -70),
  farFoot: GUARD.farFoot,
  nearFist: at(0, 0),
  farFist: at(16.2, 2.6),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  farHand: 'open',
  face: 'focus',
  effects: [dust(17, 3.5, 0.1), dust(9, 3.5, 0.15)],
});

export const POSES: readonly Pose[] = [SEAT, SLAM, REBOUND, LOOK, ROCK, PROWL];
