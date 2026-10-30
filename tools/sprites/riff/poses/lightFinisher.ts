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
 * lightFinisher (Swipe): 7 frames, 2, 2, 3, 3, 5, 6, 7 ticks (28), the kick on frame 3 (ticks
 * 7-9), hitbox 8..42 / 30..56, knocks down; the end of L, L, L, the game carries her 10 px over
 * ticks 0-6. « Le corps bascule » (src/data/texts/riff.ts): a capoeira meia lua, the body tipping
 * back over the lead leg while the rear leg sweeps round in a wide circle, rising from low behind
 * her up through the opponent's ribs, the sole and the heel first; the leg comes down behind her
 * and she rises into her guard. No other strip of hers owns that silhouette: one long tipped line
 * from the rear hand reaching for the floor behind her to the boot in the ribs, over a straight
 * support leg up on its ball (the Talon's leg rises straight up, the Windmill and the Glissade lie
 * on the floor).
 *
 * It was a meia lua de compasso, her back turned to the opponent, folded down over her hands.
 * The skeleton only draws her facing the opponent: turned away and folded forward, the body came
 * out as its mirror, a backbend with the arms out of the back and the knee bent the wrong way,
 * the upright head stuck onto it by the crown (the neck 114 to 124 degrees off the spine). A
 * compasso would need her drawn facing the other way; until then the kick tips her backward,
 * which the skeleton draws as it is.
 *
 * - 0: the step in and the coil: the lead foot steps in, the hips sink, the rear arm drops from
 *   under the chin and swings back along her side, the lead fist by the chin.
 * - 1: the tip: the lead foot plants (her pivot), the body starts back over it, the rear heel
 *   tears up off the floor, the rear hand opens and swings down behind her.
 * - 2: the swing: tipped back 28 degrees, the rear knee comes round low and in front, rising,
 *   the boot pointed (a trail sweeping up off the floor behind her); the lead forearm up by the
 *   head, the rear hand reaching back and down.
 * - 3: the kick: tipped back 54 degrees over the straight support leg, the rear leg long through
 *   the ribs, the foot flexed so the sole and the heel lead, the rear hand reaching for the floor
 *   behind her, the lead forearm over the head; the chin tucked (40 degrees on the spine) keeps
 *   the head upright on screen and the eyes on the opponent. The trail is a wide arc rising from
 *   low behind her up through the target (never over the top, the Talon's path), a gold spark
 *   at the boot.
 * - 4: round and down: the leg sweeps on and comes down behind her onto its ball, the body comes
 *   back up over it, the rear fist on its way back up.
 * - 5: up, crouched, past the guard: the hips 2 px below it, the lean 2.5 degrees past it, the
 *   rear fist back under the chin, its elbow down; the look from under the brows.
 * - 6: the guard, settled.
 *
 * The lead foot stays put on the stage while the game carries her: it lands on frame 1 and its
 * toe (the pivot of the whole move, up on its ball from frame 2) drifts back in the cell by the
 * carry (CARRY). The kicking leg is placed by its angles from the hip (forward kinematics), the
 * arms by their angles on the torso (armAt): no joint past what a body does. The head stays the
 * source drawing on every frame (under stamp.ts's 20 degrees on screen), the neck bending 40
 * degrees at most to keep it there.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const TUCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The rear leg by its angles: thigh and shin (degrees from forward, y up) and the foot's. */
interface Kick {
  readonly thigh: number;
  readonly shin: number;
  readonly foot: number;
}

const kick = (thigh: number, shin: number, foot: number): Kick => ({ thigh, shin, foot });

/**
 * An arm by its angles on the torso, as a body measures them: the upper arm `shoulder` degrees
 * from hanging (90 straight out in front, 180 overhead, negative behind the back: never past
 * 60 there, the shoulder does not open further), the elbow flexed `elbow` degrees (the forearm
 * folding toward the front of the upper arm, never past 150: it would sink into the biceps).
 */
interface Angles {
  readonly shoulder: number;
  readonly elbow: number;
}

const arm = (shoulder: number, elbow: number): Angles => ({ shoulder, elbow });

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly reach?: { readonly near?: number; readonly far?: number };
  readonly twist: number;
  readonly near: Foot | Kick;
  readonly far: Foot;
  /** The rear fist: a point, offsets from its place under the chin, or the arm's angles. */
  readonly rear: Point | { readonly tucked: readonly [number, number] } | Angles;
  /** The lead fist, or the lead arm by its angles. */
  readonly lead: readonly [number, number] | Angles;
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
    nearFoot: 'thigh' in k.near ? GUARD.nearFoot : k.near,
    farFoot: k.far,
    farFist: 'shoulder' in k.lead ? GUARD.farFist : at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.near) pose = nearLeg(pose, k.near);
  if ('shoulder' in k.lead) pose = armAt(pose, 'far', k.lead);
  if ('tucked' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.tucked;
    return { ...pose, nearFist: at(shoulder.x + TUCKED.x + dx, shoulder.y + TUCKED.y + dy) };
  }
  if ('shoulder' in k.rear) return armAt(pose, 'near', k.rear);
  return { ...pose, nearFist: k.rear };
}

