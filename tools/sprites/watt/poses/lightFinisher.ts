import { at, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * lightFinisher (Jeté, L, L, L): 7 frames, 3, 3, 3, [3], 5, 6, 7 ticks (30), active frame 3
 * (ticks 9-11), hitbox x 8..40 / y 34..62; the game steps him 10 px on ticks 0-9. Both arms
 * drive forward together, the way a bar is thrown off the chest: the clamps gathered in front of
 * it, then shoved out level, the whole mass behind them. It floors.
 */

export const POSES: readonly Pose[] = [
  // 0: both clamps gathered in front of the chest, the weight sinking.
  keyPose({ hip: [-8.5, 36.5], torso: 10, nearOff: [1, -2], farOff: [0, -2], face: 'effort' }),
  // 1-2: the drive.
  keyPose({ hip: [-6, 36.5], torso: 14, near: [9, 50], far: [15, 49], face: 'effort' }),
  keyPose({
    hip: [-4, 36.3],
    torso: 18,
    reach: { near: 2, far: 2 },
    near: [18, 49],
    far: [24, 48],
    face: 'effort',
  }),
  // 3 (active): the shove at its end, both arms out level.
  keyPose({
    hip: [-2.5, 36],
    torso: 21,
    reach: { near: 3, far: 3 },
    near: [27, 49],
    far: [33, 48],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(3, [14, 49], [24, 48.5], [33, 48]),
      { kind: 'arc', from: at(14, 50), to: at(37, 48), spread: 3.5 },
      { kind: 'flash', center: at(35, 48), radius: 4, tone: 'strike' },
    ],
    glows: [{ center: at(33, 48), reach: 24, power: 0.9, tone: 'strike' }],
  }),
  // 4-6: the follow-through, then back into the guard.
  keyPose({
    hip: [-3, 36.3],
    torso: 19,
    reach: { near: 2, far: 2 },
    near: [23, 50],
    far: [29, 49],
    nearHand: 'open',
    farHand: 'open',
  }),
  keyPose({ hip: [-5.5, 36.8], torso: 14, near: [12, 51], far: [18, 50] }),
  keyPose({ hip: [-8, 37.2], torso: 10 }),
];
