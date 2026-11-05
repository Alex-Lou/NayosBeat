import { at, CROUCHED, onBall, planted, type Pose, smear } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * crouchLight (Paume basse, ↓ + L): 6 frames, 2, 3, [2], 3, 3, 3 ticks (16), active frame 2 (ticks
 * 5-6), hitbox x 8..36 / y 2..14, a low blow. From the crouch, the lead clamp slaps flat along
 * the floor in front of him with a low electric arc.
 */

export const POSES: readonly Pose[] = [
  // 0: the clamp drawn in under the chest, opening.
  keyPose({ ...CROUCHED, torso: 14, far: [8, 34], farHand: 'open' }),
  // 1: going out low, the torso folding over.
  keyPose({
    ...CROUCHED,
    hip: [-8, 24],
    torso: 34,
    reach: { far: 2 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -45),
    far: [18, 16],
    farHand: 'open',
    face: 'effort',
    effects: [{ kind: 'energy', center: at(20, 15), radius: 2 }],
  }),
  // 2 (active): the palm flat along the floor, electric arc skimming the concrete.
  keyPose({
    ...CROUCHED,
    hip: [-5, 22],
    torso: 46,
    reach: { far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-8, -55),
    far: [29, 8],
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(2, [14, 12], [22, 9], [29, 8]),
      { kind: 'arc', from: at(14, 12), to: at(34, 7), spread: 2.5 },
      { kind: 'flash', center: at(32, 8), radius: 3.2, tone: 'sound' },
    ],
    glows: [{ center: at(30, 8), reach: 20, power: 0.9, tone: 'sound' }],
  }),
  // 3-5: back into the crouch.
  keyPose({
    ...CROUCHED,
    hip: [-7, 23.5],
    torso: 36,
    reach: { far: 2.5 },
    farFoot: planted(13),
    nearFoot: onBall(-12, -48),
    far: [22, 12],
    farHand: 'open',
  }),
  keyPose({
    ...CROUCHED,
    hip: [-9.5, 24],
    torso: 24,
    reach: { far: 1 },
    farFoot: planted(11),
    nearFoot: onBall(-16, -36),
    far: [14, 22],
    farHand: 'open',
  }),
  keyPose({ ...CROUCHED, torso: 11, far: [6, 35] }),
];
