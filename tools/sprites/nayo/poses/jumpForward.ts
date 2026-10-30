import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, ease, smear, tween, type Effect, type Foot, type Pose } from './common.ts';
import { FALL, guarded, hanging } from './jump.ts';

/**
 * jumpForward: a front flip. 8 frames of 3, 4, 4, 4, 4, 5, 4, 4 ticks (src/art/nayo/clips.ts),
 * the last held until landing (the jump's FALL pose, then the jump's landing frame).
 *
 * He springs up and forward off the preJump crouch (the jump's load, in the guard's wide
 * stance), balls up and turns over once, then opens out and reaches down for the floor, landing
 * through the jump's own fall and landing frames back into the guard. The rotation eases in: the
 * takeoff only tips him over (the knees come up in front of the chest first, the ball forms), the
 * tuck carries the fastest turn, and it slows as he opens. Counting the torso lean with the spin,
 * the body turns about 16, 19, 17, 18, 15, 4 and 1 degrees a tick from frame to frame: the tuck
 * reads, the landing is set early. The tucked body turns around its own center, which stays put
 * in the cell (the game moves him along the jump's arc), so the flip has no wobble.
 *
 * The boxer keeps his high guard through the roll: both gloves stay up at the face, the lead one
 * over it, which also hides the face while the head is upside down (turned by RotSprite, the eye
 * would smear). Upright frames keep the head under 20 degrees, so the face is the one drawn, and
 * their gloves are set around that upright face, not turned with the body (see `guardedRolled`).
 * A cyan swoosh trails the boots on the two fastest frames.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

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

/**
 * The guard's gloves around the face of `body` (see jump.ts), for a pose roll() turns by `spin`:
 * the gloves' offsets from the head are turned back by the spin first, so that once the body is
 * turned they sit where the guard holds them around the face, which is drawn upright under 20
 * degrees. Turned with the body, the rear glove would rise to the forehead (a salute) and the
 * lead one to the eyes.
 */
function guardedRolled(body: Body, spin: number, near?: Point, far?: Point): Pose {
  const pose = guarded(body, near, far);
  const head = solve({ ...pose, spin: 0 }).head;
  const glove = (fist: Point): Point => {
    const offset = turn(at(fist.x - head.x, fist.y - head.y), -spin);
    return at(head.x + offset.x, head.y + offset.y);
  };
  return { ...pose, nearFist: glove(pose.nearFist), farFist: glove(pose.farFist) };
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

/**
 * Both gloves up at the face: the lead one over it, its leather back on the eye and the cheek
 * (the bare fingers past the face, held to the knuckles: turned by RotSprite, fingers splayed
 * over the face read as orange claws), the rear one by the cheek where the guard holds it.
 */
function covered(pose: Pose): Pose {
  const upright = { ...pose, spin: 0 };
  return { ...pose, nearFist: onHead(upright, 5.5, 0), farFist: onHead(upright, 9.5, -3) };
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

// The leap: up and forward off the crouch, the whole body tipped into the jump, the lead knee
// driving, the back leg pushing long behind, its toes pointed off the push (30 degrees, as far
// as an ankle goes without reading broken); the high guard kept up at the face.
const LAUNCH_BODY: Body = hanging(
  {
    hip: at(0, 0),
    torso: -3,
    head: 1,
    shrug: 1.2,
    nearFoot: { x: 8, y: -22, angle: -50 },
    farFoot: { x: -7, y: -34 },
  },
  { far: 60 },
);
const LAUNCH: Pose = guarded(LAUNCH_BODY, at(0.5, 0.5), at(0.3, 0.5));

// The ball: back rounded, chin down, knees up in front of the chest, boots pointed; both gloves
// up at the face, the lead one covering it.
const TUCK: Pose = covered({
  hip: at(0, 0),
  torso: 28,
  head: 30,
  shrug: 1.8,
  nearFoot: { x: 8, y: -10, angle: -60 },
  farFoot: { x: 3, y: -7, angle: -65 },
  nearFist: at(14, 24),
  farFist: at(19, 18),
});

// Opening out: the legs unfold toward the floor, the gloves come off the face back into the
// guard.
const OPEN_BODY: Body = {
  hip: at(0, 0),
  torso: 16,
  head: 2,
  shrug: 1.2,
  nearFoot: { x: 12, y: -22, angle: -40 },
  farFoot: { x: 0, y: -20, angle: -55 },
};
const OPEN: Pose = guarded(OPEN_BODY);

export const POSES: readonly Pose[] = [
  // 0 · Takeoff (3 ticks), already tipping forward.
  moved(guardedRolled(LAUNCH_BODY, 19, at(0.5, 0.5), at(0.3, 0.5)), -3, 42, 19),
  // 1 · Balling up, the knees coming up in front of the chest, the lead glove closing over the
  // face.
  roll(covered(tween(LAUNCH, TUCK, 0.7, ease.out)), 38),
  // 2-3 · Fully tucked, over the top, the fastest frames: the boots swoosh around.
  trailed(roll(TUCK, 112), swoosh(-127, -199)),
  trailed(roll(TUCK, 182), swoosh(-197, -269)),
  // 4 · Coming round, the tuck starting to loosen.
  roll(covered(tween(TUCK, OPEN, 0.2)), 255),
  // 5 · Opening: the head comes up, the guard comes off the face, a few pixels out in front of it
  // (the spin counted from -360 so the head angle stays small: the face is drawn upright again,
  // the gloves around it; the chest still leans back, so the gloves held right at the chin would
  // fold the lead arm into the shoulder).
  roll(guardedRolled(tween(TUCK, OPEN, 0.5), -38, at(3.5, 0.5), at(2, 0.5)), -38),
  // 6 · Unfolded, the legs reaching for the floor.
  roll(guardedRolled(OPEN_BODY, -10), -10, at(0, 45)),
  // 7 · Falling, ready to land (held).
  FALL,
];
