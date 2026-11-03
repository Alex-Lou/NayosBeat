import { GUARD, lifted, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * forwardLight (Pas lourd, → + L): 6 frames, 3, 3, 3, [2], 5, 6 ticks (22), active frame 3
 * (ticks 9-10), hitbox x 8..34 / y 40..54; the game moves him 14 px on ticks 0-9. One heavy
 * step in, the lead boot lifted and stamped down, then the Paume off it.
 */

export const POSES: readonly Pose[] = [
  // 0: the lead boot up.
  keyPose({
    hip: [-8, 38],
    torso: 10,
    farFoot: lifted(planted(9, 4), 2.5),
    farOff: [-0.5, 0.5],
  }),
  // 1: stamped down, the rear boot pushing.
  keyPose({
    hip: [-7, 37],
    torso: 12,
    farFoot: planted(GUARD.farFoot.x),
    nearFoot: onBall(-16, -24),
    effects: [{ kind: 'dust', x: 10, size: 1, progress: 0.3 }],
  }),
  // 2: the clamp opening.
  keyPose({ hip: [-6.5, 37], torso: 13, far: [12, 50], farHand: 'open', face: 'effort' }),
  // 3 (active): the Paume.
  keyPose({
    hip: [-5, 36.8],
    torso: 17,
    reach: { far: 3 },
    far: [27, 47.5],
    farHand: 'open',
    face: 'effort',
    effects: [smear(2.5, [12, 49], [20, 48], [27, 47.5])],
  }),
  // 4-5: back into the guard.
  keyPose({ hip: [-6.5, 37], torso: 13, reach: { far: 1.5 }, far: [17, 49.5], farHand: 'open' }),
  keyPose({ hip: [-8.3, 37.4], torso: 9.5, far: [9, 52] }),
];
