import { at, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * standHeavy (Marteau, H): 7 frames, 3, 3, 3, 3, [3], 9, 11 ticks (35), active frame 4 (ticks
 * 12-14), hitbox x 14..54 / y 40..58, his longest reach standing (67.5 px). The lead fist rises
 * high, then falls from up there onto chest height in front of him: he leans back to raise it,
 * then steps in onto the lead boot and drops all his weight behind it. Its CONTRE folds.
 */

export const POSES: readonly Pose[] = [
  // 0-2: the fist rising high, the weight leaning back on the rear leg.
  keyPose({ hip: [-9.5, 37.5], torso: 6, far: [4, 66], face: 'effort' }),
  keyPose({ hip: [-10, 38], torso: 2, far: [2, 80], face: 'effort' }),
  keyPose({ hip: [-9.5, 38], torso: 3, far: [5, 86], face: 'effort' }),
  // 3: the fall begins, the lead boot stepping in.
  keyPose({
    hip: [-4, 36.5],
    torso: 18,
    reach: { far: 3 },
    farFoot: planted(11),
    far: [26, 74],
    face: 'effort',
    effects: [smear(3, [8, 86], [18, 82], [26, 74])],
  }),
  // 4 (active): the hammer down at chest height, all his weight on the lead boot.
  keyPose({
    hip: [1.5, 35],
    torso: 32,
    reach: { far: 6 },
    farFoot: planted(15),
    nearFoot: onBall(-14, -32),
    far: [44, 50],
    face: 'kiai',
    effects: [
      smear(3.5, [28, 74], [38, 64], [44, 50]),
      { kind: 'flash', center: at(46, 50), radius: 4.5, tone: 'strike' },
    ],
    glows: [{ center: at(44, 50), reach: 28, power: 1.0, tone: 'strike' }],
  }),
  // 5: the follow-through, the fist sunk low.
  keyPose({
    hip: [1, 34.5],
    torso: 32,
    reach: { far: 5 },
    farFoot: planted(15),
    nearFoot: onBall(-14, -32),
    far: [40, 44],
    face: 'effort',
  }),
  // 6: the heavy recovery, the lead boot coming back.
  keyPose({ hip: [-5, 36.5], torso: 17, farFoot: planted(10.5), far: [17, 50] }),
];
