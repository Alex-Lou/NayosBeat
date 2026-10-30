import type { Point } from '../../raster.ts';
import { solve, type Bend, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * standHeavy (Coude): 7 frames, 2, 2, 2, 3, 4, 5, 5 ticks (23), the elbow lands on frame 3
 * (ticks 6-8), hitbox 9..43 / 40..58. « Coude tournant en avançant »: the rear arm of her guard
 * is the weapon, the elbow already down on the ribs and the fist under the chin. She lunges in
 * on the lead foot and turns the whole body through the blow: the hips go first, the shoulders
 * after them, the rear shoulder whipping all the way round to the front and carrying the elbow
 * with it, up off the ribs and round to the opponent's chest at shoulder height, the fist
 * folded back under the chin: a wheel round the chest, nothing like the Revers' whip (and no
 * overhead tell: it hits mid). The power is the turn, not a wind-up of the arm: the elbow never
 * goes behind her (seen side on, an elbow drawn back level with the forearm standing read as an
 * arm folded backward). The lead hand tears back to the hip, its elbow driving back (the pull
 * that turns the shoulders). A street brawler's blow, with a dancer's turn.
 *
 * - 0: the coil: the weight sits back, the chest opens to the viewer, the rear shoulder draws
 *   back a little, the arm still home (the elbow on the ribs, the fist under the chin), the lead
 *   hand reaches out to measure.
 * - 1: the hips go: the lead foot steps in, the hips drive forward while the shoulders stay
 *   back (the rear shoulder drawn back as far as it goes, the chest wide open), the arm tucked
 *   tight to the body, the elbow starting to lift off the ribs.
 * - 2: the shoulders whip round: the lead foot stamps (dust), the rear shoulder comes through
 *   and the elbow swings up in front of the chest, the forearm angled up at the opponent, the
 *   fist low in front of the chin (folded up any tighter, it sat on the face); a flat trail
 *   round the chest behind it.
 * - 3: impact, the lunge at full stretch: the elbow level at the opponent's chest, the rear
 *   shoulder all the way round, the chest turned away, the jaw set, the forearm folded back up
 *   (148 degrees, short of the biceps), the fist under the chin; the flat trail wraps round the
 *   chest and closes on the elbow, a gold flash on its tip.
 * - 4: the elbow sinks on through, the body still turning: the upper arm drops, the forearm
 *   stands up in front of the chest.
 * - 5: the lead foot steps back, the hips with it, the elbow folding down in front of the
 *   chest, the fist in front of the chin, clear of the face.
 * - 6: back in the guard, a hair low.
 *
 * The arms are placed by their angles on the torso (armAt) so the elbow, not the fist, travels
 * on the arc, and no joint goes past what a body does: the shoulder never more than 60 degrees
 * behind the back, the elbow folded the way an elbow folds and never past 150. The rear foot
 * pivots on its ball, the heel rising as the hips drive (it never slides);
 * the lead foot is lifted for each step. The head rides the lean, under 20 degrees on screen.
 * The lunge carries the hips 9 px forward (the « en avançant » of §11.3): the drawn elbow lands
 * 5.5 px short of the hitbox's far edge, its trail and flash reach it.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/**
 * `pose` with one arm placed the way a shoulder and an elbow move it (forward kinematics), the
 * angles taken on the torso, as a body measures them: the upper arm `shoulder` degrees from
 * hanging (90 straight out in front, 180 overhead, negative behind the back), the elbow flexed
 * `elbow` degrees (the forearm folding toward the front of the upper arm, never past 150: the
 * forearm would sink into the biceps; never negative, the arm bent the wrong way). The fist
 * goes where that puts it, with the elbow bend that keeps the elbow where the angles put it.
 */
