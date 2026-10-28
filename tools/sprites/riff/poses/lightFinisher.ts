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
 * ticks 0-6. « Le corps bascule », the capoeira way: a meia lua de compasso. She turns her back
 * to the opponent, folds down over her hands, the head low by the floor and the eyes still on
 * the opponent, and her rear leg swings round behind her in a wide circle, the heel whipping
 * through the opponent's ribs; the leg comes down behind her and she rises into her guard. No
 * other strip of hers owns that silhouette: the support leg straight under high hips, the body
 * hanging from them, the kicking leg out the other way (the Windmill and the Glissade lie on
 * the floor, chest up).
 *
 * - 0: the step in and the turn: the lead foot steps in, her back turns to the opponent (the
 *   jacket closes), the hips drop 4.5 px into a low coil, the rear hand reaches down in front of
 *   her, the lead fist by the chin.
 * - 1: the dive: the body tips forward and down, away from the opponent, the rear hand reaching
 *   for the floor, the head low and looking back at the opponent.
 * - 2: on the hands: the palms planted, the body folded over them, the head by the floor; the
 *   rear leg swings up behind her, wide (a trail rising behind her).
 * - 3: the compasso: the heel whips round through the ribs, the leg long and the foot flexed,
 *   the body still folded over the hands; the trail is a wide ellipse rising from low behind her
 *   up through the target (never over the top, the Talon's path), a gold spark at the heel.
 * - 4: round and down: the leg comes down behind her onto its ball, the hands push off the floor,
 *   the body rising over it, still turned.
 * - 5: up, crouched, past the guard: the hips 2 px below it, the lean 2.5 degrees past it, the
 *   cocked fist a touch high; the look from under the brows.
 * - 6: the guard, settled.
 *
 * The feet and the hands stay put on the stage while the game carries her: the lead foot lands
 * on frame 1 and its toe (the pivot of the whole move, up on its ball from frame 2) drifts back
 * in the cell by the carry, so does the hands' spot; the carry ends with frame 2. The kicking
 * leg is placed by its angles from the hip (forward kinematics), long and nearly straight. The
 * head stays the source drawing on every frame (under stamp.ts's 20 degrees on screen) whatever
 * the body does: upside down by the floor she keeps her eyes on the opponent.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
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
  /** The rear fist: a point, or offsets from its cocked place on the rear shoulder. */
  readonly rear: Point | { readonly cocked: readonly [number, number] };
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
    nearFoot: 'thigh' in k.near ? GUARD.nearFoot : k.near,
    farFoot: k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.near) pose = nearLeg(pose, k.near);
  if ('cocked' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.cocked;
    return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
  }
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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const KEYS: readonly Key[] = [
  // 0: the step in and the turn.
  {
    hip: [-4.5, 27.5],
    torso: -6,
    look: 2,
    shrug: 2.8,
    twist: -1,
    near: onBall(TOE - 1.4, -32),
    far: lifted(planted(11.5, -6), 2),
    rear: at(-12, 22),
    lead: [1, 53],
    hands: { near: 'open' },
  },
  // 1: the dive: the body tips forward and down, the rear hand reaching for the floor.
  {
    hip: [1, 33],
    torso: -72,
    look: -14,
    shrug: 2.4,
    twist: -1,
    near: onBall(TOE - 3.6, -50),
    far: planted(13.8),
    rear: at(-6, 9),
    lead: [-22, 36],
    hands: { near: 'open', far: 'open' },
    bends: { nearElbow: 'back' },
  },
  // 2: on the hand: the rear leg swings up behind her, wide.
  {
    hip: [2.5, 36],
    torso: -132,
    look: -18,
    shrug: 2.6,
    twist: -1,
    near: kick(140, 158, 150),
    far: onBall(17.1, -20),
    rear: at(0.4, 2.6),
    lead: [-4.1, 2.6],
    hands: { near: 'open', far: 'open' },
    bends: { nearElbow: 'back' },
    effects: [smear(3, [-20, 22], [-26, 32], [-28, 42], [-27, 52]), dust(0, 2, 0.1)],
  },
  // 3: the compasso: the heel whips round through the ribs.
  {
    hip: [4, 37],
    torso: -142,
    look: -18,
    shrug: 0.4,
    twist: -1,
    near: kick(17, 11, 95),
    far: onBall(GUARD.farFoot.x + 6.8, -25),
    rear: at(-2.5, 2.6),
    lead: [-7, 2.6],
    hands: { near: 'open', far: 'open' },
    bends: { nearElbow: 'back' },
    face: 'effort',
    effects: [
      smear(5, [-27, 16], [-14, 27], [4, 36], [22, 42], [35, 45]),
      { kind: 'flash', center: at(41, 44), radius: 5, tone: 'strike' },
      dust(-3, 2, 0.4),
    ],
  },
  // 4: round and down: the leg comes down behind her, the hand pushes off the floor.
  {
    hip: [-4, 27.5],
    torso: -38,
    look: -8,
    shrug: 1.6,
    twist: -0.5,
    near: onBall(-20, -30),
    far: onBall(GUARD.farFoot.x + 6.8, -15),
    rear: at(-13, 6),
    lead: [-10, 44],
    hands: { near: 'open', far: 'open' },
    face: 'effort',
    effects: [smear(2, [4, 34], [-8, 28], [-16, 18], [-21, 9]), dust(-20, 2.5, 0.2)],
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
    rear: { cocked: [0.3, 1.6] },
    lead: [8.6, 45],
    face: 'cool',
  },
  // 6: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    twist: 0.45,
    near: onBall(TOE, -12),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
