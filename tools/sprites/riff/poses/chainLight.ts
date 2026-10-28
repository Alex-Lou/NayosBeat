import type { Point } from '../../raster.ts';
import { solve, type Bends, type Effect, type Face, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * chainLight (Revers): 6 frames, 2, 3, 3, 3, 3, 4 ticks (18), the backfist on frame 2 (ticks
 * 5-7), hitbox 8..38 / 44..58; chained from the Jab, the game carries her 10 px over ticks 0-4.
 * The jab was the bait: the loaded rear fist of her guard is the threat, and here it goes. A
 * spinning backfist on a flat, horizontal arc: she pivots her back to the opponent, skips in
 * with the elbow leading, and the forearm whips open at head height, the back of the knuckles
 * first, then carries on across. Nothing goes over her head: that is her Talon's and Nayo's
 * Overhand's path.
 *
 * - 0: the pivot (2 ticks): on the lead ball, her back to the opponent (the jacket closed), the
 *   rear arm folded across the chest, the elbow aimed at the opponent and the fist back by the
 *   far shoulder, under the chin; the jab hand down to the ribs; the hips sink.
 * - 1: the skip (3 ticks): both feet off the floor (the game carries her, nothing slides), the
 *   elbow leading out at shoulder height with the forearm still folded back, the chest still
 *   closed; the head drives 10 px up and in (the fringe flicks, the chain swings out).
 * - 2: the backfist: she lands, the forearm whips open, the elbow a little bent (about 20
 *   degrees), the knuckles at the jaw's height, the chest only half open; a flat crescent trail
 *   from behind her rear shoulder round behind her head to the knuckles, a flash there. The lean
 *   stays at 29 degrees: the head never lunges past the fist's shoulder.
 * - 3: the follow-through: the arm carries on across, past the target, at chest height, the
 *   chest opening.
 * - 4: the re-cock, past the guard: the chest wide open, the hips 1.6 px below the guard's, the
 *   lean 2.5 degrees short of it, the cocked fist a touch high.
 * - 5: the guard, settled.
 *
 * The rear arm is placed by its angles from the shoulder (forward kinematics) where it folds,
 * by its fist where it strikes. The head stays the source drawing (under 20 degrees on screen)
 * and stays clear of the arm, which passes under the chin. The face stays focused: a light,
 * quick hit.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The rear arm by its angles: upper arm and forearm, degrees from forward (y up). */
interface Angles {
  readonly upper: number;
  readonly fore: number;
}

const arm = (upper: number, fore: number): Angles => ({ upper, fore });
const BENDS = ['down', 'up', 'front', 'back'] as const;

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly reach: { readonly near?: number; readonly far?: number };
  readonly twist: number;
  readonly near: Foot;
  readonly far: Foot;
  /** The rear fist: a point, or offsets from its cocked place on the rear shoulder. */
  readonly rear: Point | { readonly cocked: readonly [number, number] } | Angles;
  readonly lead: readonly [number, number];
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: k.reach,
    twist: k.twist,
    nearFoot: k.near,
    farFoot: k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('cocked' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.cocked;
    return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
  }
  if ('upper' in k.rear) return nearArm(pose, k.rear.upper, k.rear.fore);
  return { ...pose, nearFist: k.rear };
}

/** The rear arm placed by its angles (forward kinematics), with the elbow bend that fits. */
function nearArm(pose: Pose, upper: number, fore: number): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  const r = (d: number) => (d * Math.PI) / 180;
  const elbow = at(
    shoulder.x + RIFF_BODY.upperArm * Math.cos(r(upper)),
    shoulder.y + RIFF_BODY.upperArm * Math.sin(r(upper)),
  );
  const fist = at(
    elbow.x + RIFF_BODY.forearm * Math.cos(r(fore)),
    elbow.y + RIFF_BODY.forearm * Math.sin(r(fore)),
  );
  let best: Pose = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose = { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: bend } };
    const e = solve(trial, RIFF_BODY).near.elbow;
    const d = Math.hypot(e.x - elbow.x, e.y - elbow.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

const KEYS: readonly Key[] = [
  // 0: the pivot: her back to the opponent, the rear arm folded across the chest.
  {
    hip: [-6, 29.8],
    torso: 22,
    look: 12,
    shrug: 1.6,
    reach: { near: -0.5, far: -1 },
    twist: -1,
    near: onBall(TOE - 2, -26),
    far: onBall(GUARD.farFoot.x + 6.8 - 2, -18),
    rear: arm(-16, 170),
    lead: [4, 39],
  },
  // 1: the skip: both feet up, the elbow leads out, the forearm folded back.
  {
    hip: [-1.2, 36.2],
    torso: 31,
    look: 14,
    shrug: 1.2,
    reach: { near: 1, far: -1.5 },
    twist: -0.8,
    near: lifted(onBall(TOE - 2, -32), 2.5),
    far: lifted(planted(GUARD.farFoot.x + 1, -10), 3),
    rear: arm(-6, 172),
    lead: [1, 41],
  },
  // 2: the backfist.
  {
    hip: [-1.5, 31],
    torso: 29,
    look: 12,
    shrug: 2.4,
    reach: { near: 3.5, far: -2 },
    twist: -0.35,
    near: onBall(TOE, -30),
    far: planted(GUARD.farFoot.x),
    rear: at(30.2, 53.5),
    lead: [-2, 43],
    effects: [
      smear(3, [-9, 53], [2, 56], [14, 57], [25, 55.5], [32, 53.5]),
      { kind: 'flash', center: at(36, 53), radius: 4, tone: 'strike' },
    ],
  },
  // 3: the follow-through: the arm carries on across, past the target.
  {
    hip: [-2.5, 30.8],
    torso: 26,
    look: 11,
    shrug: 2.4,
    reach: { near: 2, far: -1 },
    twist: 0.3,
    near: onBall(TOE, -26),
    far: planted(GUARD.farFoot.x),
    rear: at(15, 45),
    lead: [1, 44],
  },
  // 4: the re-cock, past the guard: the chest opens wide, the hips sink.
  {
    hip: [-7, 30.4],
    torso: 16.5,
    look: 8,
    shrug: 2.4,
    reach: {},
    twist: 0.75,
    near: onBall(TOE, -16),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0.3, 1.6] },
    lead: [8.6, 45.4],
  },
  // 5: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    reach: {},
    twist: 0.45,
    near: onBall(TOE, -12),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
