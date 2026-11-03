import { onBall, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * backHeavy (Arraché, ← + H): 7 frames, 2, 3, 3, [4], 5, 6, 7 ticks (30), active frame 3 (ticks
 * 8-11), hitbox x 2..32 / y 58..104, an anti-air without invincibility and a launcher. Both arms
 * snatch skyward like a lift off the floor: a dip, then the whole body rising onto the toes, the
 * clamps open above the bulb, a green trail up from the shoulders. It whiffs on a crouching body
 * (its box starts above one).
 */

export const POSES: readonly Pose[] = [
  // 0: the dip, both clamps low.
  keyPose({ hip: [-9, 34], torso: 12, nearOff: [0, -6], farOff: [0, -6], face: 'effort' }),
  // 1-2: rising, the arms going up.
  keyPose({
    hip: [-8, 39],
    torso: 4,
    near: [2, 66],
    far: [8, 68],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  }),
  keyPose({
    hip: [-7, 41],
    torso: -2,
    tilt: -6,
    nearFoot: onBall(-17, -36),
    near: [7, 81],
    far: [13, 84],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
    effects: [smear(2.5, [8, 68], [11, 78], [13, 86])],
  }),
  // 3 (active): the snatch at its top, on the toes, the clamps open above.
  keyPose({
    hip: [-6, 42],
    torso: -5,
    tilt: -10,
    reach: { near: 2, far: 2 },
    nearFoot: onBall(-17, -40),
    near: [16, 80],
    far: [24, 83],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [smear(3, [16, 86], [22, 96], [25, 102])],
  }),
  // 4-6: coming down, back into the guard.
  keyPose({ hip: [-7, 40], torso: 0, near: [9, 82], far: [15, 83], face: 'effort' }),
  keyPose({ hip: [-8, 38], torso: 5, near: [4, 70], far: [10, 72] }),
  keyPose({ hip: [-8.8, 37.5], torso: 7.5 }),
];
