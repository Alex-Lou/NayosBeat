import { ART_SCALE } from '../../../../src/art/types.ts';
import type { Point } from '../../raster.ts';
import { BODY, solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as IDLE } from './idle.ts';
import { guarded } from './jump.ts';

/**
 * dashForward (Pas chassé, docs/combat-v2.md §3.2, §11.2): 6 frames, 1, 4, 4, 3, 3, 3 ticks
 * (18). The push-off, the glide (a cyan trail, dust on tick 0), the landing. The game moves him
 * 56 px over ticks 1-14 (a strong push, a soft braking): the poses stay anchored around x = 0.
 *
 * A boxer's push step: off the ball of the rear foot, the lead boot glides out along the canvas
 * with the body thrown low and long behind the high guard (one line from the dragging rear toe
 * through the hips to the head), the rear foot chases it in, both feet bite together on the
 * guard's marks and the knees soak up the stop; he rises back into the stance, the gloves a hair
 * past it, and ends on the idle's last frame. The feet never leave the floor by more than a
 * pixel: a glide, not a hop. What touches the floor is placed on the stage (see `stageOf`): the
 * landing's feet skid on with the stop and never snap back against the travel at a frame
 * change, the neck carries forward on every tick up to the settle; the dust goes with them.
 */

/** Ticks of each frame (§11.2). */
const TICKS = [1, 4, 4, 3, 3, 3] as const;
/** The game's dash curve (§3.2): px per tick on ticks 1 to 14. */
const SPEEDS = [
  7.71, 7.15, 6.57, 6.0, 5.43, 4.85, 4.29, 3.71, 3.15, 2.57, 2.0, 1.43, 0.85, 0.29,
] as const;

/**
 * Where a point of the stage shows in the cell while the game carries him by `speeds` (px per
 * tick from tick 1, negative backward) over frames of `ticks`: one at `x` on frame `on` is at
 * `stage(x, on, frame)` on frame `frame`. A frame holds while the game carries him on, so what
 * touches the floor rides along with him inside a frame (a skid in the travel direction); each
 * frame's first tick takes over exactly where the previous frame's last tick left it, so it
 * never snaps back against the travel at a frame change.
 */
export function stageOf(
  speeds: readonly number[],
  ticks: readonly number[],
): (x: number, on: number, frame: number) => number {
  const position = [0];
  speeds.forEach((speed, k) => position.push((position[k] ?? 0) + speed));
  const travel = (tick: number): number => position[Math.min(tick, speeds.length)] ?? 0;
  // How far the game carries him from the last tick of frame `b - 1` to the first of frame `b`.
  const jump: number[] = [0];
  let start = ticks[0] ?? 0;
  for (let b = 1; b < ticks.length; b++) {
    jump.push(travel(start) - travel(start - 1));
    start += ticks[b] ?? 0;
  }
  const between = (from: number, to: number): number =>
    jump.slice(from + 1, to + 1).reduce((sum, step) => sum + step, 0);
  return (x, on, frame) => (frame <= on ? x + between(frame, on) : x - between(on, frame));
}

const stage = stageOf(SPEEDS, TICKS);

/** Where the toe tip of a foot touches the floor (a foot on its ball pivots around it). */
export function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + (BODY.ankle - BODY.footRadius) * Math.sin(a) + BODY.foot * Math.cos(a);
}

/** A foot on its ball, the toe tip at `toe`, the heel raised `-angle` degrees. */
export function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

/** `foot` raised `height` px off the floor. */
export const lift = (foot: Foot, height: number): Foot => ({ ...foot, y: foot.y + height });

export const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/**
 * The idle's last frame (the lead shoulder still up on the breath): ending on it, the idle's
 * own 9 -> 0 beat carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
export const IDLE_HANG: Pose = IDLE[IDLE.length - 1] ?? GUARD;

const GUARD_ARM = solve(GUARD).near;
const FOREARM = Math.hypot(
  GUARD_ARM.wrist.x - GUARD_ARM.elbow.x,
  GUARD_ARM.wrist.y - GUARD_ARM.elbow.y,
);

/** One sprite pixel, in world pixels. */
const PIXEL = 1 / ART_SCALE;

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/**
 * `body` with its hips nudged (a quarter pixel at most) so that the lead shoulder sits on the
 * guard's sprite-pixel grid.
 */
function onGrid(body: Body): Body {
  const { shoulder } = solve({ ...body, nearFist: body.hip, farFist: body.hip }).near;
  const snap = (value: number, guard: number): number =>
    guard + Math.round((value - guard) / PIXEL) * PIXEL - value;
  return {
    ...body,
    hip: at(
      body.hip.x + snap(shoulder.x, GUARD_ARM.shoulder.x),
      body.hip.y + snap(shoulder.y, GUARD_ARM.shoulder.y),
    ),
  };
}

/**
 * The guard's gloves around the face of `body` (moved by `near` and `far`, see jump.ts), the
 * lead upper arm exactly the guard's, shifted by whole sprite pixels: only the forearm turns
 * toward the glove's place. The sleeve emblem stays the guard's clean square (turned or off
 * the pixel grid, it rasterizes notched), as in the walks.
 */
export function guard(body: Body, near: Point = at(0, 0), far: Point = at(0, 0)): Pose {
  const pose = guarded(onGrid(body), near, far);
  const { shoulder } = solve(pose).near;
  const elbow = at(
    shoulder.x + GUARD_ARM.elbow.x - GUARD_ARM.shoulder.x,
    shoulder.y + GUARD_ARM.elbow.y - GUARD_ARM.shoulder.y,
  );
  const aim = at(pose.nearFist.x - elbow.x, pose.nearFist.y - elbow.y);
  const k = FOREARM / (Math.hypot(aim.x, aim.y) || 1);
  return { ...pose, nearFist: at(elbow.x + aim.x * k, elbow.y + aim.y * k) };
}

