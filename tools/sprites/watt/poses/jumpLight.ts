import { smear, type Foot, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * jumpLight (Coude plongeant, in the air L): 5 frames, 2, 3, [6], 4, 4 ticks (19), active frame
 * 2 (ticks 5-10), hitbox x 4..30 / y 6..24, an overhead. He drops on the opponent knee and elbow
 * together: the lead knee driven out in front, low, the torso tipped over it, the lead elbow
 * folded and driven down onto the knee. The game lifts him: the box is at the height of his
 * tucked boots in the cell, where the knee and the lead boot strike; the elbow comes down over
 * them.
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
    effects: [smear(3, [14, 30], [20, 22], [26, 16])],
  }),
  // 3-4: righting himself for the landing.
  keyPose({
    nearFoot: air(-15, 14, -32),
    farFoot: air(10, 14, -16),
    hip: [-6, 35],
    torso: 20,
    far: [11, 50],
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
