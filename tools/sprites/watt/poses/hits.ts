import { GUARD, lifted, onBall, onHeel, planted, type Pose } from './common.ts';
import { keyPose, type Key } from './strike.ts';

/**
 * Watt's standing reactions (docs/watt.md §10), one module for the four: a colosse takes a blow
 * and gives little, the filament dims (`hurt`) as it lands. Each is 5 frames, 3, 3, 4, 4, 2 ticks
 * (hitCrouch: 3, 4, 1): the impact held through the hitstop, its peak, two frames back toward the
 * guard, the last one out of it (its quick version plays frames 0, 1 and 4, clips.ts). The clamps
 * keep the guard's hold on the shoulders, knocked loose.
 */

/** A reaction: its impact and peak keys; the recovery is drawn from them toward the guard. */
function reaction(impact: Key, peak: Key): readonly Pose[] {
  const mid = (a: number, b: number, t: number) => a + (b - a) * t;
  const back = (t: number): Key => ({
    ...peak,
    hip: [mid(peak.hip[0], GUARD.hip.x, t), mid(peak.hip[1], GUARD.hip.y, t)],
    torso: mid(peak.torso, GUARD.torso, t),
    ...(peak.tilt !== undefined ? { tilt: peak.tilt * (1 - t) } : {}),
    nearOff: [(peak.nearOff?.[0] ?? 0) * (1 - t), (peak.nearOff?.[1] ?? 0) * (1 - t)],
    farOff: [(peak.farOff?.[0] ?? 0) * (1 - t), (peak.farOff?.[1] ?? 0) * (1 - t)],
    face: t < 0.7 ? 'hurt' : 'focus',
  });
  return [
    keyPose(impact),
    keyPose(peak),
    keyPose(back(0.4)),
    keyPose(back(0.75)),
    keyPose(back(0.95)),
  ];
}

/** hitHigh: the bulb snapped back, the chest after it, the weight on the rear leg. */
export const HIT_HIGH = reaction(
  {
    hip: [-11, 37.5],
    torso: 1,
    tilt: -14,
    shrug: 2,
    nearOff: [-1, 2],
    farOff: [1, 3],
    face: 'hurt',
  },
  {
    hip: [-12, 37.5],
    torso: -3,
    tilt: -18,
    shrug: 1.6,
    nearFoot: onBall(-19, -24),
    farFoot: onHeel(planted(7.5), 10),
    nearOff: [-1.5, 3],
    farOff: [1.5, 4],
    face: 'hurt',
  },
);

/** hitMid: folded at the gut, the clamps drawn in, the bulb dropping forward. */
export const HIT_MID = reaction(
  {
    hip: [-11, 36.5],
    torso: 20,
    tilt: 6,
    shrug: 3.6,
    nearOff: [-1, -3],
    farOff: [1, -4],
    face: 'hurt',
  },
  {
    hip: [-12.5, 36],
    torso: 26,
    tilt: 10,
    shrug: 3.8,
    nearFoot: onBall(-19, -26),
    nearOff: [-1.5, -4],
    farOff: [1.5, -5],
    face: 'hurt',
  },
);

/** hitLow: the lead knee buckling, the hips dropping, the lead boot knocked off the floor. */
export const HIT_LOW = reaction(
  {
    hip: [-10.5, 34.5],
    torso: 14,
    shrug: 3.2,
    farFoot: lifted(planted(6, -6), 1.5),
    nearOff: [0, -2],
    farOff: [1, -3],
    face: 'hurt',
  },
  {
    hip: [-11, 33.5],
    torso: 16,
    shrug: 3.4,
    nearFoot: onBall(-19, -28),
    farFoot: lifted(planted(5, -8), 2.5),
    nearOff: [0, -3],
    farOff: [1, -4],
    face: 'hurt',
  },
);

const CROUCHED = { hip: [-11.5, 26], nearFoot: onBall(-20, -24), farFoot: planted(8.5) } as const;

/** hitCrouch: 3 frames, crouched: the chest knocked back over the rear leg, then down again. */
export const HIT_CROUCH: readonly Pose[] = [
  keyPose({
    ...CROUCHED,
    hip: [-13, 26.5],
    torso: 2,
    tilt: -10,
    nearOff: [-1, 1],
    farOff: [1, 2],
    face: 'hurt',
  }),
  keyPose({
    ...CROUCHED,
    hip: [-13.5, 26.5],
    torso: 0,
    tilt: -12,
    nearOff: [-1.5, 1.5],
    farOff: [1.5, 2.5],
    face: 'hurt',
  }),
  keyPose({ ...CROUCHED, torso: 9, nearOff: [-0.5, 0.5], farOff: [1, 1] }),
];
