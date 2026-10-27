import { at, smear, type Pose } from './common.ts';
import { guarded } from './jump.ts';
import { AIR_GUARD } from './jumpLight.ts';

// Frame 0 (3 ticks): the coil. Both knees pulled up into the chest, the back rounds over them
// behind the high guard.
const COIL: Pose = guarded(
  {
    hip: at(-3.5, 39.5),
    torso: 14,
    head: 3,
    shrug: 1.6,
    twist: -0.2,
    nearFoot: { x: 1, y: 30.5, angle: -40 },
    farFoot: { x: -9, y: 24.5, angle: -45 },
    bends: { nearKnee: 'up' },
  },
  at(0.4, -0.3),
);

// Frame 1 (4 ticks): the cock. The shoulders tip well back, chin down, the lead knee pulled high
// and tight with the heel cocked under it; the lead elbow pulls back and down past the ribs (fist
// at the ribs, the shoulder 50 degrees back, no higher), the rear glove stays up in front of the
// chin.
const CHAMBER: Pose = {
  ...guarded(
    {
      hip: at(-2, 38.5),
      torso: -12,
      head: 16,
      shrug: 0.8,
      twist: 0.15,
      nearFoot: { x: 7, y: 33, angle: -25 },
      farFoot: { x: -6, y: 27, angle: -50 },
      bends: { nearKnee: 'up', nearElbow: 'back' },
    },
    at(0, 0),
    at(1.5, -1.5),
  ),
  nearFist: at(-2, 46.5),
};

// Frame 2 (5 ticks, active): the dive. One line from the head to the boot, leaning back over
// it; the back leg tucked, the lead arm trailing back and down along the body for balance (near
// straight, in line with the dive, the elbow soft), the rear glove still up at the chin.
const DIVE: Pose = {
  ...guarded(
    {
      hip: at(1, 33.5),
      torso: -28,
      head: 26,
      shrug: 0.4,
      twist: 0.25,
      nearFoot: { x: 28.5, y: 8.5, angle: 25 },
      farFoot: { x: -3, y: 23.5, angle: -50 },
      bends: { nearElbow: 'up' },
      face: 'effort',
    },
    at(0, 0),
    at(3.5, -1.5),
  ),
  nearFist: at(-18, 31),
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
    {
      ...DIVE,
      hip: at(0.5, 34.5),
      torso: -21,
      head: 20,
      nearFoot: { x: 26.5, y: 10.5, angle: 18 },
      farFoot: { x: -4.5, y: 24, angle: -48 },
    },
    at(0, 0),
    at(3, -1.4),
  ),
  nearFist: at(-16, 34),
};

// Frame 4 (3 ticks): the knee folds back in, the shoulders come upright. The lead arm lags behind
// the legs (overlapping action): the elbow still back, the forearm swinging forward past the
// hip; the held airborne guard then brings the glove up to the chin.
const RETRACT: Pose = {
  ...guarded(
    {
      hip: at(-0.5, 36),
      torso: -2,
      head: 10,
      shrug: 0.8,
      twist: 0.1,
      nearFoot: { x: 9, y: 16, angle: -30 },
      farFoot: { x: -8.5, y: 16, angle: -38 },
      bends: { nearElbow: 'back' },
    },
    at(0, 0),
    at(0.6, -0.5),
  ),
  nearFist: at(-3, 42),
};

/** jumpHeavy (Coup de pied sauté): diving kick. Ticks 3,4,5,3,3,4 (last held until landing). */
export const POSES: readonly Pose[] = [COIL, CHAMBER, STRIKE, FOLLOW, RETRACT, AIR_GUARD];
