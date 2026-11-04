import { at, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * chainHeavy (Double marteau, H, H): 7 frames, 2, 3, 3, 3, [3], 9, 11 ticks (34), active frame 4
 * (ticks 11-13), hitbox x 12..48 / y 30..64; the game steps him 8 px on ticks 0-8. Both fists
 * together, raised above the bulb, then brought down as one in front of him. It floors.
 */

export const POSES: readonly Pose[] = [
  // 0-2: both fists going up together, above the bulb.
  keyPose({ hip: [-8.5, 37.5], torso: 6, near: [-1, 64], far: [5, 66], face: 'effort' }),
  keyPose({ hip: [-9, 38.5], torso: 0, near: [8, 79], far: [14, 81], face: 'effort' }),
  keyPose({ hip: [-8.5, 38.5], torso: 1, near: [10, 79], far: [16, 81], face: 'effort' }),
  // 3: coming down, the lead boot stepping in.
  keyPose({
    hip: [-3, 36.5],
    torso: 18,
    reach: { near: 2, far: 2 },
    farFoot: planted(11),
    near: [18, 74],
    far: [24, 72],
    face: 'effort',
    effects: [smear(3.5, [6, 88], [16, 84], [24, 72])],
  }),
  // 4 (active): both fists down in front of him, the weight on the lead boot.
  keyPose({
    hip: [1, 35],
    torso: 30,
    reach: { near: 4, far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-14, -30),
    near: [33, 48],
    far: [39, 46],
    face: 'kiai',
    effects: [
      smear(4, [24, 72], [34, 60], [39, 46]),
      { kind: 'flash', center: at(41, 46), radius: 4.5, tone: 'strike' },
      { kind: 'shards', center: at(41, 46), radius: 8, progress: 0.25, tone: 'strike' },
    ],
    glows: [{ center: at(39, 46), reach: 28, power: 1.1, tone: 'strike' }],
  }),
  // 5-6: sunk low, then the heavy recovery.
  keyPose({
    hip: [0.5, 34.5],
    torso: 31,
    reach: { near: 3, far: 3 },
    farFoot: planted(14),
    nearFoot: onBall(-14, -30),
    near: [30, 40],
    far: [36, 38],
    face: 'effort',
  }),
  keyPose({ hip: [-5, 36.5], torso: 16, farFoot: planted(10), near: [8, 50], far: [15, 49] }),
];
