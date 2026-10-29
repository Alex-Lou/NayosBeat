import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, toeOf, type Effect, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * intro: 10 frames, 10, 8, 8, 8, 10, 8, 8, 10, 10, 10 ticks (90, the round announcement). The
 * old Riff turned her cap round; the punk flicks her fringe: she stands there like she owns the
 * block, whips her head back with a hand through her hair, leaves the hand behind her head and
 * offers the other one palm up, « come on », then drops into her guard on the beat. Three
 * acted beats, each with its anticipation (B. Jenet's and Iori's swagger, Elena's ease):
 *
 * - 0 · the pose (10 ticks): the reference's stance, the weight back on the rear leg, the lead
 *   leg long in front, the hips pushed forward and the shoulders back, the rear fist on the hip,
 *   the lead arm hanging loose (a soft elbow); chin up, the lid half down: unimpressed.
 * - 1 · the dip, the lowest point: the hips drop 4.4 px with both knees giving, the chest
 *   pitches in 27 degrees, so the whole head goes 6 px down and 15 px forward (the chin tuck,
 *   read by the head's travel: the drawing stays upright, at 19 degrees on screen); the rear
 *   hand comes up to the back of her head, the elbow winging out; the fringe falls forward over
 *   the face.
 * - 2 · the toss, the whip out of it: the hips thrown 3 px forward and back up, the chest arched
 *   back, the rear heel popping off the floor, the head whipped back past 20 degrees (RotSprite,
 *   a single frame: a fast move hides it), the hand sweeping up over the crown; the fringe flies
 *   off the face with the snap of the whole body (its spring, index.ts).
 * - 3 · the rake: the hand slides back over the shaved side to the back of her head and stays
 *   there, the elbow winging back; the heel down, the head back under 20 degrees, the smirk;
 *   the lead hand starts up (overlap).
 * - 4 · the offer (10 ticks): the lead hand held out palm up at the opponent at shoulder height,
 *   the arm long (80 % of its reach), the chest squared at him, the chin up.
 * - 5 · the curl: the fingers close and the fist pulls back 8 px, up toward the shoulder, the
 *   wrist flicking up, while the hips lean in against it; the look from under the lid (`cool`):
 *   come on.
 * - 6 · she lets go: the rear hand comes down off her head and closes by the ear, the lead fist
 *   drops in front of the belly, the rear foot kicks off back toward its mark, toe down, the leg
 *   all but straight (96 %: its knee bends on the landing without a pop); the look cool.
 * - 7 · the drop (10 ticks): she lands in her plié lower than the guard (the overshoot), the
 *   rear foot on its ball on the guard's mark, the knee forward, the chest pitched in, the
 *   shoulder up into the collar; dust off the rear boot and a ring of her energy flattened on
 *   the floor: her beat.
 * - 8 · the settle: she comes up a hair past the guard, the cocked fist overshooting; the ring
 *   spreads and fades.
 * - 9 · GUARD exactly: idle's frame 0 follows without a pop.
 *
 * The lead foot never leaves the guard's mark; the rear one stands flat until it kicks back
 * (its heel pops on the toss). No limb is clamped straight. The near arm is drawn over the head:
 * the hand stays on the shaved side and the back of the head, never over the face.
 */

/** The rear foot where she stands, flat, the weight on it. */
const REAR = planted(-11.5);

/** The rear hand placed on her head, from the head's center (world px). */
function onHead(pose: Pose, dx: number, dy: number): Pose {
  const head = solve(pose, RIFF_BODY).head;
  return { ...pose, nearFist: at(head.x + dx, head.y + dy) };
}

// 0 · The pose: hips forward, shoulders back, chin up, the rear fist on the hip.
const STAND: Pose = {
  hip: at(-5.6, 34.2),
  torso: -7,
  head: -9,
  shrug: 0.2,
  nearFoot: REAR,
  farFoot: GUARD.farFoot,
  nearFist: at(-11, 38),
  farFist: at(1.5, 35.8),
  bends: { nearElbow: 'back', farElbow: 'back', nearKnee: 'front' },
  twist: 0.65,
  face: 'cool',
};

// 1 · The dip: the knees give, the chest pitches in, the chin tucks, the hand to the head.
const DIP: Pose = onHead(
  {
    ...STAND,
    hip: at(-6, 29.8),
    torso: 20,
    head: -1,
    shrug: 1.8,
    farFist: at(5.5, 29.5),
    twist: 0.4,
    face: 'focus',
  },
  -8,
  -3,
);

// 2 · The toss: the hips thrown forward and up, the chest arched, the head whipped back.
const TOSS: Pose = onHead(
  {
    ...STAND,
    hip: at(-3, 34.6),
    torso: -14,
    head: -12,
    shrug: 0.4,
    nearFoot: onBall(toeOf(REAR), -22),
    farFist: at(1.5, 36.5),
    twist: 0.75,
    face: 'cool',
  },
  -6,
  2.5,
);

// 3 · The rake: the hand back over the shaved side, the heel down, the smirk.
const RAKE: Pose = onHead(
  {
    ...TOSS,
    hip: at(-4.4, 34.7),
    torso: -8,
    head: -8,
    nearFoot: REAR,
    farFist: at(6, 40),
    face: 'smirk',
  },
  -9.5,
  -0.5,
);

// 4 · The offer: the lead hand held out palm up at the opponent, the chest squared at him.
const OFFER: Pose = onHead(
  {
    ...RAKE,
    hip: at(-3.5, 34.8),
    torso: 4,
    head: -14,
    farFist: at(20, 52.5),
    farHand: 'open',
    bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
    twist: 0.2,
  },
  -9.5,
  -1,
);

// 5 · The curl: the fingers close and the fist pulls back up to the shoulder, the hips lean in.
const CURL: Pose = onHead(
  {
    ...OFFER,
    hip: at(-2, 34.5),
    torso: 7,
    head: -16,
    farFist: at(13.5, 57),
    farHand: 'fist',
    face: 'cool',
  },
  -9.5,
  -1,
);

// 6 · She lets go: the fists to their places, the rear foot kicking back off the floor.
const RELEASE: Pose = {
  ...OFFER,
  hip: at(-5.4, 34.8),
  torso: 8,
  head: -5,
  shrug: 1.2,
  nearFoot: { x: -23, y: 8.5, angle: -22 },
  nearFist: at(-12, 61),
  farFist: at(8.5, 43),
  farHand: 'fist',
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front' },
  twist: 0.55,
  face: 'cool',
};

/** Her beat on the floor: a ring of her energy, flattened, between her feet. */
const ring = (progress: number): Effect => ({
  kind: 'ring',
  center: at(-5.5, 1),
  radius: 18,
  progress,
  tone: 'sound',
  squash: 0.3,
});

/** Dust off the rear boot as it lands. */
const dust = (progress: number): Effect => ({ kind: 'dust', x: -19, size: 3, progress });

// 7 · The drop: below the guard, the chest in, the shoulder up into the collar.
const DROP: Pose = {
  ...GUARD,
  hip: at(-7.2, 29.4),
  torso: 23,
  head: -12,
  shrug: 3,
  nearFist: at(-13, 54.5),
  farFist: at(9, 43.5),
  face: 'cool',
  effects: [dust(0.2), ring(0.25)],
};

// 8 · The settle: a hair past the guard, the cocked fist overshooting.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.8, 32.6),
  torso: 18,
  head: -10,
  nearFist: at(-11.5, 59.2),
  farFist: at(9.5, 46.5),
  effects: [dust(0.6), ring(0.65)],
};

export const POSES: readonly Pose[] = [
  STAND,
  DIP,
  TOSS,
  RAKE,
  OFFER,
  CURL,
  RELEASE,
  DROP,
  SETTLE,
  GUARD,
];
