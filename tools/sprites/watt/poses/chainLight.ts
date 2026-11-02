import { smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * chainLight (Crochet court, L, L): 6 frames, 3, 3, [3], 4, 4, 4 ticks (21), active frame 2
 * (ticks 6-8), hitbox x 8..36 / y 42..58; the game steps him 8 px on ticks 0-6. A short hook of
 * the rear clamp: the rear shoulder turns through, the chest opening to the viewer, the hips in
 * behind it; the lead clamp tucks back in to cover.
 */

export const POSES: readonly Pose[] = [
  // 0: the rear clamp cocked by the jaw, the shoulders turning away.
  keyPose({ hip: [-7, 37], torso: 12, twist: 0.2, near: [3, 56], far: [13, 47] }),
  // 1: the hook coming round.
  keyPose({
    hip: [-5.5, 37],
    torso: 16,
    twist: 0.55,
    reach: { near: 2 },
    near: [16, 54],
    far: [17, 46],
    face: 'effort',
  }),
  // 2 (active): the hook landing, the rear shoulder through.
  keyPose({
    hip: [-4.5, 36.8],
    torso: 18,
    twist: 0.75,
    reach: { near: 6 },
    near: [28, 50],
    far: [21, 45],
    face: 'effort',
    effects: [smear(2.5, [10, 55], [20, 53], [28, 50])],
  }),
  // 3-5: back into the guard.
  keyPose({ hip: [-5.5, 37], torso: 15, twist: 0.6, reach: { near: 1.5 }, near: [19, 51] }),
  keyPose({ hip: [-7, 37.2], torso: 12, twist: 0.45, near: [9, 52] }),
  keyPose({ hip: [-8.5, 37.4], torso: 9, twist: 0.38 }),
];