/** Cyan dash lines streaming back from behind him. */
const wake = (x: number, y: number, length: number, spread: number): Effect => ({
  kind: 'speed',
  center: at(x, y),
  length,
  spread,
  direction: 0,
  tone: 'sound',
});

const LEAD = GUARD.nearFoot;
const REAR_TOE = toeOf(GUARD.farFoot);

// 0 - Appel (1 tick): the push-off. The rear heel snaps up as the ball of the foot drives, the
// hips drop and tip in over the lead knee, the chin stays on the target behind the gloves. A
// puff of dust where the rear foot bites the floor.
const APPEL: Pose = guard(
  {
    hip: at(-5.6, 34.6),
    torso: 19,
    head: -1,
    shrug: 1.8,
    twist: -0.1,
    nearFoot: LEAD,
    farFoot: onToes(REAR_TOE, -34),
  },
  at(0.4, -0.4),
  at(0.2, -0.4),
);

// 1 - Glisse (4 ticks, the fastest stretch: 27 px): thrown forward low and long, the lead boot
// gliding out ahead along the canvas, the rear leg still stretched back from the push, its toe
// just leaving the floor where it drove (pointed, a hair off the canvas: it trails, it does not
// skate back). The high guard leads, the lead shoulder rolled up to the chin; the face stays
// upright on the target (the head tipped back against the lean, under 20 degrees).
const GLIDE: Pose = guard(
  {
    hip: at(-1, 31.5),
    torso: 30,
    head: -11,
    shrug: 2.2,
    twist: -0.2,
    nearFoot: lift(planted(16, 4), 0.5),
    farFoot: lift(onToes(stage(REAR_TOE, 0, 1), -46), 1),
  },
  at(1, -0.5),
  at(0.5, -0.3),
);

/**
 * The landing's feet on frame 3: one stop-tick ahead of the guard's marks in the cell, so they
 * skid forward with the stop and take over frame 4 (on the marks) exactly where they left off.
 */
const BITE_LEAD = planted(stage(LEAD.x, 4, 3), LEAD.angle);
const BITE_REAR = onToes(stage(REAR_TOE, 4, 3), -36);
/** Where the toes bite on the landing. */
const SKID = toeOf(BITE_LEAD);
const REAR_SKID = toeOf(BITE_REAR);

// 2 - The chase (4 ticks, braking): the rear foot is drawn in under him on its toes, knee first,
// the lead heel still gliding, its toe running up to where it bites (never past it: the feet
// would have to slide back); the hips come back with the feet, the chest pitched on over the
// lead knee so the drive still carries forward into the stop.
const CHASE: Pose = guard(
  {
    hip: at(-4.7, 31),
    torso: 27,
    head: -8,
    shrug: 2,
    twist: -0.15,
    nearFoot: lift(planted(stage(BITE_LEAD.x, 3, 2) - 0.4, 6), 0.2),
    farFoot: lift(onToes(stage(REAR_SKID, 3, 2) - 0.3, -42), 0.6),
  },
  at(0.8, -0.6),
  at(0.4, -0.5),
);

// 3 - Réception (3 ticks): both feet bite (a step ahead of the guard's marks in the cell: the
// game still carries him on, they skid forward with the stop and run straight into the next
// frame, never back), the rear one on its ball with the heel well up over the dropped knee
// (flatter, the shin would fold down over the foot), the knees soak up the stop, the chest
// leans on over the lead knee and carries on forward; the rear glove sinks with the weight, the
// lead one carried on a hair by the stop.
const LAND: Pose = guard(
  {
    hip: at(-6.5, 30.4),
    torso: 24,
    head: -5,
    shrug: 2.4,
    twist: -0.1,
    nearFoot: BITE_LEAD,
    farFoot: BITE_REAR,
  },
  at(1.4, 0),
  at(0.4, -1.8),
);

// 4 - Back up into the stance on the guard's marks (the last skid of the stop), the gloves a
// hair past it (they have weight).
const RISE: Pose = guard(
  {
    hip: at(-5, 34.8),
    torso: 18,
    head: 0,
    shrug: 2,
    nearFoot: LEAD,
    farFoot: onToes(REAR_TOE, -20),
  },
  at(0.2, 0.6),
  at(0.2, 0.5),
);

export const POSES: readonly Pose[] = [
  { ...APPEL, effects: [dust(REAR_TOE - 1, 3.5, 0.12)] },
  {
    ...GLIDE,
    // The push-off puff, left on the stage under the rear toe; the dash lines stream right off
    // his back (his own wake).
    effects: [dust(stage(REAR_TOE - 1, 0, 1), 3.5, 0.5), wake(-8, 45, 31, 12)],
  },
  // The wake drops to the rear boot as it whips in under him.
  { ...CHASE, effects: [wake(-17, 11, 20, 6)] },
  { ...LAND, effects: [dust(SKID, 3.5, 0.2), dust(REAR_SKID, 2.5, 0.15)] },
  {
    ...RISE,
    // The two landing puffs thin out together.
    effects: [dust(stage(SKID, 3, 4), 3.5, 0.6), dust(stage(REAR_SKID, 3, 4), 2.5, 0.5)],
  },
  IDLE_HANG,
];
