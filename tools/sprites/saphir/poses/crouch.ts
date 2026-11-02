import { at, behindBack, GUARD, onBall, planted, type Pose } from './common.ts';

/**
 * crouch: 6 frames, 2, 2, 2 ticks going down, then 8, 8, 8 looping from frame 3. She sinks low
 * on her rear leg like a dancer into a plié, the rear heel rising off the floor, the lead foot
 * still on its ball in front, the torso leaning over the lead knee, the hands still at her back,
 * the mask level and watching. Low enough for her crouching pushbox (48 px): the crown of the
 * mask about 50 px up.
 *
 * - 0-2: the sink, the hips going down and back, the torso folding forward.
 * - 3-5: held low, breathing: the hips half a pixel up and down.
 */

/** The crouch her low moves, falls and dashes start from. */
export const CROUCH: Pose = behindBack({
  ...GUARD,
  hip: at(-4, 19.5),
  torso: 26,
  head: -14,
  nearFoot: onBall(12, -34),
  farFoot: onBall(-9, -58),
});

/**
 * The crouch as she holds it: CROUCH 3.5 px back, the lead knee no farther forward than her toes
 * in guard, so her crouching hurtbox can follow it (docs/combat-v2.md §9.1-9.2: a box past the
 * toes lets a low blow hit thin air).
 */
export const CROUCH_HELD: Pose = behindBack({
  ...CROUCH,
  hip: at(CROUCH.hip.x - 3.5, CROUCH.hip.y),
  torso: 32,
  nearFoot: onBall(8.5, -34),
  farFoot: onBall(-12.5, -58),
});

function sinking(t: number): Pose {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return behindBack({
    ...GUARD,
    hip: at(mix(GUARD.hip.x, CROUCH_HELD.hip.x), mix(GUARD.hip.y, CROUCH_HELD.hip.y)),
    torso: mix(GUARD.torso, CROUCH_HELD.torso),
    head: mix(GUARD.head, CROUCH_HELD.head),
    nearFoot: onBall(mix(10, 8.5), -30 - 4 * t),
    farFoot: t < 0.5 ? planted(-14, -80 * t) : onBall(-14 + 1.5 * t, -58 * t),
  });
}

const BREATH = behindBack({ ...CROUCH_HELD, hip: at(CROUCH_HELD.hip.x, CROUCH_HELD.hip.y + 0.5) });

export const POSES: readonly Pose[] = [
  sinking(0.35),
  sinking(0.7),
  sinking(0.92),
  CROUCH_HELD,
  BREATH,
  CROUCH_HELD,
];
