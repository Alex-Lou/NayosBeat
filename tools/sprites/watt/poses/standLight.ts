import { smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * standLight (Paume, docs/watt.md §5.1): 5 frames, 1, 3, [2], 4, 5 ticks (15), active frame 2
 * (ticks 4-5), hitbox x 8..32 / y 40..54. The lead clamp opens and shoves, palm flat, at belly
 * height: a short heavy push from the shoulder, the hips in behind it, the rear clamp kept up.
 * Fast for him (4 ticks): it opens L, L, L.
 */

export const POSES: readonly Pose[] = [
  // 0: the clamp opening, drawn in a little.
  keyPose({ hip: [-8.5, 37.3], torso: 9.5, far: [8, 51], farHand: 'open' }),
  // 1: the shove going out, the shoulder rolling in.
  keyPose({
    hip: [-6.5, 37],
    torso: 14,
    reach: { far: 2 },
    far: [19, 48.5],
    farHand: 'open',
    face: 'effort',
  }),
  // 2 (active): the palm flat at the end of the shove.
  keyPose({
    hip: [-5, 36.8],
    torso: 17,
    reach: { far: 3 },
    far: [28, 47.5],
    farHand: 'open',
    face: 'effort',
    effects: [smear(2.5, [12, 49], [20, 48], [28, 47.5])],
  }),
  // 3-4: drawn back into the guard.
  keyPose({ hip: [-6.5, 37], torso: 13, reach: { far: 1.5 }, far: [18, 49.5], farHand: 'open' }),
  keyPose({ hip: [-8.3, 37.4], torso: 9.5, far: [9, 52] }),
];
