import { at, fistsOnShoulders, GUARD, type Foot, type Pose } from './common.ts';
import { FALL, LOAD } from './jump.ts';

export const ANIMATED: boolean = true;

/**
 * jumpForward: 7 frames. Frame 0 is the pre-jump (5 ticks), the jump's load; frames 1-6 the air
 * (5, 5, 5, 6, 6, 6 ticks, the last held until he lands), 54 px forward. No flip: the colosse
 * throws his mass forward and up behind his lead knee, the chest over it, the clamps out in front;
 * over the top the rear leg comes through under him and the torso rights itself; he comes down on
 * the jump's FALL, the lead boot reaching for the floor. The landing is the jump's.
 */

const HEAD = GUARD.torso + GUARD.head;

/** A boot in the air, its ankle at (x, y), the toe `angle` degrees (down: negative). */
function air(x: number, y: number, angle: number): Foot {
  return { x, y, angle };
}

/**
 * `pose` with the bulb kept upright over the collar and the clamps held from the shoulders as
 * in the guard; its `nearFist` and `farFist` move them from there (world px).
 */
function upright(pose: Pose): Pose {
  return fistsOnShoulders({ ...pose, head: HEAD - pose.torso }, pose.nearFist, pose.farFist);
}

const BENDS = { ...GUARD.bends, farKnee: 'front' } as const;

// 1: the takeoff, the rear leg long behind, the lead knee driving up, the chest over it.
const LAUNCH: Pose = upright({
  ...GUARD,
  hip: at(-8, 40),
  torso: 16,
  shrug: 2.6,
  nearFoot: air(-20, 8, -50),
  farFoot: air(2, 17, -30),
  nearFist: at(1.5, 0),
  farFist: at(2, 0),
  bends: BENDS,
  effects: [{ kind: 'dust', x: -14, size: 1.2, progress: 0.6 }],
});

// 2: driving forward, the lead knee high, the rear boot trailing.
const DRIVE: Pose = upright({
  ...GUARD,
  hip: at(-8, 40.5),
  torso: 15,
  shrug: 2.8,
  nearFoot: air(-19, 12, -42),
  farFoot: air(3, 21, -22),
  nearFist: at(1.5, 0),
  farFist: at(2, 0),
  bends: BENDS,
});

// 3-4: over the top, the rear leg coming through under him, the torso righting itself.
const OVER: Pose = upright({
  ...GUARD,
  hip: at(-9, 40.5),
  torso: 11,
  shrug: 2.8,
  nearFoot: air(-15, 17, -28),
  farFoot: air(2.5, 21, -16),
  nearFist: at(0.5, 0),
  farFist: at(0.5, 0),
  bends: BENDS,
});

const PAST: Pose = upright({
  ...GUARD,
  hip: at(-9, 40),
  torso: 9,
  shrug: 2.7,
  nearFoot: air(-16, 13, -26),
  farFoot: air(3.5, 15, -12),
  nearFist: at(0, 0.5),
  farFist: at(0, 0.5),
  bends: BENDS,
});

export const POSES: readonly Pose[] = [LOAD, LAUNCH, DRIVE, OVER, PAST, FALL, FALL];
