import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, toeOf, type Effect, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * intro: 10 frames, 10, 8, 8, 8, 10, 8, 8, 10, 10, 10 ticks (90, the round announcement). The
 * old Riff turned her cap round; the punk flicks her fringe: she stands there like she owns the
 * block, a hand on her hip, whips her head back to toss the fringe off her face, and with the hand
 * still on the hip offers the other one palm up, « come on », then drops into her guard on the
 * beat. Three acted beats, each with its anticipation (B. Jenet's and Iori's swagger, Elena's
 * ease):
 *
 * - 0 · the pose (10 ticks): the reference's stance, the weight back on the rear leg, the lead
 *   leg long in front, the hips pushed forward and the shoulders back, the rear fist on the hip
 *   (akimbo, the elbow out at the waist), the lead arm hanging loose in front of the hip (a soft
 *   elbow, under the shoulder); chin up, the lid half down: unimpressed.
 * - 1 · the dip, the lowest point: the hips drop 4.4 px with both knees giving, the chest
 *   pitches in 27 degrees, so the whole head goes 6 px down and 15 px forward (the chin tuck,
 *   read by the head's travel: the drawing stays upright, at 19 degrees on screen); the fringe
 *   falls forward over the face. The rear fist rides the hip, the lead arm swings loose with the
 *   pitch.
 * - 2 · the toss, the whip out of it: the hips thrown 3 px forward and back up, the chest arched
 *   back, the rear heel popping off the floor, the head whipped back past 20 degrees (RotSprite,
 *   a single frame: a fast move hides it); the fringe flies off the face with the snap of the
 *   whole body (its spring, index.ts). The lead hand opens on its way up (overlap).
 * - 3 · the perch: the heel down, the head back under 20 degrees, the weight sunk on the hand on
 *   the hip, the smirk; the lead hand comes up, open.
 * - 4 · the offer (10 ticks): the lead hand held out palm up at the opponent at shoulder height,
 *   the arm long (80 % of its reach), the chest squared at him, the chin up, the rear fist still
 *   on the hip.
 * - 5 · the curl: the fingers close and the fist pulls back 8 px, up toward the shoulder, the
 *   wrist flicking up, while the hips lean in against it; the look from under the lid (`cool`):
 *   come on.
 * - 6 · she lets go: the rear fist comes off the hip and up under the chin, where the guard holds
 *   it, the lead fist drops in front of the belly, the rear foot kicks off back toward its mark,
 *   toe down, the leg all but straight (96 %: its knee bends on the landing without a pop); the
 *   look cool.
 * - 7 · the drop (10 ticks): she lands in her plié lower than the guard (the overshoot), the
 *   rear foot on its ball on the guard's mark, the knee forward, the chest pitched in, the
 *   shoulder up into the collar; dust off the rear boot and a ring of her energy flattened on
 *   the floor: her beat.
 * - 8 · the settle: she comes up a hair past the guard, the rear fist overshooting a touch
 *   forward; the ring spreads and fades.
 * - 9 · GUARD exactly: idle's frame 0 follows without a pop.
 *
 * The lead foot never leaves the guard's mark; the rear one stands flat until it kicks back
 * (its heel pops on the toss). No limb is clamped straight. From the release on, the rear fist
 * sits under the chin as the guard holds it, in the head's own frame (`atChin`): the face stays
 * clear above the glove whatever the chest does.
 *
 * The rear hand used to go up into her hair, behind her head, the elbow winging out back at the
 * height of the head: seen three quarters it read as an arm folded backward (the owner turned it
 * down). Her head sits 14 px over the shoulders for an 11.4 px upper arm, so no hand on her head
 * keeps its elbow bending the right way without the arm crossing her face: the head toss alone
 * carries the hair flick, and the hand stays on the hip, where an elbow out at the waist reads as
 * the swagger it is.
 *
 * The lead arm (behind the body) hangs and rises in front of her, its elbow under the shoulder or
 * ahead of it, never behind: folded with the upper arm pulled back, its elbow stuck out of her
 * back and read as a broken arm (the owner's call). It hangs soft (the stance, the dip), opens
 * forward on its way up (the toss, the perch), reaches out (the offer), curls, and drops into
 * the guard's fold, the elbow down in front of the ribs.
 */

/** The rear foot where she stands, flat, the weight on it. */
const REAR = planted(-11.5);

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** `p` given in a frame turned `degrees` clockwise (a lean in), back on screen. */
function fromFrame(p: Point, degrees: number): Point {
  const a = rad(degrees);
  return at(p.x * Math.cos(a) + p.y * Math.sin(a), -p.x * Math.sin(a) + p.y * Math.cos(a));
}

/** `p` on screen, in a frame turned `degrees` clockwise (the inverse of fromFrame). */
function intoFrame(p: Point, degrees: number): Point {
  return fromFrame(p, -degrees);
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
  farFist: at(3.7, 34.1),
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
  twist: 0.65,
  face: 'cool',
};

/**
 * The rear fist on the hip, from the hips (STAND's), in a frame that turns half as far as the
 * chest: the pelvis follows the lean only partway, so the glove stays on the side of the hip.
 */
const HIP_TURN = 0.5;
const HIP_HAND = intoFrame(
  at(STAND.nearFist.x - STAND.hip.x, STAND.nearFist.y - STAND.hip.y),
  STAND.torso * HIP_TURN,
);

/** `pose` with the rear fist on its hip, nudged by (dx, dy). */
function onHip(pose: Pose, dx = 0, dy = 0): Pose {
  const d = fromFrame(HIP_HAND, pose.torso * HIP_TURN);
  return { ...pose, nearFist: at(pose.hip.x + d.x + dx, pose.hip.y + d.y + dy) };
}

/** Where the guard holds the rear wrist under the chin, in the head's frame (as drawn). */
const CHIN = (() => {
  const { head } = solve(GUARD, RIFF_BODY);
  return intoFrame(
    at(GUARD.nearFist.x - head.x, GUARD.nearFist.y - head.y),
    GUARD.torso + GUARD.head,
  );
})();

/**
 * `pose` with the rear fist under the chin as the guard holds it, nudged by (dx, dy): wherever
 * the chest and the head go, the face stays clear above the glove.
 */
function atChin(pose: Pose, dx = 0, dy = 0): Pose {
  const { head } = solve(pose, RIFF_BODY);
  const d = fromFrame(CHIN, pose.torso + pose.head);
  return { ...pose, nearFist: at(head.x + d.x + dx, head.y + d.y + dy) };
}

// 1 · The dip: the knees give, the chest pitches in, the chin tucks, the fringe falls forward;
// the rear fist stays on the hip, the lead hand hangs loose.
const DIP: Pose = onHip({
  ...STAND,
  hip: at(-6, 29.8),
  torso: 20,
  head: -1,
  shrug: 1.8,
  farFist: at(8.6, 25.8),
  twist: 0.4,
  face: 'focus',
});

// 2 · The toss: the hips thrown forward and up, the chest arched, the head whipped back; the
// rear fist still on the hip, the lead hand opening on its way up (overlap).
const TOSS: Pose = onHip({
  ...STAND,
  hip: at(-3, 34.6),
  torso: -14,
  head: -12,
  shrug: 0.4,
  nearFoot: onBall(toeOf(REAR), -22),
  farFist: at(10.5, 39.5),
  farHand: 'open',
  twist: 0.75,
  face: 'cool',
});

// 3 · The perch: the heel down, the head back under 20 degrees, the weight sunk on the hand
// on the hip, the smirk; the lead hand comes up open (overlap).
const PERCH: Pose = onHip({
  ...TOSS,
  hip: at(-4.4, 34.7),
  torso: -8,
  head: -8,
  nearFoot: REAR,
  farFist: at(14.2, 45.8),
  face: 'smirk',
});

// 4 · The offer: the lead hand held out palm up at the opponent, the chest squared at him, the
// rear fist still on the hip.
const OFFER: Pose = onHip({
  ...PERCH,
  hip: at(-3.5, 34.8),
  torso: 4,
  head: -14,
  farFist: at(20, 52.5),
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
  twist: 0.2,
});

// 5 · The curl: the fingers close and the fist pulls back up to the shoulder, the hips lean in.
const CURL: Pose = onHip({
  ...OFFER,
  hip: at(-2, 34.5),
  torso: 7,
  head: -16,
  farFist: at(13.5, 57),
  farHand: 'fist',
  face: 'cool',
});

// 6 · She lets go: the rear fist comes off the hip and up under the chin, the lead fist drops in
// front of the belly, the rear foot kicks off back toward its mark.
const RELEASE: Pose = atChin({
  ...OFFER,
  hip: at(-5.4, 34.8),
  torso: 8,
  head: -5,
  shrug: 1.2,
  nearFoot: { x: -23, y: 8.5, angle: -22 },
  farFist: at(10.8, 47),
  farHand: 'fist',
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front' },
  twist: 0.55,
  face: 'cool',
});

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

// 7 · The drop: below the guard, the chest in, the shoulder up into the collar, the rear fist
// sunk a touch with the weight.
const DROP: Pose = atChin(
  {
    ...GUARD,
    hip: at(-7.2, 29.4),
    torso: 23,
    head: -12,
    shrug: 3,
    // The lead fist low in front of the belly.
    farFist: at(9.5, 41),
    face: 'cool',
    effects: [dust(0.2), ring(0.25)],
  },
  0.2,
  -0.6,
);

// 8 · The settle: a hair past the guard, the rear fist overshooting a touch forward.
const SETTLE: Pose = atChin(
  {
    ...GUARD,
    hip: at(-6.8, 32.6),
    torso: 18,
    head: -10,
    farFist: at(9.5, 46.5),
    effects: [dust(0.6), ring(0.65)],
  },
  0.6,
  0.2,
);

export const POSES: readonly Pose[] = [
  STAND,
  DIP,
  TOSS,
  PERCH,
  OFFER,
  CURL,
  RELEASE,
  DROP,
  SETTLE,
  GUARD,
];
