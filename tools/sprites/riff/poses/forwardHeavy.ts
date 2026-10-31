import type { Point } from '../../raster.ts';
import {
  solve,
  type Bend,
  type Bends,
  type Effect,
  type Face,
  type Foot,
  type Hand,
} from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * forwardHeavy (Talon): 8 frames, 4, 4, 4, 5, 3, 4, 5, 5 ticks (34), the heel lands on frame 4
 * (ticks 17-19), hitbox 8..34 / 34..70, an overhead; the game carries her 15 px over ticks 4-13.
 * The axe kick: the lead leg rises straight in a crescent to a standing split, hangs over her,
 * and the heel comes down like an axe as the whole body crunches over it; she slams it to the
 * floor and draws it back to its mark. Slow and readable on purpose (17 ticks of startup): the
 * leg up there is the warning.
 *
 * - 0: the load: the weight rocks back onto the rear foot, the lead heel lifts, the chest opens;
 *   the rear fist stays under the chin, a hair lower, carried back with the chest (the elbow
 *   down on the ribs): its swing back starts on the skip.
 * - 1: the skip: off the rear foot (the game carries her), the straight lead leg swings up off
 *   the floor, the foot flexed (the heel leads the whole kick), its trail rising; the rear arm
 *   swings back against it, hanging back off its shoulder, its elbow soft; the lead hand stays
 *   up in its guard, in front of the chest.
 * - 2: the rise: still in the air, the leg high and straight, the body leaning back, the arms
 *   out for balance.
 * - 3: the hang (5 ticks): a balanced standing split, the rear foot landed on its toes right
 *   under the hips, the lead leg vertical in front of her face (the knee soft, never locked
 *   back), the foot flexed, the look up.
 * - 4: the axe: the crunch on the hit: the hips drive in and drop, the lean 22 degrees, the chin
 *   tucked, the rear fist driving down by the hip, the lead one covering in its guard (the fist
 *   in front of the chest, the elbow low in front of the body, behind the leg); the
 *   heel leads, the foot flexed, its toes up, the leg lower (the boot about 51-57 px up at the
 *   front of the hitbox); the trail falls from over her head into the heel, a gold spark there.
 * - 5: the slam: the heel drives on through to the floor, the crunch deeper, the lead fist
 *   still covering the chest; dust and a flat ring.
 * - 6: the lead foot draws back to its mark, the body comes up past the guard: the hips 1.6 px
 *   below it, the lean 2.5 degrees short of it, the rear fist a touch high under the chin.
 * - 7: the guard, settled.
 *
 * Anatomy (tools/sprites/anatomy.ts): the kicking foot stays within 35 degrees of square to the
 * shin, flexed rather than pointed (a pointed combat boot along the leg read as a broken
 * ankle); a rear arm swung back keeps its shoulder under 60 degrees behind the chest, the
 * elbow bending the way elbows bend. The lead arm, behind the body, never goes back folded: its
 * fist driven down by the hip with the elbow square out of her back read as a broken arm, seen
 * three quarters (the owner turned it down); it covers in its guard instead.
 *
 * The kicking leg is placed by its angles from the hip (forward kinematics); the lead leg kicks
 * so the stance never switches (she lands on her own guard). The rear foot is in the air from
 * the skip to the hang (a true skip, nothing slides while the game carries her) and lands where
 * the 15 px leave it, its guard spot. Under 20 degrees on screen the head stays the source
 * drawing; effort only on the axe and the slam.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const CHIN = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The lead leg by its angles: thigh and shin (degrees from forward, y up) and the foot's. */
interface Kick {
  readonly thigh: number;
  readonly shin: number;
  readonly foot: number;
}

const kick = (thigh: number, shin: number, foot: number): Kick => ({ thigh, shin, foot });

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly reach?: { readonly near?: number; readonly far?: number };
  readonly twist: number;
  readonly near: Foot;
  readonly far: Foot | Kick;
  /** The rear fist: a point, or offsets from its guard place under the chin (from the shoulder). */
  readonly rear: Point | { readonly chin: readonly [number, number] };
  readonly lead: readonly [number, number];
  readonly hands?: { readonly near?: Hand; readonly far?: Hand };
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  let pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: k.reach ?? {},
    twist: k.twist,
    nearFoot: k.near,
    farFoot: 'thigh' in k.far ? GUARD.farFoot : k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.far) pose = farLeg(pose, k.far);
  if ('chin' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.chin;
    return { ...pose, nearFist: at(shoulder.x + CHIN.x + dx, shoulder.y + CHIN.y + dy) };
  }
  return { ...pose, nearFist: k.rear };
}

