import { at, smear, type Pose } from './common.ts';
import { AIR_GUARD } from './jumpLight.ts';

// Frame 0 (3 ticks): the coil. Both knees pulled up into the chest, the back rounds over them,
// the rear fist at the jaw line in front of the chin.
const COIL: Pose = {
  hip: at(-3.5, 39.5),
  torso: 11,
  head: 4,
  shrug: 3.6,
  twist: -0.2,
  nearFoot: { x: 1, y: 30.5, angle: -40 },
  farFoot: { x: -9, y: 24.5, angle: -45 },
  nearFist: at(10, 51.5),
  farFist: at(12, 63.5),
  bends: { nearKnee: 'up' },
};

// Frame 1 (4 ticks): the cock. The shoulders tip well back, chin down, the lead knee pulled
// high and tight with the heel cocked under it, the lead fist already starting back.
const CHAMBER: Pose = {
  hip: at(-2, 38.5),
  torso: -12,
  head: 16,
  shrug: 2,
  twist: 0.15,
  nearFoot: { x: 7, y: 33, angle: -25 },
  farFoot: { x: -6, y: 27, angle: -50 },
  nearFist: at(0, 47),
  farFist: at(3, 62.5),
  bends: { nearKnee: 'up' },
};

// Frame 2 (5 ticks, active): the dive. One line from the shoulders to the boot, leaning back
// over it; the back leg tucked, the lead arm flung back for balance, the rear fist at the chin.
const DIVE: Pose = {
  hip: at(1, 33.5),
  torso: -28,
  head: 26,
  shrug: 1,
  twist: 0.25,
  nearFoot: { x: 28.5, y: 8.5, angle: 25 },
  farFoot: { x: -3, y: 23.5, angle: -50 },
  nearFist: at(-23, 39.5),
  farFist: at(-2, 55),
  bends: { nearElbow: 'back' },
  face: 'effort',
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
  ...DIVE,
  hip: at(0.5, 34.5),
  torso: -21,
  head: 20,
  nearFoot: { x: 26.5, y: 10.5, angle: 18 },
  farFoot: { x: -4.5, y: 24, angle: -48 },
  nearFist: at(-20, 42.5),
  farFist: at(0, 56.5),
};

// Frame 4 (3 ticks): the knee folds back in, the shoulders come upright, the arms return.
const RETRACT: Pose = {
  hip: at(-0.5, 36),
  torso: -2,
  head: 10,
  shrug: 2.4,
  twist: 0.1,
  nearFoot: { x: 9, y: 16, angle: -30 },
  farFoot: { x: -8.5, y: 16, angle: -38 },
  nearFist: at(-2, 46),
  farFist: at(8.5, 60),
  bends: { nearElbow: 'back' },
};

/** jumpHeavy (Coup de pied sauté): diving kick. Ticks 3,4,5,3,3,4 (last held until landing). */
export const POSES: readonly Pose[] = [COIL, CHAMBER, STRIKE, FOLLOW, RETRACT, AIR_GUARD];
