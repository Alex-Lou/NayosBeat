import { CROUCHED, onBall, planted, type Pose, smear } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * crouchLight (Paume basse, ↓ + L): 5 frames, 2, 3, [2], 4, 5 ticks (16), active frame 2 (ticks
 * 5-6), hitbox x 8..36 / y 2..14, a low blow. From the crouch, the lead clamp slaps flat along
 * the floor in front of him, the torso folding over the lead knee, the rear clamp kept up.
 */

export const POSES: readonly Pose[] = [
  // 0: the clamp drawn in under the chest, opening.
  keyPose({ ...CROUCHED, torso: 14, far: [8, 34], farHand: 'open' }),
  // 1: going out low, the torso folding over.
  keyPose({
    ...CROUCHED,
    hip: [-8, 24],
    torso: 34,
    reach: { far: 2 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -45),
    far: [18, 16],
    farHand: 'open',
    face: 'effort',
  }),
  // 2 (active): the palm flat along the floor.
  keyPose({
    ...CROUCHED,
    hip: [-5, 22],
    torso: 46,
    reach: { far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-8, -55),
    far: [29, 8],
    farHand: 'open',
    face: 'effort',
    effects: [smear(2, [14, 12], [22, 9], [29, 8])],
  }),
  // 3-4: back into the crouch.
  keyPose({
    ...CROUCHED,
    hip: [-8, 24],
    torso: 32,
    reach: { far: 2 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -45),
    far: [19, 14],
    farHand: 'open',
  }),
  keyPose({ ...CROUCHED, torso: 11, far: [6, 35] }),
];
