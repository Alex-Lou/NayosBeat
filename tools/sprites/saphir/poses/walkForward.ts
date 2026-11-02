import { at, behindBack, GUARD, onBall, planted, raised, type Foot, type Pose } from './common.ts';

/**
 * walkForward: 10 frames of 2 ticks, looping (20 ticks, 32 px at her 1.6 px/tick). The glide of
 * the savate: two chase steps a loop, the lead foot reaching out on its ball, the rear one
 * gliding up after it, never crossing; the hands stay at her back, the head level. Nothing like
 * Nayo's march or Riff's toprock: she slides.
 *
 * The feet are placed on the stage and drawn in the cell: a planted foot slides back 3.2 px a
 * frame in the cell while the game carries her forward over it, so it never slides on the floor
 * (the lead foot keeps its ball on one floor pixel). Each foot steps 16 px twice a loop:
 *
 * - the lead foot lifts after frame 0 and lands on its ball on frame 3, then again 6 to 8;
 * - the rear foot lifts on frame 4 and lands flat on frame 5, then again on frame 9 (it lands on
 *   next loop's frame 0).
 *
 * The stance opens from the guard's 24 px to 40 and closes again: the hips dip a little as it
 * opens, the torso leaning a hair into the step.
 */

/** How far a planted foot slides back in the cell each frame (1.6 px/tick, 2 ticks). */
const SLIDE = 3.2;
/** The heel of the lead foot, up, as in the guard. */
const LEAD_HEEL = -30;

/** The lead foot's ball on the stage at a frame where it is down. */
const LEAD_STAGE: Readonly<Record<number, number>> = {
  0: 10,
  3: 26,
  4: 26,
  5: 26,
  8: 42,
  9: 42,
};
/** The rear ankle on the stage at a frame where it is down. */
const REAR_STAGE: Readonly<Record<number, number>> = {
  0: -14,
  1: -14,
  2: -14,
  3: -14,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
};

/** A foot in the air at `frame`, `t` of the way from `from` to `to` on the stage. */
function swinging(frame: number, from: number, to: number, t: number, lift: number): Foot {
  return raised(from + (to - from) * t - SLIDE * frame, planted(0).y + lift, -22);
}

function lead(frame: number): Foot {
  const down = LEAD_STAGE[frame];
  if (down !== undefined) return onBall(down - SLIDE * frame, LEAD_HEEL);
  if (frame <= 2) return swinging(frame, 10, 26, frame / 3, frame === 1 ? 3 : 2.5);
  return swinging(frame, 26, 42, (frame - 5) / 3, frame === 6 ? 3 : 2.5);
}

function rear(frame: number): Foot {
  const down = REAR_STAGE[frame];
  if (down !== undefined) return planted(down - SLIDE * frame);
  if (frame === 4) return swinging(frame, -14, 2, 0.5, 3);
  return swinging(frame, 2, 18, 0.5, 3);
}

/** Hip height and lean by frame: low when the stance is open (frames 3 and 8). */
const HIP_Y = [34, 33.5, 33, 32, 33, 34, 33.5, 33, 32, 33];
const LEAN = [2, 3, 4, 4, 3, 2, 3, 4, 4, 3];

export const POSES: readonly Pose[] = Array.from({ length: 10 }, (_, frame) =>
  behindBack({
    ...GUARD,
    hip: at(-3, HIP_Y[frame] ?? 34),
    torso: LEAN[frame] ?? 2,
    nearFoot: lead(frame),
    farFoot: rear(frame),
  }),
);
