import { at, onBall, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * backHeavy (Arraché, ← + H): 8 frames, 2, 3, 3, [4], 4, 5, 5, 4 ticks (30), active frame 3 (ticks
 * 8-11), hitbox x 2..32 / y 58..104, an anti-air without invincibility and a launcher.
 */

export const POSES: readonly Pose[] = [
  // 0: the dip, both clamps low, charging green energy.
  keyPose({
    hip: [-9, 34],
    torso: 12,
    nearOff: [0, -6],
    farOff: [0, -6],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(6, 46), radius: 2.5 }],
  }),
  // 1-2: rising, the arms going up with crackling arcs.
  keyPose({
    hip: [-8, 39],
    torso: 4,
    near: [2, 66],
    far: [8, 68],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
    effects: [{ kind: 'arc', from: at(2, 52), to: at(8, 68), spread: 2.5 }],
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
    effects: [
      smear(2.5, [8, 68], [11, 78], [13, 86]),
      { kind: 'arc', from: at(6, 64), to: at(15, 86), spread: 3.5 },
    ],
  }),
  // 3 (active): the snatch at its top, on the toes, the clamps open above with a rising plasma column.
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
    effects: [
      smear(3, [16, 86], [22, 96], [25, 102]),
      { kind: 'column', base: at(20, 48), height: 54, width: 12, progress: 0.25 },
      { kind: 'arc', from: at(14, 62), to: at(25, 101), spread: 4 },
      { kind: 'flash', center: at(22, 92), radius: 4.2, tone: 'sound' },
    ],
    glows: [{ center: at(20, 86), reach: 28, power: 1.15, tone: 'sound' }],
  }),
  // 4-7: coming down, back into the guard.
  keyPose({
    hip: [-6.5, 41],
    torso: -2,
    near: [12, 82],
    far: [19, 83],
    face: 'effort',
    effects: [{ kind: 'arc', from: at(12, 74), to: at(20, 90), spread: 2.5 }],
  }),
  keyPose({ hip: [-7, 40], torso: 1, near: [9, 78], far: [15, 80], face: 'effort' }),
  keyPose({ hip: [-8, 38], torso: 5, near: [4, 66], far: [10, 68] }),
  keyPose({ hip: [-8.8, 37.5], torso: 7.5 }),
];
