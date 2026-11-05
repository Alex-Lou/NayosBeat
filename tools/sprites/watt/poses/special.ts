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
  // 0-1: both clamps drawn back to the chest, the weight gathering, green sparks on the coils.
  keyPose({
    hip: [-9, 36.5],
    torso: 10,
    nearOff: [0, -2],
    farOff: [1, -2],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(6, 50), radius: 2.2 }],
  }),
  keyPose({
    hip: [-8.5, 36],
    torso: 12,
    nearOff: [0, -3],
    farOff: [1, -3],
    face: 'effort',
    effects: [{ kind: 'arc', from: at(-1, 50), to: at(8, 50), spread: 2.2 }],
  }),
  // 2-3: the step, the clamps going out.
  keyPose({
    hip: [-6, 36],
    torso: 16,
    farFoot: planted(10),
    nearFoot: onBall(-16, -28),
    near: [10, 48],
    far: [16, 47],
    face: 'effort',
    effects: [{ kind: 'arc', from: at(10, 48), to: at(18, 47), spread: 2.5 }],
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
    effects: [{ kind: 'arc', from: at(18, 48), to: at(28, 46), spread: 3 }],
  }),
  // 4 (active): both clamps out, the high-voltage Tesla plasma discharge.
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
      { kind: 'plasma', center: at(39, 46), radius: 6, tone: 'sound' },
      { kind: 'arc', from: at(18, 52), to: at(43, 46), spread: 4.5 },
      { kind: 'arc', from: at(22, 42), to: at(41, 51), spread: 3.5 },
      { kind: 'flash', center: at(39, 46), radius: 4.5, tone: 'sound' },
      { kind: 'ring', center: at(39, 46), radius: 11, progress: 0.2, tone: 'sound' },
      { kind: 'energy', center: at(36, 52), radius: 2.5 },
    ],
    glows: [{ center: at(38, 46), reach: 32, power: 1.3, tone: 'sound' }],
  }),
  // 5-9: shockwave ring expanding, afterglow arcs, then back into the guard.
  keyPose({
    hip: [-1.2, 35],
    torso: 23.5,
    reach: { near: 2.5, far: 3.5 },
    farFoot: planted(13),
    nearFoot: onBall(-14, -32),
    near: [28, 46.5],
    far: [34, 44.5],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      { kind: 'ring', center: at(40, 46), radius: 16, progress: 0.55, tone: 'sound' },
      { kind: 'arc', from: at(24, 47), to: at(40, 45), spread: 3 },
      { kind: 'shards', center: at(39, 46), radius: 9, progress: 0.35, tone: 'sound' },
    ],
    glows: [{ center: at(36, 46), reach: 24, power: 0.9, tone: 'sound' }],
  }),
  keyPose({
    hip: [-2, 35.2],
    torso: 21,
    reach: { near: 2, far: 2.5 },
    farFoot: planted(12.5),
    nearFoot: onBall(-15, -30),
    near: [24, 47],
    far: [30, 45.5],
    nearHand: 'open',
    farHand: 'open',
    effects: [{ kind: 'arc', from: at(20, 47), to: at(31, 45.5), spread: 2 }],
  }),
  keyPose({
    hip: [-4, 35.8],
    torso: 18,
    farFoot: planted(11.5),
    near: [17, 48.5],
    far: [23, 47.5],
  }),
  keyPose({ hip: [-6, 36.4], torso: 14, farFoot: planted(10), near: [10, 50], far: [16, 49.5] }),
  keyPose({ hip: [-7.5, 36.8], torso: 11, farFoot: planted(9) }),
];
