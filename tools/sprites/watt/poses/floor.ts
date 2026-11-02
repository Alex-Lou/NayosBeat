import { GUARD, onBall, planted, type Foot, type Pose } from './common.ts';
import { LANDING } from './jump.ts';
import { keyPose, lyingPose, type Key } from './strike.ts';

/**
 * Watt's reactions that end on the floor (docs/watt.md §10), one module for the six strips: the
 * blow in the air, the sweep, the fall and the rise, the getup, the KO, the tech. He goes down
 * like a wardrobe: on his back, the boots toward the opponent, the bulb carried along by the
 * neck; it dims as he falls (`hurt`) and goes out on the KO (`out`). Lying down, his hips are
 * a few px off the floor, the torso back near the horizontal, the knees up.
 */

/** A boot in the air, its ankle at (x, y), the toe `angle` degrees (down: negative). */
const air = (x: number, y: number, angle: number): Foot => ({ x, y, angle });
const BENT = { farKnee: 'front' } as const;

/** Thrown back in the air: the body bent back over the blow, the legs trailing. */
const AIR_HIT: Key = {
  hip: [-6, 34],
  torso: -28,
  neck: -10,
  nearFoot: air(-2, 8, -40),
  farFoot: air(10, 12, -30),
  nearOff: [-4, 6],
  farOff: [-2, 8],
  bends: BENT,
  face: 'hurt',
};

/** Tumbling over backward. */
const TUMBLE: Key = {
  hip: [-4, 28],
  torso: -55,
  neck: -10,
  nearFoot: air(8, 20, -20),
  farFoot: air(18, 24, -10),
  nearOff: [-4, 8],
  farOff: [-2, 10],
  bends: BENT,
  face: 'hurt',
};

/** Falling flat, nearly level, about to land on his back. */
const FALLING: Key = {
  hip: [0, 20],
  torso: -75,
  neck: -5,
  nearFoot: air(16, 22, 0),
  farFoot: air(26, 24, 10),
  nearOff: [-2, 8],
  farOff: [0, 10],
  bends: BENT,
  face: 'hurt',
};

/** Down on his back, flat, the knees up, the boots toward the opponent. */
const FLAT: Key = {
  hip: [2, 11],
  torso: -86,
  neck: -4,
  nearFoot: planted(18, 0),
  farFoot: planted(24, 0),
  near: [-3, 11],
  far: [3, 12],
  bends: BENT,
  face: 'hurt',
};

/** The bounce off the floor. */
const BOUNCE: Key = {
  ...FLAT,
  hip: [2, 13],
  torso: -80,
  neck: 6,
  near: [-3, 15],
  far: [3, 16],
};

/** Sitting up on an elbow, the bulb up. */
const SIT_UP: Key = {
  hip: [0, 10],
  torso: -42,
  neck: 30,
  nearFoot: planted(18, 0),
  farFoot: planted(22, 0),
  nearOff: [-6, -4],
  farOff: [8, -4],
  bends: BENT,
  face: 'tired',
};

/** Up on one knee, the weight forward, about to stand. */
const KNEE: Key = {
  hip: [-10, 23],
  torso: 26,
  nearFoot: onBall(-21, -72),
  farFoot: planted(6),
  nearOff: [0, -6],
  farOff: [0, -6],
  face: 'tired',
};

/** The crouch on the way up, both boots under him. */
const LOW: Key = {
  hip: [-11, 28],
  torso: 16,
  nearFoot: onBall(-20, -30),
  farFoot: planted(7.5),
  nearOff: [0, -3],
  farOff: [0, -3],
};

const RISING: Key = { ...LOW, hip: [-10, 34], torso: 11, nearOff: [0, -1], farOff: [0, -1] };

/** airHit: 4 frames (3, 5, 6, 1 ticks); thrownFall plays frames 2 and 3. */
const AIR_HIT_KEYS: readonly Key[] = [
  AIR_HIT,
  TUMBLE,
  FALLING,
  { ...FALLING, hip: [1, 15], torso: -82 },
];
export const AIR_HIT_POSES: readonly Pose[] = AIR_HIT_KEYS.map(lyingPose);

/** trip: 4 frames (2, 2, 2, 7 ticks): the boots swept from under him, down onto his seat. */
const TRIP_KEYS: readonly Key[] = [
  {
    ...AIR_HIT,
    hip: [-8, 34],
    torso: -12,
    neck: -6,
    nearFoot: onBall(-18, -20),
    farFoot: air(16, 14, 20),
  },
  { ...TUMBLE, hip: [-6, 24], torso: -40 },
  { ...FALLING, hip: [-2, 17], torso: -62 },
  { ...FLAT, hip: [0, 11], torso: -70, neck: 8 },
];
export const TRIP_POSES: readonly Pose[] = TRIP_KEYS.map(lyingPose);

/** knockdown: 6 frames (3, 3, 4, 6, 6, 8 ticks), the 40 ticks from the landing to the rise. */
export const KNOCKDOWN_POSES: readonly Pose[] = [
  ...[FLAT, BOUNCE, FLAT, SIT_UP].map(lyingPose),
  ...[KNEE, LOW].map(keyPose),
];

/** getup: 5 frames of 2 ticks, from the floor back to the guard. */
export const GETUP_POSES: readonly Pose[] = [
  keyPose(KNEE),
  keyPose(LOW),
  keyPose(RISING),
  keyPose({ ...RISING, hip: [-9.5, 36.5], torso: 9, nearOff: [0, 0], farOff: [0, 0] }),
  GUARD,
];

/**
 * ko: 8 frames (4, 4, 4, 4, 4, 4, 6, 1 ticks); koLanding plays frames 4-7. The last blow lifts
 * him, he falls back flat like a wardrobe, bounces once and stays down: the bulb goes out.
 */
const KO_KEYS: readonly Key[] = [
  {
    ...AIR_HIT,
    hip: [-10, 37],
    torso: -10,
    neck: -16,
    nearFoot: onBall(-19, -24),
    farFoot: planted(7.5),
  },
  AIR_HIT,
  TUMBLE,
  FALLING,
  { ...FLAT, face: 'out' },
  { ...BOUNCE, face: 'out' },
  { ...FLAT, face: 'out' },
  { ...FLAT, neck: -8, near: [-3, 11.5], far: [3, 12.5], face: 'out' },
];
export const KO_POSES: readonly Pose[] = KO_KEYS.map(lyingPose);

/** tech: 4 frames (3, 3, 4, 4 ticks): out of a throw, he lands on his boots and stands. */
export const TECH_POSES: readonly Pose[] = [
  LANDING,
  keyPose(LOW),
  keyPose(RISING),
  keyPose({ ...RISING, hip: [-9.5, 36.5], torso: 9, nearOff: [0, 0], farOff: [0, 0] }),
];
