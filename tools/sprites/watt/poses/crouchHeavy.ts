import { at, CROUCHED, onBall, planted, type Pose, smear } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * crouchHeavy (Ratissage, ↓ + H): 8 frames, 3, 4, 4, [3], 5, 5, 6, 6 ticks (38), active frame 3
 * (ticks 11-13), hitbox x 10..48 / y 2..14, a low blow that trips. Crouched, the lead arm sweeps
 * the floor like a rake: it reaches far out, low, the torso folded over the lead knee, then
 * drags back in toward him through the boots of whoever stands there.
 */

export const POSES: readonly Pose[] = [
  // 0: the arm drawn back along the hip, the weight sinking.
  keyPose({ ...CROUCHED, torso: 13, far: [8, 33], face: 'effort' }),
  // 1-2: reaching far out over the floor, the lead knee out.
  keyPose({
    ...CROUCHED,
    hip: [-7, 23],
    torso: 32,
    reach: { far: 2 },
    farFoot: planted(14),
    nearFoot: onBall(-14, -50),
    far: [20, 20],
    face: 'effort',
  }),
  keyPose({
    ...CROUCHED,
    hip: [-3, 21],
    torso: 46,
    reach: { far: 4 },
    farFoot: planted(18),
    nearFoot: onBall(-9, -58),
    far: [32, 12],
    farHand: 'open',
    face: 'effort',
  }),
  // 3 (active): the rake down at its farthest, dragging in along the floor.
  keyPose({
    ...CROUCHED,
    hip: [-1.5, 20],
    torso: 52,
    reach: { far: 6 },
    farFoot: planted(20),
    nearFoot: onBall(-6, -62),
    near: [20, 20],
    far: [38, 7],
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(3, [24, 14], [32, 9], [38, 7]),
      { kind: 'arc', from: at(16, 14), to: at(42, 7), spread: 3 },
      { kind: 'dust', x: 40, size: 1.2, progress: 0.3 },
    ],
  }),
  // 4-5: dragged in toward him.
  keyPose({
    ...CROUCHED,
    hip: [-3, 21],
    torso: 46,
    reach: { far: 4 },
    farFoot: planted(18),
    nearFoot: onBall(-9, -58),
    far: [26, 7],
    farHand: 'open',
    effects: [smear(3, [38, 7], [32, 7], [26, 7])],
  }),
  keyPose({
    ...CROUCHED,
    hip: [-6, 23],
    torso: 36,
    reach: { far: 2 },
    farFoot: planted(15),
    nearFoot: onBall(-13, -48),
    far: [16, 12],
  }),
  // 6-7: back into the crouch.
  keyPose({ ...CROUCHED, hip: [-9, 25], torso: 24, farFoot: planted(11), far: [8, 26] }),
  keyPose({ ...CROUCHED, torso: 11, far: [6, 35] }),
];
