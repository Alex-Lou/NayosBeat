import type { Point } from '../../raster.ts';
import {
  at,
  GUARD,
  onBall,
  onHeel,
  planted,
  smear,
  toeOf,
  type Effect,
  type Pose,
} from './common.ts';
import { POSES as IDLE } from './idle.ts';
import { guarded } from './jump.ts';
import { legAt } from './jumpLight.ts';

export const ANIMATED: boolean = true;

/**
 * dashForward (Footwork, docs/combat-v2.md §3.2, §3.4, §11.3): 6 frames, 1, 3, 3, 3, 3, 3 ticks
 * (16). The game carries her 64 px over ticks 1-12 (a hard push, a soft stop) and lets her cancel
 * it from tick 8 (frame 3) into a normal or the grab, keeping half her speed: the poses stay
 * anchored around x = 0, and frames 3 and 4 are the posture every one of those moves starts from.
 *
 * A breaker's slide-in, not a boxer's push step (Nayo's chassé): the dance step that turns into
 * a strike. Off the ball of the rear foot, she drops into a low slide, the hips down by 10 px and
 * the chest driven on over the lead knee: the lead boot shoots out on its heel along the floor
 * like a kick-out (a sweep could come out of it), the only thing touching it, on a magenta streak;
 * the rear leg trails long behind, off the floor, the toes pointed, one sweep of line from that
 * toe up through the hips to the head; the low lead fist leads the way over the knee, the rear one
 * stays loaded by the ear. Then she gathers: the rear knee scoops through high in front (the
 * plié's knee), the hips start up; and she bites the floor, the brake overshooting past her guard
 * (the hips low, the chest pitched in, the lead knee driven over the toe, the rear heel high),
 * before she rebounds up into it, loaded: the rear fist cocked deeper by the ear, the look from
 * under the brows. She settles into the guard on the idle's last frame.
 *
 * - 0 (1 tick): the push: the hips dip in, the rear heel snaps up on the ball; a puff of dust.
 * - 1 (3 ticks, 28 px): the slide-in, the lowest frame; the floor streak under the lead heel.
 * - 2 (3 ticks, 20 px): the gather, the hips rising; the streak thins.
 * - 3 (3 ticks, 12 px): the bite, the brake's overshoot: both feet down, the knees soaking up the
 *   stop, the chest pitched in past the guard; dust at both feet. Cancellable from its second tick.
 * - 4 (3 ticks, 4 px): loaded, the rebound to the guard's height, the rear fist pulled back
 *   (`cool`).
 * - 5 (3 ticks): the idle's last frame: its own 7 -> 0 beat carries her on into the loop.
 *
 * What touches the floor is placed on the stage (`stageOf`): a foot skids on with the travel
 * inside a frame and takes over the next frame exactly where it left off, never snapping back
 * against the travel. The head stays the source drawing (under 20 degrees on screen).
 *
 * The fringe and the belt's chain (springs, riff/index.ts) feel only the motion of the poses in
 * the cell, not the 64 px the game carries her: so the head itself is driven, 7 px forward and
 * 11 px down into the slide, held low through the gather and the bite, then pulled back up and
 * back on the rebound. The fringe trails back (as far as head.ts lets it swing) from the slide to
 * the bite and flicks forward on the rebound, a frame after the brake; the chain's loop lifts
 * into the drop and swings forward after it.
 */

/** Ticks of each frame (her clip, src/art/riff/clips.ts). */
const TICKS = [1, 3, 3, 3, 3, 3] as const;
/** The game's dash curve (§3.2): px per tick on ticks 1 to 12. */
const SPEEDS = [10.22, 9.34, 8.44, 7.56, 6.66, 5.78, 4.89, 4.0, 3.11, 2.22, 1.34, 0.44] as const;

/**
 * Where a point of the floor shows in the cell while the game carries her by `speeds` (px per
 * tick from tick 1; negative: backward) over frames of `ticks`: one at `x` on frame `on` is at
 * `stage(x, on, frame)` on frame `frame`. What touches the floor rides along with her inside a
 * frame (a skid in the travel direction); each frame's first tick takes over exactly where the
 * frame before left it, so it never snaps back against the travel at a frame change.
 */
export function stageOf(
  speeds: readonly number[],
  ticks: readonly number[],
): (x: number, on: number, frame: number) => number {
  const position = [0];
  speeds.forEach((speed, k) => position.push((position[k] ?? 0) + speed));
  const travel = (tick: number): number => position[Math.min(tick, speeds.length)] ?? 0;
  // How far the game carries her from the last tick of frame b - 1 to the first of frame b.
  const step: number[] = [0];
  let start = ticks[0] ?? 0;
  for (let b = 1; b < ticks.length; b++) {
    step.push(travel(start) - travel(start - 1));
    start += ticks[b] ?? 0;
  }
  const between = (from: number, to: number): number =>
    step.slice(from + 1, to + 1).reduce((sum, s) => sum + s, 0);
  return (x, on, frame) => (frame <= on ? x + between(frame, on) : x - between(on, frame));
}

const stage = stageOf(SPEEDS, TICKS);

export const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** The idle's last frame: ending on it, the idle's own 7 -> 0 beat carries her on into the loop. */
export const IDLE_SETTLE: Pose = IDLE[IDLE.length - 1] ?? GUARD;

