import { at, smear, type Pose } from './common.ts';
import { guarded, hanging } from './jump.ts';
import { AIR_GUARD } from './jumpLight.ts';

// Frame 0 (3 ticks): the coil. Both knees pulled up into the chest, the back rounds over them
// behind the high guard, the rear boot hanging from its shin.
const COIL: Pose = guarded(
  hanging(
    {
      hip: at(-3.5, 39.5),
      torso: 14,
      head: 3,
      shrug: 1.6,
      twist: -0.2,
      nearFoot: { x: 1, y: 30.5, angle: -40 },
      farFoot: { x: -9, y: 24.5 },
      bends: { nearKnee: 'up' },
    },
    { far: 95 },
  ),
  at(0.4, -0.3),
);

// Frame 1 (4 ticks): the cock. The shoulders tip well back, chin down, the lead knee pulled high
// and tight with the heel cocked under it; the lead elbow pulls back and down past the ribs (fist
// at the ribs, the shoulder under 50 degrees back), the rear glove stays up in front of the
// chin, the rear boot hanging from its shin.
const CHAMBER: Pose = {
  ...guarded(
    hanging(
      {
        hip: at(-2, 38.5),
        torso: -12,
        head: 16,
        shrug: 0.8,
        twist: 0.15,
        nearFoot: { x: 7, y: 33, angle: -25 },
        farFoot: { x: -6, y: 27 },
        bends: { nearKnee: 'up', nearElbow: 'back' },
      },
      { far: 95 },
    ),
    at(0, 0),
    at(1.5, -1.5),
  ),
  nearFist: at(-1, 46),
};

// Frame 2 (5 ticks, active): the dive. One line from the head to the boot, leaning back over
// it; the back leg tucked, its boot pointed down off the shin (never cranked up toward it), the
// lead arm hanging down along the body for balance (near straight, the elbow soft and pointing
// back: with the chest leaning back, a shoulder goes no farther behind it than this), the rear
// glove still up at the chin.
const DIVE: Pose = {
  ...guarded(
    hanging(
      {
        hip: at(1, 33.5),
        torso: -28,
        head: 26,
        shrug: 0.4,
        twist: 0.25,
        nearFoot: { x: 28.5, y: 8.5, angle: 25 },
        farFoot: { x: -3, y: 23.5 },
        bends: { nearElbow: 'back' },
        face: 'effort',
      },
      { far: 85 },
    ),
    at(0, 0),
    at(3.5, -1.5),
  ),
  nearFist: at(-12, 29),
};

const STRIKE: Pose = {
  ...DIVE,
  effects: [
    // The heel's path, bowed slightly under the leg line: the diagonal of the dive.
    smear(5, [9, 27], [14, 20], [20, 13.5], [25, 8.5], [30, 5.5]),
    // Streaming back from the top of the boot alongside the shin, just clear of its top edge
    // (the lines are drawn on the front layer: on the shin they would read as painted stripes).
    {
      kind: 'speed',
      center: at(30.9, 16.1),
      length: 12,
      spread: 2.5,
      direction: -50,
      tone: 'strike',
    },
    { kind: 'flash', center: at(36.5, 6.5), radius: 6, tone: 'strike' },
  ],
};

// Frame 3 (3 ticks): follow-through, the leg still long, the jaw still set.
const FOLLOW: Pose = {
  ...guarded(
    hanging(
      {
        ...DIVE,
        hip: at(0.5, 34.5),
        torso: -21,
        head: 20,
        nearFoot: { x: 26.5, y: 10.5, angle: 18 },
        farFoot: { x: -4.5, y: 24 },
      },
      { far: 88 },
    ),
    at(0, 0),
    at(3, -1.4),
  ),
  nearFist: at(-11, 31.5),
};

// Frame 4 (3 ticks): the knee folds back in, the shoulders come upright, the rear boot hanging
// from its shin. The lead arm lags behind the legs (overlapping action): the elbow still back,
// the forearm swinging forward past the hip, in front of it; the held airborne guard then brings
// the glove up to the chin.
const RETRACT: Pose = {
  ...guarded(
    hanging(
      {
        hip: at(-0.5, 36),
        torso: -2,
        head: 10,
        shrug: 0.8,
        twist: 0.1,
        nearFoot: { x: 9, y: 16, angle: -30 },
        farFoot: { x: -8.5, y: 16 },
        bends: { nearElbow: 'back' },
      },
      { far: 95 },
    ),
    at(0, 0),
    at(0.6, -0.5),
  ),
  nearFist: at(0, 40),
};

/** jumpHeavy (Coup de pied sauté): diving kick. Ticks 3,4,5,3,3,4 (last held until landing). */
export const POSES: readonly Pose[] = [COIL, CHAMBER, STRIKE, FOLLOW, RETRACT, AIR_GUARD];
