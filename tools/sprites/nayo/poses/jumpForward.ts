import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, ease, smear, tween, type Effect, type Foot, type Pose } from './common.ts';
import { FALL } from './jump.ts';

/**
 * jumpForward: a front flip. 8 frames of 4,5,5,5,5,5,5,4 ticks, the last held until landing
 * (the jump's FALL pose, then the jump's landing frame).
 *
 * He leaps up and forward off the preJump crouch, balls up and turns over once, then opens out
 * and reaches down for the floor. The spin speeds up as he tucks and slows as he opens (52°, then
 * about 66° a frame, then 54, 28 and 10): the tuck reads, the landing is set early. The tucked
 * body turns around its own center, which stays put in the cell (the game moves him along the
 * jump's arc), so the flip has no wobble.
 *
 * The boxer keeps his cover through the roll: the lead glove up in front of the face, like a
 * peek-a-boo guard. It also hides the face while the head is upside down (the face's pixel
 * stamps are never rotated, see face.ts). A cyan swoosh trails the boots on the two fastest
 * frames.
 */

/** `p` turned by `degrees` (clockwise, like a forward somersault). */
function turn(p: Point, degrees: number): Point {
  const a = (-degrees * Math.PI) / 180;
  return at(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));
}

/** Every placed part of a pose moved by (dx, dy), and the whole body spun around the hip. */
function moved(pose: Pose, dx: number, dy: number, spin: number): Pose {
  const move = (p: Point): Point => at(p.x + dx, p.y + dy);
  const foot = (f: Foot): Foot => ({ ...f, ...move(f) });
  return {
    ...pose,
    hip: move(pose.hip),
    nearFoot: foot(pose.nearFoot),
    farFoot: foot(pose.farFoot),
    nearFist: move(pose.nearFist),
    farFist: move(pose.farFist),
    spin,
  };
}

/** Center of the tucked body, from the hip (upright). */
const BALL = at(8, 8);

/** Where the tucked body's center stays during the roll (character space). */
const CENTER = at(1, 46);

/**
 * An upright pose (hip at the origin) spun by `spin` degrees around the tucked body's center,
 * that center put at `center`.
 */
function roll(pose: Pose, spin: number, center: Point = CENTER): Pose {
  const hip = turn(BALL, spin);
  return moved(pose, center.x - hip.x, center.y - hip.y, spin);
}

/** Head-local point (x toward the face, y up) to character space. */
function onHead(pose: Pose, dx: number, dy: number): Point {
  const s = solve(pose);
  const a = (s.headAngle * Math.PI) / 180;
  return at(
    s.head.x + dx * Math.cos(a) + dy * Math.sin(a),
    s.head.y - dx * Math.sin(a) + dy * Math.cos(a),
  );
}

/** The lead glove up in front of the face: brow, eye and mouth hidden at every angle. */
function covered(pose: Pose): Pose {
  return { ...pose, nearFist: onHead({ ...pose, spin: 0 }, 6, 1) };
}

/** The boots' swoosh: a trail along the circle they travel, from `from` to `to` degrees. */
function swoosh(from: number, to: number): Effect {
  const points = [0, 0.25, 0.5, 0.75, 1].map((t): [number, number] => {
    const a = ((from + (to - from) * t) * Math.PI) / 180;
    return [CENTER.x + 21 * Math.cos(a), CENTER.y + 21 * Math.sin(a)];
  });
  return smear(5, ...points);
}

function trailed(pose: Pose, ...effects: Effect[]): Pose {
  return { ...pose, effects };
}

// Key poses, drawn upright with the hip at the origin; roll() turns and places them.

// The leap: up and forward off the crouch, the lead knee driving, the back leg pushing long,
// the shell guard kept.
const LAUNCH: Pose = {
  hip: at(0, 0),
  torso: 6,
  head: 6,
  shrug: 3.6,
  nearFoot: { x: 8, y: -23, angle: -50 },
  farFoot: { x: -6, y: -34, angle: -70 },
  nearFist: at(11, 19),
  farFist: at(9, 24),
};

// The ball: back rounded, chin down, knees up in front of the chest, boots pointed, the lead
// glove covering the face.
const TUCK: Pose = covered({
  hip: at(0, 0),
  torso: 28,
  head: 30,
  shrug: 4,
  nearFoot: { x: 8, y: -10, angle: -60 },
  farFoot: { x: 3, y: -7, angle: -65 },
  nearFist: at(14, 24),
  farFist: at(19, 18),
});

// Opening out: the legs unfold toward the floor, the lead hand comes down for balance, the rear
// fist back by the jaw.
const OPEN: Pose = {
  hip: at(0, 0),
  torso: 16,
  head: 14,
  shrug: 3.6,
  nearFoot: { x: 12, y: -22, angle: -40 },
  farFoot: { x: 0, y: -20, angle: -55 },
  nearFist: at(14, 10),
  farFist: at(11.5, 27),
};

export const POSES: readonly Pose[] = [
  // 0 · Takeoff (4 ticks), already tipping forward.
  moved(LAUNCH, -3, 42, 22),
  // 1 · Balling up, the glove rising to the face.
  roll(covered(tween(LAUNCH, TUCK, 0.7, ease.out)), 62),
  // 2-3 · Fully tucked, over the top, the fastest frames: the boots swoosh around.
  trailed(roll(TUCK, 135), swoosh(-150, -222)),
  trailed(roll(TUCK, 202), swoosh(-217, -289)),
  // 4 · Coming round, the tuck starting to loosen.
  roll(covered(tween(TUCK, OPEN, 0.2)), 268),
  // 5 · Opening: the head comes up, the guard comes off the face.
  roll({ ...tween(TUCK, OPEN, 0.5), nearFist: at(17, 15), farFist: at(14, 29) }, 322),
  // 6 · Unfolded, the legs reaching for the floor.
  roll(OPEN, 350, at(0, 45)),
  // 7 · Falling, ready to land (held).
  FALL,
];
