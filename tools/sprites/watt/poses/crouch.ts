import { at, GUARD, onBall, planted, springAnkle, tween, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * crouch: 6 frames, 2, 2, 2 ticks down, then 8, 8, 8 looping from frame 3. A colosse dropping
 * his weight: the hips sink straight down between the feet, the knees open, the torso leans in
 * over them, the clamps come down in front of the chest; the bulb stays upright over the collar.
 * The drop overshoots a pixel and settles; held, he breathes, the hips rising and sinking a hair.
 *
 * Inside his crouching pushbox (32 px: nothing above the shins past x = 17, the feet past 20,
 * tests/tools/watt-sprites.test.ts), under his crouching hurtbox (60 px high).
 */

/** The crouch held: the hips low between the feet, the torso leaning in over the knees. */
const CROUCH: Pose = springAnkle({
  ...GUARD,
  hip: at(-11.5, 26),
  torso: 11,
  head: GUARD.torso + GUARD.head - 11,
  shrug: 3.6,
  nearFoot: onBall(-20, -24),
  farFoot: planted(8.5, 0),
  nearFist: at(-3, 41),
  farFist: at(5, 40),
});

/** The crouch with its hips `dy` from the held one, the clamps riding them. */
function sunk(dy: number): Pose {
  return springAnkle({
    ...CROUCH,
    hip: at(CROUCH.hip.x, CROUCH.hip.y + dy),
    nearFist: at(CROUCH.nearFist.x, CROUCH.nearFist.y + dy),
    farFist: at(CROUCH.farFist.x, CROUCH.farFist.y + dy),
  });
}

export const POSES: readonly Pose[] = [
  // 0: dropping, half way.
  springAnkle(tween(GUARD, CROUCH, 0.55)),
  // 1: the overshoot, a pixel under the held crouch.
  sunk(-1.2),
  // 2: settling.
  sunk(-0.3),
  // 3-5: held, breathing: the hips up a hair, then back down.
  CROUCH,
  sunk(0.5),
  sunk(0.2),
];
