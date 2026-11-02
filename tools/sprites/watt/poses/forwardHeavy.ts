import { onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * forwardHeavy (Coup de pilon, → + H): 8 frames, 4, 6, 6, 6, [3], 5, 5, 6 ticks (41), active
 * frame 4 (ticks 22-24), hitbox x 12..46 / y 36..76, an overhead; the game moves him 12 px on
 * ticks 6-18. The fist rises high behind the bulb and holds there, well telegraphed, then falls
 * straight down over the guard. The Coup de masse (L, L, → + H, hitbox x 10..42) plays frames
 * 2-7 of it from the fist already high (clips.ts).
 */

export const POSES: readonly Pose[] = [
  // 0: the load, the fist drawn down and back.
  keyPose({ hip: [-9.5, 36.5], torso: 9, far: [9, 45], face: 'effort' }),
  // 1-3: the fist up behind the bulb, held, the body leaning back under it.
  keyPose({ hip: [-10, 38], torso: 0, far: [-3, 82], face: 'effort' }),
  keyPose({ hip: [-10, 38.5], torso: -3, far: [-4, 87], face: 'effort' }),
  keyPose({ hip: [-9, 38.5], torso: -1, far: [-1, 87], face: 'effort' }),
  // 4 (active): straight down over the guard, the lead boot stamping in.
  keyPose({
    hip: [-1, 35.5],
    torso: 26,
    reach: { far: 4 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -30),
    far: [34, 62],
    face: 'kiai',
    effects: [smear(3.5, [8, 90], [26, 82], [35, 62])],
  }),
  // 5-6: sunk through, the fist low in front.
  keyPose({
    hip: [-1, 35],
    torso: 28,
    reach: { far: 4 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -30),
    far: [35, 50],
    face: 'effort',
  }),
  keyPose({
    hip: [-2.5, 35.5],
    torso: 24,
    reach: { far: 2 },
    farFoot: planted(11),
    far: [28, 48],
  }),
  // 7: back toward the guard.
  keyPose({ hip: [-6, 36.8], torso: 15, farFoot: planted(9), far: [14, 50] }),
];
