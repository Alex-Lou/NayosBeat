import { onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * chainLaunch (Soulevé, L, L, ← + H): 7 frames, 2, 3, 3, [4], 5, 6, 7 ticks (30), active frame 3
 * (ticks 8-11), hitbox x 4..34 / y 58..104, the launcher of his string; the game steps him 10 px
 * on ticks 0-6. He scoops the opponent from under and lifts him onto his shoulders: down low with
 * both open clamps, under, then up with the whole body. It whiffs on a crouching body.
 */

export const POSES: readonly Pose[] = [
  // 0: down low, both clamps open, scooping in.
  keyPose({
    hip: [-6, 31],
    torso: 26,
    farFoot: planted(11),
    nearFoot: onBall(-17, -30),
    near: [10, 34],
    far: [16, 32],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  }),
  // 1-2: under the body, then lifting.
  keyPose({
    hip: [-5, 34],
    torso: 16,
    farFoot: planted(11),
    near: [14, 46],
    far: [20, 46],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  }),
  keyPose({
    hip: [-5, 39],
    torso: 4,
    farFoot: planted(11),
    nearFoot: onBall(-16, -34),
    near: [14, 72],
    far: [20, 74],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
    effects: [smear(3, [18, 46], [20, 60], [20, 74])],
  }),
  // 3 (active): up onto his shoulders, the clamps high and in front.
  keyPose({
    hip: [-2.5, 42],
    torso: 0,
    tilt: -8,
    reach: { near: 3, far: 4 },
    farFoot: planted(11),
    nearFoot: onBall(-16, -40),
    near: [18, 79],
    far: [25, 82],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [smear(3, [20, 74], [24, 88], [25, 101])],
  }),
  // 4-6: coming down, back into the guard.
  keyPose({ hip: [-6, 40], torso: 2, farFoot: planted(10), near: [12, 81], far: [18, 82] }),
  keyPose({ hip: [-7.5, 38], torso: 6, farFoot: planted(9), near: [5, 70], far: [11, 72] }),
  keyPose({ hip: [-8.8, 37.5], torso: 7.5 }),
];
