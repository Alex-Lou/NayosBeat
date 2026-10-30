import type { Point } from '../../raster.ts';
import { solve, type Bends, type Effect, type Face, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * chainLight (Revers): 6 frames, 2, 3, 3, 3, 3, 4 ticks (18), the backfist on frame 2 (ticks
 * 5-7), hitbox 8..38 / 44..58; chained from the Jab, the game carries her 10 px over ticks 0-4.
 * The jab was the bait: the rear fist under her chin is the threat, and here it goes. A
 * spinning backfist on a flat, horizontal arc: she pivots her back to the opponent, skips in
 * with the elbow leading, and the forearm whips open at head height, the back of the knuckles
 * first, then carries on across. Nothing goes over her head: that is her Talon's and Nayo's
 * Overhand's path.
 *
 * - 0: the pivot (2 ticks): on the lead ball, her back to the opponent (the jacket closed); the
 *   rear arm comes up out of the guard, the elbow rising off the ribs to aim at the opponent at
 *   chest height and the fist folding back over it to the collar (the forearm 150 degrees back
 *   along the upper arm, above it, the way an elbow folds: below it, it read as an arm bent the
 *   wrong way); the jab hand pulled down to the hip, its elbow back; the hips sink.
 * - 1: the skip (3 ticks): both feet off the floor (the game carries her, nothing slides), the
 *   rear knee soft under her, the elbow leading out at shoulder height with the forearm still
 *   folded back over it, the fist at the collar, under the jaw, the chest still closed; the
 *   head drives 10 px up and in (the fringe flicks, the chain swings out).
 * - 2: the backfist: she lands, the forearm whips open, the elbow a little bent (about 20
 *   degrees), the knuckles at the jaw's height, the chest only half open; a flat crescent trail
 *   from behind her rear shoulder round behind her head to the knuckles, a flash there. The lean
 *   stays at 29 degrees: the head never lunges past the fist's shoulder.
 * - 3: the follow-through: the arm carries on across, past the target, at chest height, the
 *   chest opening.
 * - 4: back home, past the guard: the chest wide open, the hips 1.6 px below the guard's, the
 *   lean 2.5 degrees short of it, the rear fist back under the chin, the elbow down.
 * - 5: the guard, settled.
 *
 * The arms are placed by their angles on the torso (armAt) where they fold, by the fist where
 * it strikes: the lead hand pulls back to the hip with its elbow behind it, never with the
 * forearm turned back out of an elbow in front. The head stays the source drawing (under 20 degrees on screen)
 * and stays clear of the arm, which passes under the chin. The face stays focused: a light,
 * quick hit.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const TUCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** An arm by its angles on the torso (armAt): the shoulder's and the elbow's. */
interface Angles {
  readonly shoulder: number;
  readonly elbow: number;
}

const arm = (shoulder: number, elbow: number): Angles => ({ shoulder, elbow });
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
  /** The rear fist: a point, offsets from its place under the chin, or the arm's angles. */
  readonly rear: Point | { readonly tucked: readonly [number, number] } | Angles;
  /** The lead fist, or the lead arm by its angles. */
  readonly lead: readonly [number, number] | Angles;
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
    farFist: 'shoulder' in k.lead ? GUARD.farFist : at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const led = 'shoulder' in k.lead ? armAt(pose, 'far', k.lead.shoulder, k.lead.elbow) : pose;
  if ('tucked' in k.rear) {
    const shoulder = solve(led, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.tucked;
    return { ...led, nearFist: at(shoulder.x + TUCKED.x + dx, shoulder.y + TUCKED.y + dy) };
  }
  if ('shoulder' in k.rear) return armAt(led, 'near', k.rear.shoulder, k.rear.elbow);
  return { ...led, nearFist: k.rear };
}

/**
 * `pose` with one arm placed the way a shoulder and an elbow move it (forward kinematics), the
 * angles taken on the torso, as a body measures them: the upper arm `shoulder` degrees from
 * hanging (90 straight out in front, 180 overhead, negative behind the back), the elbow flexed
 * `elbow` degrees (the forearm folding toward the front of the upper arm, never past 150, or it
 * sinks into the biceps; never negative: folded the other way, below the upper arm, it reads as
 * a broken arm). The fist goes where that puts it, with the elbow bend that keeps the elbow
 * where the angles put it.
 */
function armAt(pose: Pose, side: 'near' | 'far', shoulder: number, elbow: number): Pose {
  const s = solve(pose, RIFF_BODY);
  const root = s[side].shoulder;
  const r = (d: number) => (d * Math.PI) / 180;
  const upper = Math.atan2(-s.up.y, -s.up.x) + r(shoulder);
  const fore = upper + r(elbow);
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

const KEYS: readonly Key[] = [
  // 0: the pivot: her back to the opponent, the rear elbow up at the opponent, the fist folded
  // back to the collar.
  {
    hip: [-6, 29.8],
    torso: 22,
    look: 12,
    shrug: 1.6,
    reach: { near: -0.5, far: -1 },
    twist: -1,
    near: onBall(TOE - 2, -26),
    far: onBall(GUARD.farFoot.x + 6.8 - 2, -18),
    rear: arm(88, 150),
    lead: arm(-30, 110),
  },
  // 1: the skip: both feet up, the elbow leads out, the forearm folded back over it.
  {
    hip: [-1.2, 36.2],
    torso: 31,
    look: 14,
    shrug: 1.2,
    reach: { near: 1, far: -1.5 },
    twist: -0.8,
    near: lifted(onBall(TOE + 1, -36), 3.5),
    far: lifted(planted(GUARD.farFoot.x + 1, -10), 3),
    rear: arm(100, 150),
    lead: arm(-35, 105),
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
    lead: arm(-40, 100),
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
    lead: arm(-20, 110),
  },
  // 4: back home, past the guard: the chest opens wide, the hips sink.
  {
    hip: [-7, 30.4],
    torso: 16.5,
    look: 8,
    shrug: 2.4,
    reach: {},
    twist: 0.75,
    near: onBall(TOE, -16),
    far: planted(GUARD.farFoot.x),
    rear: { tucked: [0.3, 0.4] },
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
    near: GUARD.nearFoot,
    far: planted(GUARD.farFoot.x),
    rear: { tucked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
