import { solve } from '../../skeleton.ts';
import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 10 frames of 6 ticks, looping (one second). The Philly shell breathing: the weight
 * rocks onto the back leg and returns (once a loop), dipping on the knees each time it passes
 * between the legs (twice a loop, a light boxer's bounce on the beat); the lead shoulder rolls
 * up to the chin as he sits back, the rear fist ticks the beat by the jaw.
 *
 * Every channel is a periodic curve of time (in frames), so the loop is seamless, and each
 * part trails the hips a little (overlapping action): hips lead, torso follows, then the head,
 * then the hands. Frame 0 is exactly GUARD: every move that ends in the guard flows into it.
 */

const FRAMES = 10;
const TAU = Math.PI * 2;

/** 0 at time 0, 1 half a period later (smooth); `speed` periods per loop. */
function cycle(t: number, speed = 1): number {
  return (1 - Math.cos((speed * TAU * t) / FRAMES)) / 2;
}

/** A channel `lag` frames late, at rest on frame 0. */
function late(curve: (t: number) => number, frame: number, lag: number): number {
  return curve(frame - lag) - curve(-lag);
}

/** The rock: 0 forward (frame 0), 1 sitting back on the rear leg (frame 5). */
const rock = (t: number): number => cycle(t);
/**
 * The dip on the knees, twice a loop, a little sharper at the bottom (a spring). Strong beat,
 * weak beat: he sits deeper into the first one (rocking back) than into the second.
 */
const dip = (t: number): number => {
  const smooth = cycle(t, 2);
  const sharp = 1 - Math.abs(Math.cos((TAU * t) / FRAMES));
  const accent = 1 + 0.3 * Math.cos((TAU * (t - 2.5)) / FRAMES);
  return (0.6 * smooth + 0.4 * sharp) * accent;
};
/** A quarter loop ahead of the rock: forward while the shoulder rises, back while it falls. */
const roll = (t: number): number => Math.sin((TAU * t) / FRAMES);
/** The dip without its spring, for what hangs from the body (smooth). */
const sway = (t: number): number => cycle(t, 2);
/**
 * The rear fist's tick, twice a loop: it bounces off the jaw like a ball, the contact on the
 * beat (just after the dip), the top in between: 0 on the beat, 1 at the top.
 */
const tick = (t: number): number => {
  const p = ((((t - 3) / (FRAMES / 2)) % 1) + 1) % 1;
  return 4 * p * (1 - p);
};

/** The body without the arms at time `t` (frames). */
function body(t: number): Pose {
  const back = rock(t);
  return {
    ...GUARD,
    // The dip sits into the hips a little (back as well as down): the lead knee stays put.
    hip: at(
      GUARD.hip.x - 1.2 * back - 0.8 * late(dip, t, 0.4),
      GUARD.hip.y - 1.1 * late(dip, t, 0.4),
    ),
    // Sitting back he leans away and rolls the lead shoulder up to the chin.
    torso: GUARD.torso - 1.7 * late(rock, t, 0.6),
    head: GUARD.head + 1.4 * late(rock, t, 1.2) + 1.0 * late(dip, t, 1.1),
    // The roll goes round: up through the front as he sits back, down through the back.
    shrug: (GUARD.shrug ?? 0) + 0.5 * late(rock, t, 0.4),
    reach: { near: 0.45 * late(roll, t, 0.4) },
    // The chest turns a touch away from the camera as the shoulder rolls in.
    twist: -0.15 * late(rock, t, 0.4),
  };
}

/** The rear fist follows the head this many frames late. */
const HAND_LAG = 0.7;
/** Where that late head is on frame 0: the rear fist is exactly GUARD's there. */
const HEAD_ON_FRAME_0 = solve(body(-HAND_LAG)).head;

function idle(frame: number): Pose {
  const pose = body(frame);
  // The rear fist stays glued to the jaw (it follows the head a little late) and ticks.
  const head = solve(body(frame - HAND_LAG)).head;
  const pop = late(tick, frame, 0);
  return {
    ...pose,
    farFist: at(
      GUARD.farFist.x + head.x - HEAD_ON_FRAME_0.x + 0.25 * pop,
      GUARD.farFist.y + head.y - HEAD_ON_FRAME_0.y + 0.8 * pop,
    ),
    // The lead hand hangs from the rolling shoulder: it trails the rock and rises with the roll.
    nearFist: at(
      GUARD.nearFist.x - 1.5 * late(rock, frame, 1.1),
      GUARD.nearFist.y + 0.8 * late(rock, frame, 1.6) - 0.6 * late(sway, frame, 1),
    ),
  };
}

export const POSES: readonly Pose[] = Array.from({ length: FRAMES }, (_, frame) => idle(frame));
