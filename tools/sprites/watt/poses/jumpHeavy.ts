import { smear, type Foot, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * jumpHeavy (Plaquage, in the air H): 6 frames, 4, 4, [6], 4, 4, 4 ticks (26), active frame 2
 * (ticks 8-13), hitbox x 0..34 / y -4..20, an overhead. The whole body comes down on the
 * opponent, arms open: he spreads out over the top, then tips forward and drops on him, both
 * clamps open and reaching down in front, the knees tucked under. The box is about his soles in
 * the cell: the clamps come down there.
 */

const air = (x: number, y: number, angle: number): Foot => ({ x, y, angle });
const BENDS = { farKnee: 'front' } as const;
const TUCKED = { nearFoot: air(-12, 12, -52), farFoot: air(6, 13, -14) } as const;

export const POSES: readonly Pose[] = [
  // 0-1: spreading out over the top, the arms opening.
  keyPose({
    nearFoot: air(-17, 19, -34),
    farFoot: air(1.5, 22, -12),
    hip: [-9, 39],
    torso: 4,
    near: [-6, 60],
    far: [14, 62],
    nearHand: 'open',
    farHand: 'open',
    bends: BENDS,
    face: 'effort',
  }),
  keyPose({
    ...TUCKED,
    hip: [-6, 32],
    torso: 30,
    near: [8, 44],
    far: [20, 44],
    nearHand: 'open',
    farHand: 'open',
    bends: BENDS,
    face: 'effort',
  }),
  // 2 (active): tipped forward, both clamps open, reaching down in front.
  keyPose({
    ...TUCKED,
    hip: [-3, 26],
    torso: 50,
    reach: { near: 3, far: 3 },
    near: [18, 18],
    far: [26, 16],
    nearHand: 'open',
    farHand: 'open',
    bends: BENDS,
    face: 'kiai',
    effects: [smear(3.5, [24, 36], [28, 24], [30, 12])],
  }),
  // 3-5: righting himself for the landing.
  keyPose({ ...TUCKED, hip: [-6, 31], torso: 32, near: [8, 32], far: [16, 30], bends: BENDS }),
  keyPose({
    nearFoot: air(-17, 12, -30),
    farFoot: air(2, 12, -14),
    hip: [-8, 36],
    torso: 16,
    bends: BENDS,
  }),
  keyPose({
    nearFoot: air(-18, 8, -26),
    farFoot: air(4, 7, -6),
    hip: [-9, 39],
    torso: 8,
    bends: BENDS,
  }),
];