/** The lead leg placed by its angles (forward kinematics), with the knee bend that fits. */
function farLeg(pose: Pose, leg: Kick): Pose {
  const hip = solve(pose, RIFF_BODY).far.hip;
  const r = (d: number) => (d * Math.PI) / 180;
  const knee = at(
    hip.x + RIFF_BODY.thigh * Math.cos(r(leg.thigh)),
    hip.y + RIFF_BODY.thigh * Math.sin(r(leg.thigh)),
  );
  const foot: Foot = {
    x: knee.x + RIFF_BODY.shin * Math.cos(r(leg.shin)),
    y: knee.y + RIFF_BODY.shin * Math.sin(r(leg.shin)),
    angle: leg.foot,
  };
  let best: Pose = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose = { ...pose, farFoot: foot, bends: { ...pose.bends, farKnee: bend } };
    const e = solve(trial, RIFF_BODY).far.knee;
    const d = Math.hypot(e.x - knee.x, e.y - knee.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const KEYS: readonly Key[] = [
  // 0: the load: the weight rocks back onto the rear foot, the lead heel lifts, the chest opens,
  // the rear fist still under the chin.
  {
    hip: [-7.6, 31.4],
    torso: 15,
    look: 7,
    shrug: 2,
    twist: 0.6,
    near: onBall(TOE, -10),
    far: onBall(GUARD.farFoot.x + 6.8, -14),
    rear: { chin: [-0.2, -0.8] },
    lead: [8, 44],
  },
  // 1: the skip: off the rear foot, the lead leg swings up straight.
  {
    hip: [-6, 34.5],
    torso: 2,
    look: -2,
    shrug: 1.4,
    twist: 0.8,
    near: { ...lifted(onBall(-12, -30), 3.5), angle: -62 },
    far: kick(30, 32, 97),
    rear: at(-22, 38.8),
    lead: [7.2, 50.7],
    bends: { nearElbow: 'back' },
    effects: [smear(3, [10, 9], [16, 24], [21, 38], [24.5, 50])],
  },
  // 2: the rise: still in the air, the leg high and straight, the arms wide.
  {
    hip: [-8, 37],
    torso: -14,
    look: -10,
    shrug: 0.8,
    twist: 0.9,
    near: lifted(onBall(-13.5, -40), 2),
    far: kick(64, 66, 136),
    rear: at(-24.7, 36.1),
    bends: { nearElbow: 'back' },
    lead: [0, 57],
    hands: { near: 'open' },
    effects: [smear(4, [23, 44], [23, 55], [20, 64], [14, 71])],
  },
  // 3: the hang: up on the rear toes, the heel cocked over the head, the hips over the support.
  {
    hip: [-11.5, 38.5],
    torso: -20,
    look: -14,
    shrug: 0.6,
    twist: 0.9,
    near: onBall(-15.5, -62),
    far: kick(84, 80, 160),
    rear: at(-28.2, 35.6),
    bends: { nearElbow: 'back' },
    lead: [-4, 56],
    hands: { near: 'open' },
  },
  // 4: the axe: the heel chops down onto the head, the body crunches over it, the rear fist
  // drives down, the lead one covers.
  {
    hip: [-2.5, 33.5],
    torso: 22,
    look: 18,
    shrug: 2.6,
    twist: 0.5,
    near: onBall(TOE + 0.5, -32),
    far: kick(44, 38, 103),
    rear: at(-8.1, 37.3),
    lead: [16.7, 44.9],
    bends: { nearElbow: 'back' },
    face: 'effort',
    effects: [
      smear(6, [-4, 86], [10, 85], [19, 76], [24, 59]),
      { kind: 'flash', center: at(26, 48), radius: 4.5, tone: 'strike' },
    ],
  },
  // 5: the slam: the heel drives on through to the floor, the crunch deeper.
  {
    hip: [-4.5, 29],
    torso: 32,
    look: 18,
    shrug: 3,
    twist: 0.15,
    near: onBall(TOE + 0.5, -24),
    far: planted(13),
    rear: at(-6, 33),
    lead: [16.5, 37.8],
    bends: { nearElbow: 'back' },
    face: 'effort',
    effects: [
      dust(16, 3.5, 0.15),
      { kind: 'ring', center: at(16, 1), radius: 9, progress: 0.25, tone: 'strike', squash: 0.3 },
    ],
  },
  // 6: the lead foot draws back to its mark, the body comes up past the guard.
  {
    hip: [-7, 30.4],
    torso: 16.5,
    look: 8,
    shrug: 2.4,
    twist: 0.5,
    near: onBall(TOE, -16),
    far: lifted(planted(9), 1.5),
    rear: { chin: [0.3, 1.6] },
    lead: [8.6, 45.4],
    effects: [dust(16, 3.5, 0.55)],
  },
  // 7: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    twist: 0.45,
    near: GUARD.nearFoot,
    far: planted(GUARD.farFoot.x),
    rear: { chin: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
