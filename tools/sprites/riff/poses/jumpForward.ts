import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import {
  at,
  ease,
  GUARD,
  onBall,
  smear,
  toeOf,
  tween,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';
import { FALL, guarded } from './jump.ts';

export const ANIMATED: boolean = true;

/**
 * jumpForward: her front flip. 7 frames of 3, 4, 4, 4, 4, 4, 5 ticks: frame 0 is the pre-jump
 * (3 ticks, as long as hers), frames 1-6 the air, the last one (the jump's FALL) held until she
 * lands, then the jump's landing frame.
 *
 * She loads into the plié already tipping in, springs up and forward long, snaps into a tight
 * ball (the chest folded onto the thighs, the chin to the knees, the heels to the seat, the near
 * forearm across the face), whips over, and opens out of it cocky: a split in the air, the lead
 * leg reaching forward for the floor, the rear one trailing long behind, the toes pointed, the
 * rear arm flung out wide; then the legs come together for the jump's own fall.
 *
 * The turn is paced by the tuck, as a body's would be: slow while she is open, fast once balled
 * up, slow again as she opens: 22, 115, 215, 300 and 340 degrees, then upright (the fall). The
 * tucked body turns around its own center, which stays put in the cell (the game carries her
 * along the jump's arc), so the flip has no wobble. Tucked, the head is turned by RotSprite past
 * 20 degrees: the near forearm across the face hides the eye; upright frames keep the head under
 * 20 degrees, the face as drawn.
 *
 * Her trail is not Nayo's boot swoosh: a crescent along the arc her head and fringe sweep, on the
 * fast tucked frames; the fringe and the belt's chain whip around by themselves.
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

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * The ankle of a leg folded from `hip` (its joint): the thigh along `thigh` degrees, the shin
 * along `shin`, the foot at `angle`.
 */
function folded(hip: Point, thigh: number, shin: number, angle: number): Foot {
  const knee = at(
    hip.x + Math.cos(rad(thigh)) * RIFF_BODY.thigh,
    hip.y + Math.sin(rad(thigh)) * RIFF_BODY.thigh,
  );
  return {
    x: knee.x + Math.cos(rad(shin)) * RIFF_BODY.shin,
    y: knee.y + Math.sin(rad(shin)) * RIFF_BODY.shin,
    angle,
  };
}

/** The joint a leg hangs from, for hips at the origin leaning `torso` degrees. */
function hipJoint(torso: number, side: 'near' | 'far'): Point {
  const across = (side === 'near' ? 1 : -1) * RIFF_BODY.hipSpread;
  return at(Math.cos(rad(torso)) * across, -Math.sin(rad(torso)) * across);
}

/** A long leg from its joint along `angle` degrees, `length` px, the foot pointed along it. */
function reaching(torso: number, side: 'near' | 'far', angle: number, length: number): Foot {
  const joint = hipJoint(torso, side);
  return {
    x: joint.x + Math.cos(rad(angle)) * length,
    y: joint.y + Math.sin(rad(angle)) * length,
    angle,
  };
}

/** The guard's head angle on screen (the face is the drawing under 20 degrees). */
const HEAD = GUARD.torso + GUARD.head;
const TOE = toeOf(GUARD.nearFoot);

// 0 · The pre-jump: the hips dip into the plié, the chest already tipping in over the lead knee,
// the rear heel up; the fists swing down a touch. The feet do not move.
const LOAD: Pose = guarded(
  {
    ...GUARD,
    hip: at(-7, 29.8),
    torso: 22,
    head: HEAD + 1 - 22,
    shrug: 2.6,
    nearFoot: onBall(TOE, -26),
    farFoot: GUARD.farFoot,
  },
  at(0.6, 0.4),
  at(0.4, 0.8),
);

// Key poses, drawn upright with the hip at the origin; roll() turns and places them.

// The leap: long, up and forward, the rear leg pushing straight behind, the lead knee driving,
// the chin up; the cocked fist rides up by the ear, the lead fist reaches out ahead.
const LAUNCH: Pose = guarded(
  {
    ...GUARD,
    hip: at(0, 0),
    torso: 4,
    head: -8,
    shrug: 1.4,
    twist: 0.5,
    nearFoot: { x: -8, y: -30, angle: -70 },
    farFoot: { x: 6, y: -22, angle: -50 },
    bends: { nearKnee: 'down' },
  },
  at(1, 2),
  at(2.5, 3),
);

/** The tuck's lean: the chest folded down onto the thighs. */
const CURL = 50;

// The ball: the chest on the thighs, the chin to the knees, the knees snapped up to the chest,
// the heels at the seat; the lead hand round the shins, the near forearm across the face.
const TUCK: Pose = {
  ...GUARD,
  hip: at(0, 0),
  torso: CURL,
  head: 14,
  shrug: 2.6,
  twist: 0.3,
  nearFoot: folded(hipJoint(CURL, 'near'), 24, 196, -150),
  farFoot: folded(hipJoint(CURL, 'far'), 18, 192, -150),
  nearFist: at(26, 17),
  farFist: at(13, 2),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
};

/** The split's lean before its turn (it is drawn turned back 20 degrees). */
const PROUD = 6;

// Out of the ball, cocky: the legs scissor open, the lead one reaching forward and down for the
// floor, the rear one trailing long behind, the toes pointed; the rear arm flung out wide, the
// lead fist at the chin, the head up on the opponent.
const SPLIT: Pose = {
  ...GUARD,
  hip: at(0, 0),
  torso: PROUD,
  head: 14 - PROUD,
  shrug: 1.6,
  twist: 0.6,
  nearFoot: reaching(PROUD, 'near', -160, 30.8),
  farFoot: reaching(PROUD, 'far', -72, 30.2),
  nearFist: at(-17, 31),
  farFist: at(8.5, 18),
  bends: { nearKnee: 'down', farKnee: 'up', nearElbow: 'down', farElbow: 'down' },
};

/** Center of the tucked body, from the hip (upright). */
const BALL = (() => {
  const s = solve(TUCK, RIFF_BODY);
  const parts = [s.hip, s.head, s.near.knee, s.far.knee, s.near.ankle, s.near.wrist];
  const xs = parts.map((p) => p.x);
  const ys = parts.map((p) => p.y);
  return at((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
})();

/** Where the tucked body's center stays during the roll (character space). */
const CENTER = at(0, 41);

/**
 * An upright pose (hip at the origin) spun by `spin` degrees around the tucked body's center,
 * that center put at `center`.
 */
function roll(pose: Pose, spin: number, center: Point = CENTER): Pose {
  const hip = turn(BALL, spin);
  return moved(pose, center.x - hip.x, center.y - hip.y, spin);
}

/** The head of the tucked body from its center, and how far out the trail rides it. */
const HEAD_ARM = (() => {
  const { head } = solve(TUCK, RIFF_BODY);
  return at(head.x - BALL.x, head.y - BALL.y);
})();
const TRAIL_RADIUS = Math.hypot(HEAD_ARM.x, HEAD_ARM.y) + 3;

/**
 * Her trail: a crescent along the arc the head and the fringe sweep, from the spin `from` to
 * `to`, its tail thinning out behind the head.
 */
function crescent(from: number, to: number): Effect {
  const start = Math.atan2(HEAD_ARM.y, HEAD_ARM.x);
  const points = [0, 0.25, 0.5, 0.75, 1].map((t): [number, number] => {
    const a = start - rad(from + (to - from) * t);
    return [CENTER.x + TRAIL_RADIUS * Math.cos(a), CENTER.y + TRAIL_RADIUS * Math.sin(a)];
  });
  return smear(5, ...points);
}

function trailed(pose: Pose, ...effects: Effect[]): Pose {
  return { ...pose, effects };
}

export const POSES: readonly Pose[] = [
  // 0 · The pre-jump (3 ticks).
  LOAD,
  // 1 · Takeoff, long and already tipping forward.
  moved(LAUNCH, -3, 38, 22),
  // 2 · Balling up: the knees snap to the chest, the arms come down round the shins.
  roll(tween(LAUNCH, TUCK, 0.9, ease.out), 115),
  // 3-4 · Balled up, over the top, the fastest frames: the crescent of her head and fringe.
  trailed(roll(TUCK, 215), crescent(140, 215)),
  trailed(roll(TUCK, 300), crescent(235, 300)),
  // 5 · Out of the ball into the split, the head coming up (the spin counted from -360, so the
  // face is the drawing).
  moved(SPLIT, -3.5, 37.5, -20),
  // 6 · Falling, ready to land (held): the jump's fall.
  FALL,
];
