import type { Point } from '../../raster.ts';
import { solve, type Bend, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * standHeavy (Coude): 7 frames, 2, 2, 2, 3, 4, 5, 5 ticks (23), the elbow lands on frame 3
 * (ticks 6-8), hitbox 9..43 / 40..58. « Coude tournant en avançant »: the loaded rear arm of her
 * guard is the weapon. She lunges in on the lead foot and turns the whole body through the
 * blow: the hips go first, the shoulders after them, the rear shoulder whipping all the way
 * round to the front, and the elbow swings round flat at shoulder height, under the chin, the
 * fist folded back at the collar: a horizontal wheel round the chest, nothing like the Revers'
 * overhead arc (and no overhead tell: it hits mid). The lead hand tears back to the ribs (the
 * pull that turns the shoulders). A street brawler's blow, with a dancer's turn.
 *
 * - 0: the coil: the weight sits back, the chest opens to the viewer, the cocked elbow draws
 *   back a little further, the lead hand reaches out to measure.
 * - 1: the hips go: the lead foot steps in, the hips drive forward while the shoulders stay
 *   back, the elbow drawn back level (the wing at its widest), the fist folded at the collar,
 *   clear of the face.
 * - 2: the shoulders whip round: the lead foot stamps (dust), the rear shoulder comes through,
 *   the elbow passes level in front of the chest, under the chin; a flat trail from behind her.
 * - 3: impact, the lunge at full stretch: the elbow level at the opponent's chest, the rear
 *   shoulder all the way round, the chest turned away, the jaw set; the flat trail wraps round
 *   the chest and closes on the elbow, a gold flash on its tip.
 * - 4: the elbow sinks on through, the body still turning.
 * - 5: the lead foot steps back, the hips with it, the elbow folding down and back in front of
 *   the chest, the fist up by the chin.
 * - 6: back in the guard, a hair low.
 *
 * The rear arm is placed by its angles (nearArm) so the elbow, not the fist, travels on the
 * arc. The rear foot pivots on its ball, the heel rising as the hips drive (it never slides);
 * the lead foot is lifted for each step. The head rides the lean, under 20 degrees on screen.
 * The lunge carries the hips 9 px forward (the « en avançant » of §11.3): the drawn elbow lands
 * 5.5 px short of the hitbox's far edge, its trail and flash reach it.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/**
 * The rear arm placed by its angles (forward kinematics): the upper arm `upper` degrees from
 * forward (counterclockwise, y up), the forearm `fore` degrees. Returns the pose with the fist
 * and the elbow bend that put the elbow there.
 */
function nearArm(pose: Pose, upper: number, fore: number): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  const r = (d: number) => (d * Math.PI) / 180;
  const elbow: Point = {
    x: shoulder.x + RIFF_BODY.upperArm * Math.cos(r(upper)),
    y: shoulder.y + RIFF_BODY.upperArm * Math.sin(r(upper)),
  };
  const fist = at(
    elbow.x + RIFF_BODY.forearm * Math.cos(r(fore)),
    elbow.y + RIFF_BODY.forearm * Math.sin(r(fore)),
  );
  let best: Bend = 'down';
  let error = Infinity;
  for (const bend of BENDS) {
    const trial = solve(
      { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: bend } },
      RIFF_BODY,
    ).near.elbow;
    const e = Math.hypot(trial.x - elbow.x, trial.y - elbow.y);
    if (e < error) {
      error = e;
      best = bend;
    }
  }
  return { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: best } };
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
  /** The lead fist. */
  readonly far: readonly [number, number];
  /** The rear arm: upper arm and forearm angles. */
  readonly arm: readonly [number, number];
  readonly face?: Pose['face'];
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  return nearArm(
    {
      ...GUARD,
      hip: at(k.hip[0], k.hip[1]),
      torso: k.torso,
      head: k.head,
      shrug: k.shrug,
      reach: { near: k.turn },
      twist: k.twist,
      nearFoot: onBall(TOE, k.heel),
      farFoot: k.lead,
      farFist: at(k.far[0], k.far[1]),
      ...(k.face ? { face: k.face } : {}),
      ...(k.effects ? { effects: k.effects } : {}),
    },
    k.arm[0],
    k.arm[1],
  );
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
    far: [11.5, 47],
    arm: [210, 90],
  },
  // 1: the hips go, the shoulders stay back: the elbow drawn back level, the fist at the collar.
  {
    hip: [-4.6, 31.4],
    torso: 22,
    head: -10,
    turn: -1.5,
    shrug: 3.2,
    twist: 0.7,
    heel: -20,
    lead: { x: 11.5, y: 8.5, angle: 8 },
    far: [11, 44],
    arm: [185, 2],
  },
  // 2: the stamp; the shoulders whip round, the elbow passes level under the chin.
  {
    hip: [-1, 30.2],
    torso: 32,
    head: -15,
    turn: 3,
    shrug: 3.4,
    twist: -0.15,
    heel: -32,
    lead: planted(STAMP),
    far: [9.5, 39],
    arm: [-12, 182],
    effects: [smear(5, [-14, 52], [-4, 50.5], [7, 48.5], [17, 47.5]), dust(STAMP + 1, 3, 0.1)],
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
    far: [10, 37],
    arm: [14, 184],
    face: 'effort',
    effects: [
      smear(6, [-12, 48], [0, 44], [14, 43], [26, 44.5], [33, 45]),
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
    far: [10, 37],
    arm: [-25, 160],
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
    far: [9, 42],
    arm: [-61, 112],
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
    far: [9.3, 45.6],
    arm: [215, 88],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
