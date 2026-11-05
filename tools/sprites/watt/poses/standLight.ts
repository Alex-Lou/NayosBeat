import { at, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * standLight (Paume, docs/watt.md §5.1): 6 frames, 1, 3, [2], 3, 3, 3 ticks (15), active frame 2
 * (ticks 4-5), hitbox x 8..32 / y 40..54. The lead clamp opens and shoves, palm flat, at belly
 * height with a crackling electric arc.
 */

export const POSES: readonly Pose[] = [
  // 0: the clamp opening, drawn in a little.
  keyPose({ hip: [-8.5, 37.3], torso: 9.5, far: [8, 51], farHand: 'open' }),
  // 1: the shove going out, the shoulder rolling in.
  keyPose({
    hip: [-6.5, 37],
    torso: 14,
    reach: { far: 2 },
    far: [19, 48.5],
    farHand: 'open',
    face: 'effort',
    effects: [{ kind: 'energy', center: at(21, 48.5), radius: 2 }],
  }),
  // 2 (active): the palm flat at the end of the shove, electric arc off the open clamp.
  keyPose({
    hip: [-5, 36.8],
    torso: 17,
    reach: { far: 3 },
    far: [28, 47.5],
    farHand: 'open',
    face: 'effort',
    effects: [
      smear(2.5, [12, 49], [20, 48], [28, 47.5]),
      { kind: 'arc', from: at(14, 49), to: at(31, 47.5), spread: 2.5 },
      { kind: 'flash', center: at(30, 47.5), radius: 3.2, tone: 'sound' },
    ],
    glows: [{ center: at(28, 47.5), reach: 20, power: 0.85, tone: 'sound' }],
  }),
  // 3-5: drawn back into the guard.
  keyPose({
    hip: [-6, 36.9],
    torso: 14.5,
    reach: { far: 2 },
    far: [22, 48.5],
    farHand: 'open',
    effects: [{ kind: 'arc', from: at(12, 49), to: at(23, 48.5), spread: 1.8 }],
  }),
  keyPose({ hip: [-7.2, 37.2], torso: 11.5, reach: { far: 1 }, far: [14, 50.5], farHand: 'open' }),
  keyPose({ hip: [-8.3, 37.4], torso: 9.5, far: [9, 52] }),
];
