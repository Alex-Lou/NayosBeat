import type { Point } from '../../raster.ts';
import { solve, type Bend, type Bends, type Effect, type Face, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, onHeel, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * chainHeavy (Coup de boule, H, H; docs/combos-v3.md §4): 6 frames, 2, 2, 2, [2], 7, 7 ticks (22:
 * 6/2/14, src/art/riff/clips.ts), the forehead in on frame 3 (ticks 6-7, the
 * hitstop holds it longer), hitbox 8..34 / 50..66. It cancels out of her Coup de coude
 * (standHeavy) on contact, right after its hitstop, so its first frame follows that strip's
 * impact (frames 3-4), not the guard; it ends in her GUARD. The game carries her 12 px forward,
 * 2 px a tick over ticks 0-5 (CARRY: about 3, 7 and 11 px while frames 0, 1 and 2 show, 12 from
 * frame 3): the poses stay anchored, and every foot on the floor is drawn back in the cell by the
 * carry so it stays put on the screen.
 *
 * The headbutt of a street punk, with no hands: she grabs nothing, she throws herself in head
 * first. She bounces back off the elbow, draws her whole body back like a bow, chest out and
 * chin up, then lets it go: the body becomes one spear from the trailing rear boot, off the
 * floor, to the brow, the arms flung back behind her, nothing forward but the forehead. Nothing
 * like her pummel (her fists in his collar, a short tap rocking back « cool ») nor her Coude (the
 * elbow wheeling round the chest on a planted lunge): the only blow of hers whose arms go
 * backward, and her only lunge that leaves the floor behind her.
 *
 * - 0 (2 ticks): the recoil off the elbow, half the Coude's unwind: the hips rise and draw back
 *   under her, the torso comes back to 23 degrees, the chest half open; the rear arm unfolds out
 *   of its elbow and drops in front of her, the elbow down at her side, the fist low in front of
 *   the chest (with the chin thrown up, a fist left folded at the collar sat on her face; folded
 *   under the elbow's line, it read as an arm bent the wrong way); the lead hand pulled back to
 *   the hip, its elbow behind. The chin goes up and back (the head 22 degrees back on screen, past
 *   stamp.ts's upright tolerance: she looks down her nose at him). The lead foot stays where the
 *   Coude stamped it, the rear one pushes on its ball.
 * - 1 (2 ticks): the bow, the deepest load: the hips drive in and down under the shoulders, which
 *   lean back, the chest pushed out (the open jacket wide), the chin still up; both arms swung
 *   back and down behind her, the elbows soft (the shoulders 50 to 55 degrees back, as far as
 *   they open: higher, the arms would come out of her back); the rear leg straight, pushing on
 *   its ball, the lead foot reaching out a long step.
 * - 2 (2 ticks): the drive: the bow snaps, the torso pitches 32 degrees and the head comes
 *   through (a magenta trail behind it), the lead heel strikes the floor (dust), the rear toe
 *   peels off the floor, the leg trailing straight; the arms sweep on back; `effort`.
 * - 3 (2 ticks, the hitstop holds it): impact. One line from the rear boot, off the floor behind
 *   her, to the forehead: the torso at 52 degrees, the chin tucked so the brow leads (the head
 *   turned 28 degrees forward: RotSprite, as on her pummel's impact), the shoulders hunched, the
 *   arms flung back like wings (as far as the shoulders open), the trailing boot pointed down
 *   off the push, its ankle 30 degrees past square (a boot does not point further). The forehead at the hitbox's far edge, a big
 *   silver star bursting off the tip of the brow, clear of the eye, and a tall shockwave pushed
 *   forward off it: a string's heavy hit, not the pummel's tap. The trail closes on the head.
 * - 4 (7 ticks): the rebound: the head snaps back off the contact, the chin jerked up (« come
 *   on »: the cocky beat), while the body still hangs forward over the blow (the torso at 27
 *   degrees) and the hips stay in; the rear boot lands under her, up on its ball, the lead foot
 *   easing back; the arms snap back to her guard's, the rear elbow down on the ribs and the fist
 *   under the chin. The game's own hit spark carries the contact, the dust of the stamp
 *   settles.
 * - 5 (7 ticks): her guard, the hips a pixel low.
 *
 * The fringe and the belt chain are springs (index.ts): they stream back on the drive and the
 * impact, then fling forward over her head as it snaps back on frame 4. The forehead is the body
 * layer's farthest point in the hitbox's band (36 px on frame 3); the trail ends at the head's
 * center, behind the brow, so it adds no reach of its own.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** How far the game has carried her while each frame shows (2 px a tick over ticks 0-5). */
const CARRY = [3, 7, 11, 12, 12, 12] as const;

/** Where the Coude's lead foot stamped (standHeavy.ts): the lead foot's place on frame 0. */
const STAMP = 15;

/** Where the lead foot lands on the screen after its step (its ankle, from the Coude's origin). */
const LANDING = 24;

/** A limb by its angles: the upper bone and the lower one, degrees from forward (y up). */
interface Angles {
  readonly upper: number;
  readonly lower: number;
  /** A foot's own angle (legs only). */
  readonly foot?: number;
}

const angles = (upper: number, lower: number, foot?: number): Angles =>
  foot === undefined ? { upper, lower } : { upper, lower, foot };

/**
 * An arm by its angles on the torso, as a body measures them: the upper arm `shoulder` degrees
 * from hanging (90 straight out in front, 180 overhead, negative behind the back: never past
 * 60 there, the shoulder does not open further), the elbow flexed `elbow` degrees (the forearm
 * folding toward the front of the upper arm, never past 150; never negative, the arm bent the
 * wrong way).
 */
interface Arm {
  readonly shoulder: number;
  readonly elbow: number;
}

const arm = (shoulder: number, elbow: number): Arm => ({ shoulder, elbow });

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly twist: number;
  /** The rear shoulder driven round toward the front (world px), as the Coude does. */
  readonly turn?: number;
  /** The rear leg (camera side): a foot, or its angles from the hip. */
  readonly near: Foot | Angles;
  /** The lead foot. */
  readonly far: Foot;
  /** The rear arm (camera side): its fist, or its angles on the torso. */
  readonly rear: Point | Arm;
  /** The lead arm: its fist, or its angles on the torso. */
  readonly lead: Point | Arm;
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

const r = (d: number) => (d * Math.PI) / 180;

/** Two bones from `from` by their angles: the joint between them and the end. */
function chain(from: Point, a: number, b: number, upper: number, lower: number) {
  const joint = at(from.x + a * Math.cos(r(upper)), from.y + a * Math.sin(r(upper)));
  const end = at(joint.x + b * Math.cos(r(lower)), joint.y + b * Math.sin(r(lower)));
  return { joint, end };
}

/** The trial whose limb bends the way that puts its joint nearest `joint`. */
function nearest(trials: readonly Pose[], jointOf: (pose: Pose) => Point, joint: Point): Pose {
  let best = trials[0] ?? GUARD;
  let error = Infinity;
  for (const trial of trials) {
    const e = jointOf(trial);
    const d = Math.hypot(e.x - joint.x, e.y - joint.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

function key(k: Key): Pose {
  let pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: k.turn ? { near: k.turn } : {},
    twist: k.twist,
    nearFoot: 'upper' in k.near ? GUARD.nearFoot : k.near,
    farFoot: k.far,
    nearFist: 'shoulder' in k.rear ? GUARD.nearFist : k.rear,
    farFist: 'shoulder' in k.lead ? GUARD.farFist : k.lead,
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('upper' in k.near) {
    // The rear leg by its angles (forward kinematics), with the knee bend that fits.
    const leg = k.near;
    const hip = solve(pose, RIFF_BODY).near.hip;
    const { joint, end } = chain(hip, RIFF_BODY.thigh, RIFF_BODY.shin, leg.upper, leg.lower);
    const foot: Foot = { x: end.x, y: end.y, angle: leg.foot ?? 0 };
    const base = pose;
    pose = nearest(
      BENDS.map((bend) => ({ ...base, nearFoot: foot, bends: { ...base.bends, nearKnee: bend } })),
      (trial) => solve(trial, RIFF_BODY).near.knee,
      joint,
    );
  }
  if ('shoulder' in k.lead) pose = armAt(pose, 'far', k.lead);
  if ('shoulder' in k.rear) pose = armAt(pose, 'near', k.rear);
  return pose;
}

/**
 * `pose` with one arm placed by its angles on the torso (forward kinematics), with the elbow
 * bend that keeps the elbow where the angles put it.
 */
function armAt(pose: Pose, side: 'near' | 'far', angles: Arm): Pose {
  const s = solve(pose, RIFF_BODY);
  const down = (Math.atan2(-s.up.y, -s.up.x) * 180) / Math.PI;
  const upper = down + angles.shoulder;
  const { joint, end } = chain(
    s[side].shoulder,
    RIFF_BODY.upperArm,
    RIFF_BODY.forearm,
    upper,
    upper + angles.elbow,
  );
  return nearest(
    BENDS.map((bend): Pose =>
      side === 'near'
        ? { ...pose, nearFist: end, bends: { ...pose.bends, nearElbow: bend } }
        : { ...pose, farFist: end, bends: { ...pose.bends, farElbow: bend } },
    ),
    (trial) => solve(trial, RIFF_BODY)[side].elbow,
    joint,
  );
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const headOf = (k: Key) => solve(key(k), RIFF_BODY).head;

// 0: the recoil off the elbow, chin up, the rear arm unfolding and dropping in front of her.
const RECOIL: Key = {
  hip: [-0.5, 31],
  torso: 23,
  look: -22,
  shrug: 3,
  twist: 0.2,
  turn: 4,
  near: onBall(TOE - CARRY[0], -40),
  far: planted(STAMP - CARRY[0]),
  rear: arm(40, 120),
  lead: arm(-30, 110),
};

// 1: the bow, the deepest load: the hips in, the shoulders and the chin back, the arms behind.
const BOW: Key = {
  hip: [1.5, 29.5],
  torso: -6,
  look: -22,
  shrug: 1.6,
  twist: 0.9,
  turn: -1,
  near: onBall(TOE - CARRY[1], -55),
  far: lifted(planted(LANDING - CARRY[1] - 1.5, -6), 2),
  rear: arm(-55, 30),
  lead: arm(-50, 35),
};

// 2: the drive: the head comes through, the lead heel strikes, the rear toe peels off.
const DRIVE: Key = {
  hip: [2, 31.8],
  torso: 32,
  look: 16,
  shrug: 3.2,
  twist: 0.15,
  near: angles(225, 219, -60),
  far: onHeel(planted(LANDING - CARRY[2]), 12),
  rear: at(-8, 46),
  lead: at(-4, 40),
  bends: { nearElbow: 'up', farElbow: 'up' },
  face: 'effort',
};

// 3: impact, one line from the rear boot in the air to the brow, the arms flung back.
const IMPACT: Key = {
  hip: [0.4, 33],
  torso: 52,
  look: 28,
  shrug: 3.6,
  twist: -0.15,
  near: angles(220, 216, -84),
  far: planted(LANDING - CARRY[3]),
  rear: at(-2.3, 46.8),
  lead: at(0, 38),
  bends: { nearElbow: 'up', farElbow: 'up' },
  face: 'effort',
};

// 4: the rebound: the head snaps back, chin up, the body still forward, the rear boot down.
const REBOUND: Key = {
  hip: [-0.5, 33.6],
  torso: 27,
  look: -22,
  shrug: 2.8,
  twist: 0.5,
  near: onBall(TOE, -48),
  far: lifted(planted(8.6, -8), 1),
  rear: arm(40, 124),
  lead: arm(18, 140),
};

// 5: the guard, a pixel low.
const SETTLE: Key = {
  hip: [-6.8, 31.2],
  torso: 18.5,
  look: 9,
  shrug: 2.2,
  twist: 0.45,
  near: onBall(TOE, -13),
  far: planted(GUARD.farFoot.x),
  rear: arm(39, 128),
  lead: at(9.5, 45.6),
};

/** Where the head travels: the trail behind it follows its path. */
const H1 = headOf(BOW);
const H2 = headOf(DRIVE);
const H3 = headOf(IMPACT);

/** Where the head was on frame `from`, seen from frame `frame`: back by the carry since. */
const was = (head: Point, from: number, frame: number, dy = 1): [number, number] => [
  head.x - ((CARRY[frame] ?? 0) - (CARRY[from] ?? 0)),
  head.y + dy,
];

/** The head drawn back in the bow, seen from the drive. */
const DRAWN_BACK = was(H1, 1, 2);

/** The point of contact, off the tip of the brow. */
const CONTACT = at(H3.x + 12.5, H3.y + 8.5);

export const POSES: readonly Pose[] = [
  key(RECOIL),
  key(BOW),
  key({
    ...DRIVE,
    effects: [
      smear(5, DRAWN_BACK, [(DRAWN_BACK[0] + H2.x) / 2, H2.y + 3], [H2.x, H2.y + 1]),
      dust(LANDING - CARRY[2] + 1, 2.5, 0.1),
    ],
  }),
  key({
    ...IMPACT,
    effects: [
      smear(6, was(H1, 1, 3), was(H2, 2, 3), [H3.x, H3.y + 1]),
      { kind: 'flash', center: at(CONTACT.x + 0.5, CONTACT.y), radius: 6, tone: 'strike' },
      { kind: 'ring', center: CONTACT, radius: 15, progress: 0.25, tone: 'strike', squash: 1.5 },
      dust(LANDING - CARRY[3] + 1, 3, 0.35),
    ],
  }),
  key({ ...REBOUND, effects: [dust(LANDING - CARRY[4] + 1, 3, 0.7)] }),
  key(SETTLE),
];
