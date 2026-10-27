import type { Point } from '../../raster.ts';
import { BODY, solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * jump: 6 frames. Frame 0 is the preJump crouch (4 ticks); frames 1-4 are the air (rise 7, rise
 * 9, apex 10, fall 12 then held until landing); frame 5 is the landing (3 ticks). The back jump
 * plays it too; the forward jump flips (jumpForward.ts) and falls into the same FALL pose.
 *
 * Squash, stretch, tuck, reach, squash, from the guard back to the guard: the load sinks into
 * the wide springy stance (feet where the guard has them, the rear heel rising on the ball of
 * the foot), the takeoff stretches him long, the knees come up into a tight ball at the top,
 * the legs open toward the stance on the way down and the landing absorbs into the knees with
 * the feet exactly on the guard's spots. The high guard never breaks: both gloves stay around the
 * face (guarded), the far one up by the cheek, the near one under the chin. In the air the hips
 * sit lower as the legs come up (the body's center stays on the jump's arc).
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/** Center of the head of `body` (it does not depend on the hands). */
function headOf(body: Body): Point {
  return solve({ ...body, nearFist: body.hip, farFist: body.hip }).head;
}

const GUARD_HEAD = headOf(GUARD);

/**
 * The guard's gloves around the face of `body`, moved by `near` / `far` (world pixels): the
 * face is drawn upright under 20 degrees whatever the lean, so gloves kept at the same offsets
 * from the head sit exactly where the guard holds them, the far one in front of the cheek, the
 * near one under the chin, whatever the chest does.
 */
export function guarded(body: Body, near: Point = at(0, 0), far: Point = at(0, 0)): Pose {
  const head = headOf(body);
  const glove = (fist: Point, shift: Point): Point =>
    at(head.x + fist.x - GUARD_HEAD.x + shift.x, head.y + fist.y - GUARD_HEAD.y + shift.y);
  return { ...body, nearFist: glove(GUARD.nearFist, near), farFist: glove(GUARD.farFist, far) };
}

/** From the ankle to the ball of the foot, along the ground, for a foot `angle` degrees up. */
function ballOffset(angle: number): number {
  const a = (angle * Math.PI) / 180;
  return (BODY.ankle - BODY.footRadius) * Math.sin(a) + BODY.foot * Math.cos(a);
}

/** The guard's rear foot, its heel raised to `angle`, pivoting on the ball of the foot. */
function rearHeel(angle: number): Foot {
  const ball = GUARD.farFoot.x + ballOffset(GUARD.farFoot.angle ?? 0);
  return planted(ball - ballOffset(angle), angle);
}

// 0 · Load (preJump): from the guard, the hips sink into the knees and sit back, the chest
// folds over the lead knee, chin tucked behind the gloves; the rear heel comes up, the weight on
// the balls of the feet. The feet do not move.
const LOAD: Pose = guarded(
  {
    hip: at(-7.6, 30.5),
    torso: 21,
    head: -3,
    shrug: 1.7,
    twist: -0.1,
    nearFoot: GUARD.nearFoot,
    farFoot: rearHeel(-26),
  },
  at(-0.6, -0.4),
  at(-0.4, -0.6),
);

// 1 · Takeoff: the stretch. The rear leg long and straight from the push, toes pointed, the lead
// knee already lifting (the legs gather one after the other), the chest up out of the lean; the
// gloves drag a pixel behind the drive (they have weight) and catch up as the knees gather.
const RISE: Pose = guarded(
  {
    hip: at(-4, 44),
    torso: 8,
    head: 7,
    shrug: 0.8,
    twist: 0.05,
    nearFoot: { x: 2, y: 18, angle: -50 },
    farFoot: { x: -10.5, y: 8.5, angle: -74 },
  },
  at(0.4, -0.8),
  at(0.2, -1),
);

// 2 · The knees come up under the chest, the lean coming back.
const GATHER: Pose = guarded({
  hip: at(-3.5, 40.5),
  torso: 12,
  head: 5,
  shrug: 1,
  nearFoot: { x: 3.5, y: 21.5, angle: -52 },
  farFoot: { x: -8.5, y: 19, angle: -58 },
});

// 3 · Apex: a compact ball behind the gloves, both knees high, boots tucked under them, the legs
// already starting to let go (the opening into the fall spreads over two frames).
const TUCK: Pose = guarded(
  {
    hip: at(-3, 38),
    torso: 16,
    head: 1,
    shrug: 1.4,
    twist: -0.1,
    nearFoot: { x: 5.5, y: 27.5, angle: -42 },
    farFoot: { x: 0.5, y: 23.5, angle: -52 },
  },
  at(0.4, -0.4),
);

/**
 * 4 · Fall (held until landing): the legs open toward the stance and reach for the floor, the
 * lead foot forward and nearly flat, the rear one back on its toes, the knees still soft (the
 * landing finishes the reach); the gloves stay up. Also the last frame of the forward flip and
 * the air attacks' airborne guard.
 */
export const FALL: Pose = guarded({
  hip: at(-4.5, 37),
  torso: 11,
  head: 6,
  shrug: 1,
  nearFoot: { x: 5.5, y: 9, angle: -4 },
  farFoot: { x: -16, y: 12.5, angle: -36 },
});

// 5 · Landing: the squash, feet planted on the guard's spots, the knees absorbing, the chest
// over them, the gloves still sinking a little with the weight, dust puffing out on both sides.
// Three quarters of the load's depth: it springs back into the guard without a pop.
const LAND: Pose = {
  ...guarded(
    {
      hip: at(-7.2, 32),
      torso: 19,
      head: -1,
      shrug: 1.5,
      nearFoot: GUARD.nearFoot,
      farFoot: rearHeel(-20),
    },
    at(-0.6, -1.6),
    at(-0.4, -1.8),
  ),
  effects: [
    { kind: 'dust', x: 15, size: 4.5, progress: 0.25 },
    { kind: 'dust', x: -24, size: 4, progress: 0.25 },
  ],
};

export const POSES: readonly Pose[] = [LOAD, RISE, GATHER, TUCK, FALL, LAND];
