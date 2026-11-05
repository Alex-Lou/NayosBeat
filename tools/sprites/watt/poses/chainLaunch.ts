import { at, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * chainLaunch (Soulevé, L, L, ← + H): 8 frames, 2, 3, 3, [4], 4, 5, 5, 4 ticks (30), active frame 3
 * (ticks 8-11), hitbox x 4..34 / y 58..104, the launcher of his string; the game steps him 10 px
 * on ticks 0-6.
 */

export const POSES: readonly Pose[] = [
  // 0: down low, both clamps open, scooping in with an electric charge.
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
    effects: [{ kind: 'energy', center: at(16, 32), radius: 2.5 }],
  }),
  // 1-2: under the body, then lifting with an upward arc.
  keyPose({
    hip: [-5, 34],
    torso: 16,
    farFoot: planted(11),
    near: [14, 46],
    far: [20, 46],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
    effects: [{ kind: 'arc', from: at(12, 34), to: at(20, 48), spread: 2.5 }],
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
    effects: [
      smear(3, [18, 46], [20, 60], [20, 74]),
      { kind: 'arc', from: at(14, 48), to: at(22, 76), spread: 3.5 },
    ],
  }),
  // 3 (active): up onto his shoulders, the clamps high and in front with a Tesla plasma burst.
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
    effects: [
      smear(3, [20, 74], [24, 88], [25, 101]),
      { kind: 'plasma', center: at(23, 88), radius: 5.5, tone: 'sound' },
      { kind: 'arc', from: at(16, 66), to: at(26, 101), spread: 4 },
      { kind: 'shards', center: at(24, 90), radius: 8, progress: 0.25, tone: 'strike' },
    ],
    glows: [{ center: at(23, 86), reach: 28, power: 1.15, tone: 'sound' }],
  }),
  // 4-7: coming down, back into the guard.
  keyPose({
    hip: [-4.5, 41],
    torso: 1,
    farFoot: planted(10.5),
    near: [15, 81],
    far: [21, 82],
    effects: [{ kind: 'arc', from: at(14, 74), to: at(22, 88), spread: 2.5 }],
  }),
  keyPose({ hip: [-6, 39.5], torso: 3, farFoot: planted(10), near: [10, 78], far: [16, 79] }),
  keyPose({ hip: [-7.5, 38], torso: 6, farFoot: planted(9), near: [5, 68], far: [11, 70] }),
  keyPose({ hip: [-8.8, 37.5], torso: 7.5 }),
];
