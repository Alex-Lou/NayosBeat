import { at, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * chainLight (Crochet court, L, L): 7 frames, 2, 2, 2, [3], 4, 4, 4 ticks (21), active frame 3
 * (ticks 6-8), hitbox x 8..36 / y 42..58; the game steps him 8 px on ticks 0-6. A short hook of
 * the rear clamp with a curved lightning arc.
 */

export const POSES: readonly Pose[] = [
  // 0-1: the rear clamp cocked by the jaw, the shoulders turning away.
  keyPose({ hip: [-7.5, 37.2], torso: 11, twist: 0.15, near: [2, 56], far: [11, 48] }),
  keyPose({
    hip: [-6.5, 37],
    torso: 13.5,
    twist: 0.35,
    near: [8, 55.5],
    far: [14, 47],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(10, 55.5), radius: 2.2 }],
  }),
  // 2: the hook coming round.
  keyPose({
    hip: [-5.5, 37],
    torso: 16,
    twist: 0.55,
    reach: { near: 2 },
    near: [18, 53.5],
    far: [17, 46],
    face: 'effort',
    effects: [{ kind: 'arc', from: at(8, 55), to: at(20, 53), spread: 2.5 }],
  }),
  // 3 (active): the hook landing, the rear shoulder through.
  keyPose({
    hip: [-4.5, 36.8],
    torso: 18,
    twist: 0.75,
    reach: { near: 6 },
    near: [28, 50],
    far: [21, 45],
    face: 'kiai',
    effects: [
      smear(2.5, [10, 55], [20, 53], [28, 50]),
      { kind: 'arc', from: at(12, 55), to: at(34, 49), spread: 3.5 },
      { kind: 'flash', center: at(32, 50), radius: 3.8, tone: 'strike' },
    ],
    glows: [{ center: at(30, 50), reach: 24, power: 1.0, tone: 'strike' }],
  }),
  // 4-6: back into the guard.
  keyPose({ hip: [-5.5, 37], torso: 15, twist: 0.6, reach: { near: 1.5 }, near: [19, 51] }),
  keyPose({ hip: [-7, 37.2], torso: 12, twist: 0.45, near: [9, 52] }),
  keyPose({ hip: [-8.5, 37.4], torso: 9, twist: 0.38 }),
];
