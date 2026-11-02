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
export const CROUCH: Pose = behindBack({
  ...GUARD,
  hip: at(-4, 19.5),
  torso: 26,
  head: -14,
  nearFoot: onBall(12, -34),
  farFoot: onBall(-9, -58),
});

function sinking(t: number): Pose {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return behindBack({
    ...GUARD,
    hip: at(mix(GUARD.hip.x, CROUCH.hip.x), mix(GUARD.hip.y, CROUCH.hip.y)),
    torso: mix(GUARD.torso, CROUCH.torso),
    head: mix(GUARD.head, CROUCH.head),
    nearFoot: onBall(mix(10, 12), -30 - 4 * t),
    farFoot: t < 0.5 ? planted(-14, -80 * t) : onBall(-14 + 5 * t, -58 * t),
  });
}

const BREATH = behindBack({ ...CROUCH, hip: at(CROUCH.hip.x, CROUCH.hip.y + 0.5) });

export const POSES: readonly Pose[] = [
  sinking(0.35),
  sinking(0.7),
  sinking(0.92),
  CROUCH,
  BREATH,
  CROUCH,
];
