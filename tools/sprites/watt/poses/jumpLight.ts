import { at, smear, type Foot, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * jumpLight (Coude plongeant, in the air L): 6 frames, 2, 3, [6], 3, 3, 2 ticks (19), active frame
 * 2 (ticks 5-10), hitbox x 4..30 / y 6..24, an overhead.
 */

/** A boot in the air, its ankle at (x, y), the toe `angle` degrees (down: negative). */
const air = (x: number, y: number, angle: number): Foot => ({ x, y, angle });
const BENDS = { farKnee: 'front', farElbow: 'down' } as const;

export const POSES: readonly Pose[] = [
  // 0-1: tipping forward, the lead knee coming up, the elbow raised.
  keyPose({
    nearFoot: air(-17, 19, -34),
    farFoot: air(4, 20, -16),
    hip: [-9, 38],
    torso: 14,
    farOff: [1, 3],
    bends: BENDS,
    face: 'effort',
  }),
  keyPose({
    nearFoot: air(-14, 17, -38),
    farFoot: air(12, 16, -20),
    hip: [-6, 35],
    torso: 22,
    far: [15, 50],
    bends: BENDS,
    face: 'effort',
    effects: [{ kind: 'energy', center: at(16, 44), radius: 2.2 }],
  }),
  // 2 (active): the knee and the boot out in front, low, the elbow down onto the knee.
  keyPose({
    nearFoot: air(-12, 15, -40),
    farFoot: air(19, 12, -22),
    hip: [-4, 32],
    torso: 30,
    far: [18, 42],
    bends: BENDS,
    face: 'kiai',
    effects: [
      smear(3, [14, 30], [20, 22], [26, 16]),
      { kind: 'arc', from: at(14, 36), to: at(28, 14), spread: 3 },
      { kind: 'flash', center: at(26, 16), radius: 3.5, tone: 'sound' },
    ],
    glows: [{ center: at(24, 18), reach: 22, power: 0.9, tone: 'sound' }],
  }),
  // 3-5: righting himself for the landing.
  keyPose({
    nearFoot: air(-14, 15, -36),
    farFoot: air(14, 13, -18),
    hip: [-5, 34],
    torso: 24,
    far: [14, 46],
    bends: BENDS,
  }),
  keyPose({
    nearFoot: air(-16, 13, -30),
    farFoot: air(8, 12, -14),
    hip: [-7, 36],
    torso: 16,
    far: [10, 50],
    bends: BENDS,
  }),
  keyPose({
    nearFoot: air(-18, 9, -26),
    farFoot: air(4, 8, -8),
    hip: [-9, 38],
    torso: 10,
    bends: BENDS,
  }),
];