/** The guard's on-screen head tilt. */
const LOOK = GUARD.torso + GUARD.head;
/** The guard's marks: the rear toe tip (the ball it pivots on) and the lead foot. */
const REAR_TOE = toeOf(GUARD.nearFoot);
const LEAD = GUARD.farFoot;

type Body = Omit<Pose, 'nearFist' | 'farFist' | 'head'> & {
  /** The look on screen, in degrees chin down from the guard's. */
  readonly chin: number;
};

/**
 * A body with the guard's fists on its shoulders, moved by `rear` and `lead` (see jump.ts), or
 * the lead fist placed at `leadFist`.
 */
function pose(b: Body, rear: Point, lead: Point, leadFist?: Point): Pose {
  const { chin, ...rest } = b;
  const placed = guarded({ ...rest, head: LOOK + chin - b.torso }, rear, lead);
  return leadFist ? { ...placed, farFist: leadFist } : placed;
}

// 0 · The push (1 tick).
const PUSH = pose(
  {
    ...GUARD,
    hip: at(-5.8, 30.6),
    torso: 22,
    chin: 1,
    shrug: 2.8,
    twist: 0.6,
    nearFoot: onBall(REAR_TOE, -24),
    farFoot: LEAD,
  },
  at(0.4, -0.4),
  at(-0.6, -0.6),
);

/** The slide's hips and lean: low, the chest driven on over the lead knee. */
const SLIDE_HIP = at(-4, 22);
const SLIDE_LEAN = 32;

// 1 · The slide-in (3 ticks), the lowest frame: one sweep of line from the trailing rear toe
// through the hips to the head. The rear leg long behind her, 4 px off the floor, the toes
// pointed; the lead boot far out in front on its heel, the only thing on the floor; the low lead
// fist out over the knee, the rear one loaded by the ear.
const SLIDE = pose(
  {
    ...GUARD,
    hip: SLIDE_HIP,
    torso: SLIDE_LEAN,
    chin: 5,
    shrug: 3,
    twist: 0.85,
    nearFoot: { ...legAt(SLIDE_HIP, SLIDE_LEAN, 'near', -149, 30.8), angle: -160 },
    farFoot: onHeel(planted(22), 30),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'down', farKnee: 'up' },
  },
  at(0.4, 0.8),
  at(0, 0),
  at(21, 27),
);

// 2 · The gather (3 ticks): the rear knee scoops through high in front, the lead heel
// still gliding; the hips start up, the chest stays over the knee.
const GATHER = pose(
  {
    ...GUARD,
    hip: at(-4.5, 25),
    torso: 26,
    chin: 4,
    shrug: 2.6,
    twist: 0.35,
    nearFoot: { x: -13, y: 14, angle: -40 },
    farFoot: onHeel(planted(14), 10),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front', farKnee: 'front' },
  },
  at(0.6, -0.8),
  at(0, 0),
  at(10, 38),
);

// 3 · The bite (3 ticks), the brake's overshoot: the lead knee driven on over the toe, the rear
// heel high on its ball, the chest and the head pitched in past the guard. A tick of travel
// ahead of the guard's marks, so the feet skid on into frame 4 (on the marks) and never back.
const BITE = pose(
  {
    ...GUARD,
    hip: at(-4.5, 26.3),
    torso: 30,
    chin: 5,
    shrug: 2.9,
    twist: 0.35,
    nearFoot: onBall(stage(REAR_TOE, 4, 3), -40),
    farFoot: planted(stage(LEAD.x, 4, 3)),
  },
  at(-0.6, -1.2),
  at(0.6, -1.6),
);

// 4 · Loaded (3 ticks), on the guard's marks (the game carries her no farther after it): the
// rebound, the hips back up to the guard's height and the chest a little behind it, the rear
// fist pulled deeper by the ear.
const LOADED = pose(
  {
    ...GUARD,
    hip: at(-7, 32.4),
    torso: 17,
    chin: -1,
    shrug: 2.4,
    twist: 0.3,
    nearFoot: onBall(REAR_TOE, -14),
    farFoot: LEAD,
    face: 'cool',
  },
  at(-2.8, -0.2),
  at(0.8, -0.4),
);

/** Where the toes bite on the stop. */
const SKID = toeOf(BITE.farFoot);
const REAR_SKID = toeOf(BITE.nearFoot);

export const POSES: readonly Pose[] = [
  { ...PUSH, effects: [dust(REAR_TOE - 1, 3.5, 0.12)] },
  {
    ...SLIDE,
    // The push-off puff left on the stage behind her; the streak along the floor to the heel.
    effects: [dust(stage(REAR_TOE - 1, 0, 1), 4, 0.5), smear(3, [-20, 3], [2, 3], [24, 3.5])],
  },
  { ...GATHER, effects: [smear(3, [-4, 3], [8, 3], [18, 3.5])] },
  { ...BITE, effects: [dust(SKID, 4, 0.2), dust(REAR_SKID, 3, 0.15)] },
  // The two puffs thin out where the feet bit, carried on with the last skid.
  {
    ...LOADED,
    effects: [dust(stage(SKID, 3, 4), 4, 0.6), dust(stage(REAR_SKID, 3, 4), 3, 0.5)],
  },
  IDLE_SETTLE,
];
