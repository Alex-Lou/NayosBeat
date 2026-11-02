import { at, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * special (Coup de jus, docs/watt.md §5.1): 8 frames, 2, 2, 3, 3, [3], 6, 8, 8 ticks (35),
 * active frame 4 (ticks 10-12), hitbox x 10..44 / y 30..60; the game steps him 16 px on ticks
 * 2-10. Both clamps shoved out in front on a heavy step; on contact the exoskeleton discharges,
 * a small spray of green arcs off the clamps. Its Remix « survolté » plays the same strip, its
 * effects redrawn in platine (clips.ts).
 */

export const POSES: readonly Pose[] = [
  // 0-1: both clamps drawn back to the chest, the weight gathering.
  keyPose({ hip: [-9, 36.5], torso: 10, nearOff: [0, -2], farOff: [1, -2], face: 'effort' }),
  keyPose({ hip: [-8.5, 36], torso: 12, nearOff: [0, -3], farOff: [1, -3], face: 'effort' }),
  // 2-3: the step, the clamps going out.
  keyPose({
    hip: [-6, 36],
    torso: 16,
    farFoot: planted(10),
    nearFoot: onBall(-16, -28),
    near: [10, 48],
    far: [16, 47],
    face: 'effort',
  }),
  keyPose({
    hip: [-3, 35.5],
    torso: 20,
    reach: { near: 2, far: 2 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -30),
    near: [20, 47],
    far: [26, 46],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  }),
  // 4 (active): both clamps out, the discharge.
  keyPose({
    hip: [-1, 35],
    torso: 24,
    reach: { near: 3, far: 4 },
    farFoot: planted(13),
    nearFoot: onBall(-14, -32),
    near: [29, 47],
    far: [35, 45],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(3, [18, 47], [28, 46], [35, 45]),
      { kind: 'energy', center: at(41, 46), radius: 4 },
      { kind: 'energy', center: at(36, 52), radius: 2.5 },
    ],
  }),
  // 5-7: held a beat, then back into the guard.
  keyPose({
    hip: [-1.5, 35],
    torso: 23,
    reach: { near: 2, far: 3 },
    farFoot: planted(13),
    nearFoot: onBall(-14, -32),
    near: [27, 46],
    far: [33, 44],
    nearHand: 'open',
    farHand: 'open',
  }),
  keyPose({ hip: [-4.5, 36], torso: 17, farFoot: planted(11), near: [14, 49], far: [20, 48] }),
  keyPose({ hip: [-7.5, 36.8], torso: 11, farFoot: planted(9) }),
];