/** The rear leg placed by its angles (forward kinematics), with the knee bend that fits. */
function nearLeg(pose: Pose, leg: Kick): Pose {
  const hip = solve(pose, RIFF_BODY).near.hip;
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
    const trial: Pose = { ...pose, nearFoot: foot, bends: { ...pose.bends, nearKnee: bend } };
    const e = solve(trial, RIFF_BODY).near.knee;
    const d = Math.hypot(e.x - knee.x, e.y - knee.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

/** `pose` with one arm placed by its angles (forward kinematics), with the elbow bend that fits. */
function armAt(pose: Pose, side: 'near' | 'far', angles: Angles): Pose {
  const s = solve(pose, RIFF_BODY);
  const root = s[side].shoulder;
  const r = (d: number) => (d * Math.PI) / 180;
  const upper = Math.atan2(-s.up.y, -s.up.x) + r(angles.shoulder);
  const fore = upper + r(angles.elbow);
  const joint = at(
    root.x + RIFF_BODY.upperArm * Math.cos(upper),
    root.y + RIFF_BODY.upperArm * Math.sin(upper),
  );
  const fist = at(
    joint.x + RIFF_BODY.forearm * Math.cos(fore),
    joint.y + RIFF_BODY.forearm * Math.sin(fore),
  );
  let best: Pose = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose =
      side === 'near'
        ? { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: bend } }
        : { ...pose, farFist: fist, bends: { ...pose.bends, farElbow: bend } };
    const e = solve(trial, RIFF_BODY)[side].elbow;
    const d = Math.hypot(e.x - joint.x, e.y - joint.y);
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

/**
 * How far the game has carried her while each frame shows (10 px over ticks 0-6, evenly): a foot
 * on the floor is drawn back in the cell by it, so it stays put on the stage.
 */
const CARRY = [2.1, 5, 8.6, 10, 10, 10, 10] as const;

/** Where the lead foot's toe is planted on the stage from frame 1 (her pivot). */
const PIVOT = 13.8 + RIFF_BODY.foot + CARRY[1];

const KEYS: readonly Key[] = [
  // 0: the step in and the coil: the lead foot steps in, the hips sink, the rear arm drops.
  {
    hip: [-4.8, 29.4],
    torso: 14,
    look: 6,
    shrug: 2.4,
    twist: 0.2,
    near: onBall(TOE - CARRY[0], -34),
    far: lifted(planted(11.5, -6), 2),
    rear: arm(-25, 60),
    lead: arm(30, 135),
    face: 'focus',
  },
  // 1: the tip: the lead foot plants, the body starts back over it, the rear heel tears up.
  {
    hip: [0.5, 31.5],
    torso: -8,
    look: -2,
    shrug: 1.8,
    twist: 0.55,
    near: onBall(TOE - CARRY[1], -58),
    far: planted(PIVOT - RIFF_BODY.foot - CARRY[1]),
    rear: arm(-45, 25),
    lead: arm(55, 120),
    hands: { near: 'open' },
    effects: [dust(PIVOT - CARRY[1] - 3, 2, 0.1)],
  },
  // 2: the swing: the body tips back, the rear leg comes round low and wide, knee soft.
  {
    hip: [3.5, 33.5],
    torso: -28,
    look: -8,
    shrug: 1.2,
    twist: 0.7,
    near: kick(-6, -70, -5),
    far: onBall(PIVOT - CARRY[2], -16),
    rear: arm(-52, 15),
    lead: arm(70, 115),
    hands: { near: 'open' },
    effects: [smear(3, [-22, 9], [-9, 6], [5, 7.5], [15, 11.5], [22, 16])],
  },
  // 3: the kick: tipped back over the straight support leg, the rear leg long through the ribs.
  {
    hip: [4, 35.2],
    torso: -54,
    look: -14,
    shrug: 0.8,
    twist: 0.8,
    near: kick(17, 10, 100),
    far: onBall(PIVOT - CARRY[3], -26),
    rear: arm(-58, 10),
    lead: arm(85, 118),
    hands: { near: 'open' },
    face: 'effort',
    effects: [
      smear(5, [-21, 10], [-7, 11], [7, 19], [19, 31], [29, 39], [34, 42.5]),
      { kind: 'flash', center: at(40, 44), radius: 5, tone: 'strike' },
      dust(PIVOT - CARRY[3] - 3, 2.5, 0.35),
    ],
  },
  // 4: round and down: the leg sweeps on across and comes down behind her, the body comes up.
  {
    hip: [-2, 30.8],
    torso: -18,
    look: -6,
    shrug: 1.6,
    twist: 0.6,
    near: onBall(-19, -34),
    far: onBall(PIVOT - CARRY[4], -14),
    rear: arm(-10, 125),
    lead: arm(40, 130),
    face: 'effort',
    effects: [smear(2, [26, 34], [10, 22], [-6, 12], [-17, 7]), dust(-20, 2.5, 0.2)],
  },
  // 5: up, crouched, past the guard.
  {
    hip: [-7, 30],
    torso: 21.5,
    look: 9,
    shrug: 2.6,
    twist: 0.3,
    near: onBall(TOE, -14),
    far: planted(GUARD.farFoot.x),
    rear: { tucked: [0.4, -0.4] },
    lead: arm(20, 140),
    face: 'cool',
  },
  // 6: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    twist: 0.45,
    near: GUARD.nearFoot,
    far: planted(GUARD.farFoot.x),
    rear: { tucked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