function armAt(pose: Pose, side: 'near' | 'far', shoulder: number, elbow: number): Pose {
  const s = solve(pose, RIFF_BODY);
  const root = s[side].shoulder;
  const r = (d: number) => (d * Math.PI) / 180;
  const upper = Math.atan2(-s.up.y, -s.up.x) + r(shoulder);
  const fore = upper + r(elbow);
  const joint: Point = {
    x: root.x + RIFF_BODY.upperArm * Math.cos(upper),
    y: root.y + RIFF_BODY.upperArm * Math.sin(upper),
  };
  const fist = at(
    joint.x + RIFF_BODY.forearm * Math.cos(fore),
    joint.y + RIFF_BODY.forearm * Math.sin(fore),
  );
  let best = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose =
      side === 'near'
        ? { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: bend } }
        : { ...pose, farFist: fist, bends: { ...pose.bends, farElbow: bend } };
    const e = solve(trial, RIFF_BODY)[side].elbow;
    const d = Math.hypot(e.x - joint.x, e.y - joint.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the lead foot stamps (the lunge). */
const STAMP = 15;

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  readonly head: number;
  /** The rear shoulder driven round toward the front (world px). */
  readonly turn: number;
  readonly shrug: number;
  readonly twist: number;
  /** The rear heel's angle on its ball. */
  readonly heel: number;
  readonly lead: Pose['farFoot'];
  /** The lead arm: its fist, or its shoulder and elbow angles (armAt). */
  readonly far: Point | readonly [number, number];
  /** The rear arm: its shoulder and elbow angles (armAt). */
  readonly arm: readonly [number, number];
  readonly face?: Pose['face'];
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.head,
    shrug: k.shrug,
    reach: { near: k.turn },
    twist: k.twist,
    nearFoot: onBall(TOE, k.heel),
    farFoot: k.lead,
    farFist: 'x' in k.far ? k.far : GUARD.farFist,
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const lead = 'x' in k.far ? pose : armAt(pose, 'far', k.far[0], k.far[1]);
  return armAt(lead, 'near', k.arm[0], k.arm[1]);
}

const KEYS: readonly Key[] = [
  // 0: the coil.
  {
    hip: [-7.4, 32.4],
    torso: 17.5,
    head: -8.5,
    turn: -0.8,
    shrug: 2.6,
    twist: 0.7,
    heel: -10,
    lead: planted(GUARD.farFoot.x),
    far: at(11.5, 47),
    arm: [36, 131],
  },
  // 1: the hips go, the shoulders stay back: the arm tucked, the elbow lifting off the ribs.
  {
    hip: [-4.6, 31.4],
    torso: 22,
    head: -10,
    turn: -1.5,
    shrug: 3.2,
    twist: 0.7,
    heel: -20,
    lead: { x: 11.5, y: 8.5, angle: 8 },
    far: [20, 130],
    arm: [42, 117],
  },
  // 2: the stamp; the shoulders whip round, the elbow swings up in front of the chest.
  {
    hip: [-1, 30.2],
    torso: 32,
    head: -15,
    turn: 0.5,
    shrug: 3.4,
    twist: -0.15,
    heel: -32,
    lead: planted(STAMP),
    far: [-30, 110],
    arm: [65, 105],
    effects: [smear(5, [-10, 47], [-2, 45], [7, 43.2], [15, 42.4]), dust(STAMP + 1, 3, 0.1)],
  },
  // 3: impact.
  {
    hip: [2.5, 29.3],
    torso: 42,
    head: -24,
    turn: 10.5,
    shrug: 3.6,
    twist: -0.65,
    heel: -42,
    lead: planted(STAMP),
    far: [-45, 105],
    arm: [146, 148],
    face: 'effort',
    effects: [
      smear(6, [-8, 46], [3, 43.5], [15, 42.5], [26, 44], [33, 45]),
      { kind: 'flash', center: at(38, 45), radius: 4.5, tone: 'strike' },
      dust(STAMP + 1, 3, 0.35),
    ],
  },
  // 4: the elbow sinks on through, the body still turning.
  {
    hip: [1.8, 29],
    torso: 43,
    head: -24,
    turn: 10,
    shrug: 3,
    twist: -0.85,
    heel: -41,
    lead: planted(STAMP),
    far: [-40, 105],
    arm: [72, 140],
    face: 'effort',
    effects: [dust(STAMP + 1, 3, 0.6)],
  },
  // 5: the step back, the elbow folding down and back in front of the chest.
  {
    hip: [-3.5, 30.6],
    torso: 28,
    head: -14,
    turn: 3,
    shrug: 2.5,
    twist: 0.15,
    heel: -24,
    lead: { x: 11, y: 7.6, angle: 6 },
    far: [12, 135],
    arm: [35, 125],
    effects: [dust(STAMP + 1, 3, 0.85)],
  },
  // 6: back in the guard, a hair low.
  {
    hip: [-7.2, 31.7],
    torso: 18,
    head: -9.5,
    turn: 0,
    shrug: 2.2,
    twist: 0.5,
    heel: -13,
    lead: planted(GUARD.farFoot.x),
    far: at(9.3, 45.6),
    arm: [39, 128],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
