import { at, planted, type Pose } from './common.ts';

/**
 * jump: 6 frames. Frame 0 is the preJump crouch (4 ticks); frames 1-4 are the air (rise 7, rise
 * 9, apex 10, fall 12 then held until landing); frame 5 is the landing (3 ticks). The back jump
 * plays it too; the forward jump flips (jumpForward.ts) and falls into the same FALL pose.
 *
 * Squash, stretch, tuck, reach, squash. The Philly shell never breaks: the rear fist stays by
 * the jaw, the lead shoulder rolled up, the lead arm low and loose; it swings up a little on the
 * takeoff, rests on the knee at the top and drifts out for balance on the way down. In the air
 * the hips sit lower as the legs come up (the body's center stays on the jump's arc), close to
 * the air attacks' airborne guard so a jumpLight / jumpHeavy can start from any of these frames.
 */

// 0 · Load (preJump): from the guard, a deep knee bend, hips back, chest over the knees, chin
// down on the target, rear heel up on the ball of the foot.
const LOAD: Pose = {
  hip: at(-6, 29),
  torso: 20,
  head: -4,
  shrug: 4.2,
  twist: -0.15,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -20),
  nearFist: at(6, 36),
  farFist: at(9, 55),
};

// 1 · Takeoff: the stretch. Legs driven long, toes pointed, chest up, the lead hand swinging up.
const RISE: Pose = {
  hip: at(-2.5, 43),
  torso: -6,
  head: 6,
  shrug: 3.4,
  twist: 0.1,
  nearFoot: { x: 2.5, y: 11, angle: -55 },
  farFoot: { x: -7.5, y: 8, angle: -68 },
  nearFist: at(9, 56),
  farFist: at(5.5, 70),
};

// 2 · The knees come up, the chest starts to curl over them.
const GATHER: Pose = {
  hip: at(-2, 41),
  torso: 6,
  head: 6,
  shrug: 3.4,
  nearFoot: { x: 3, y: 22.5, angle: -55 },
  farFoot: { x: -7, y: 20.5, angle: -55 },
  nearFist: at(9, 50.5),
  farFist: at(8, 66.5),
};

// 3 · Apex: a compact tuck, both knees high, boots under them; the lead forearm rests on the
// knee, the shoulder rolled up to the chin.
const TUCK: Pose = {
  hip: at(-2, 38.5),
  torso: 14,
  head: 4,
  shrug: 4,
  nearFoot: { x: 5, y: 33.5, angle: -45 },
  farFoot: { x: 5, y: 28.5, angle: -55 },
  nearFist: at(16, 51.5),
  farFist: at(10, 62.5),
};

/**
 * 4 · Fall (held until landing): the legs reach down for the floor, the lead foot forward and
 * flat, the rear one behind on its toes, already in stance; the lead hand out for balance. Also
 * the last frame of the forward flip.
 */
export const FALL: Pose = {
  hip: at(-2.5, 36.5),
  torso: 2,
  head: 8,
  shrug: 3.2,
  nearFoot: { x: 6, y: 6.5, angle: 5 },
  farFoot: { x: -12, y: 9.5, angle: -25 },
  nearFist: at(10, 45.5),
  farFist: at(8, 61.5),
};

// 5 · Landing: the squash, feet planted where the guard has them, dust puffing out on both
// sides. Shallow enough to spring back into the guard without a pop.
const LAND: Pose = {
  hip: at(-4.6, 30),
  torso: 13,
  head: 0,
  shrug: 4,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -6),
  nearFist: at(7.5, 36),
  farFist: at(8.5, 55),
  effects: [
    { kind: 'dust', x: 14, size: 4.5, progress: 0.25 },
    { kind: 'dust', x: -21, size: 4, progress: 0.25 },
  ],
};

export const POSES: readonly Pose[] = [LOAD, RISE, GATHER, TUCK, FALL, LAND];
