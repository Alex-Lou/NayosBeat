import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, smear, type Effect, type Foot, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * victory: 8 frames, 6, 6, 6, 6 then 8 × 4 looping from frame 4. « Freeze sur une main et clin
 * d'œil »: out of the guard she puts her rear fist on her hip, reaches the lead hand up, dives
 * onto it and kicks up into a one-hand crocodile freeze: the lead elbow braced into her belly,
 * the forearm straight down to the palm, the body held level over it and arched (the chest up,
 * the legs up behind), the lead leg long, the rear one curled over the hips toward her head like
 * a scorpion's tail, and the free hand still on the hip, akimbo, the elbow out over her back (one
 * hand is all it takes). The head is held up at the loser on the floor in front of her, and on
 * each beat the lid drops (the wink). Then she holds it, bouncing on the beat (a b-girl's
 * freeze, Christie's and Eddy's win poses, B. Jenet's cheek).
 *
 * The freeze was an inverted one, the hips over the head: its head, kept upright for the wink,
 * sat on the neck at 124 degrees, and its legs bent at the knee the wrong way. A crocodile keeps
 * the head on the neck (chin up, 50 degrees at most) and still on screen under stamp.ts's
 * UPRIGHT_TOLERANCE (the drawing as is: the face and the wink stay crisp); every joint bends its
 * own way: the support elbow folds forward (90 degrees, the upper arm along the belly), the
 * knees fold the shins behind the thighs, the boots point along the shins (a combat boot points
 * 35 degrees past square at most).
 *
 * - 0 · the wind-up: up out of the plié onto the balls of both feet, the chest open, the rear
 *   fist set on the hip, the lead arm reaching up and forward with the hand open: the
 *   anticipation goes up before the dive goes down; the look from under the lid.
 * - 1 · the plant: the lead hand sweeps down in one arc (its trail, from the raised hand to the
 *   floor) and the palm slaps the floor; the body drops forward over the arm (still long, a
 *   little give), both feet off the floor behind, the rear heel kicked up (a trail on the rear
 *   boot), the lead leg swinging up; a puff of dust under the palm.
 * - 2 · the kick-up: the elbow gives under her, the body a pixel below the freeze, the legs
 *   whipping up past it (the trail of the lead boot), the rear knee folding.
 * - 3 · the lock: everything settles onto the freeze, the hips caught half a pixel low; the dust
 *   settling; the first wink.
 * - 4-7 · the freeze bounce, one beat per loop: on the beat (4) she sinks a pixel on the arm,
 *   the scorpion foot pumps toward her head, the wink; then she rises back over three frames,
 *   the eye open on the loser; a ring of her energy spreads flat from the palm on each beat.
 *
 * The wink: face.ts has no wink patch yet (the visible eye shut as a curved lash, the brow up,
 * the mouth's corner pulled); until it exists, `smirk` stands in for it (the lid half down with
 * the brow up and the corner of the mouth), played as an event against `focus` (the eye open,
 * as drawn): shut on the lock and on each beat, open on the three frames between.
 *
 * The support is the lead arm: its shoulder sits on the low side of the body, so its upper arm
 * runs back along the belly to the elbow and the forearm stands under it; the free rear arm,
 * drawn over the body, keeps its hand on the hip in view. The palm never moves from PALM once
 * down (frames 1-7) and the arm is never clamped; the head center stays inside the pushbox (at
 * most 7 px forward), the legs inside the cell. In the loop the body moves by whole sprite
 * pixels and the head, the legs and the hand on the hip ride it, so the jacket and the face do
 * not boil; only the support arm flexes.
 */

/** Where the lead palm lands, flat on the floor under her belly. */
const PALM = at(-15.5, 1.6);

/**
 * The free rear hand on the hip, knuckles down on the small of the back (4.5 px up the spine
 * from the hip, 5.75 px to the back), wherever the torso leans: it rides the hips.
 */
function handOnHip(pose: Pose): Pose {
  const lean = (pose.torso * Math.PI) / 180;
  const up = { x: Math.sin(lean), y: Math.cos(lean) };
  return {
    ...pose,
    nearFist: at(pose.hip.x + up.x * 4.5 - up.y * 5.75, pose.hip.y + up.y * 4.5 + up.x * 5.75),
  };
}

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * A leg of `pose` placed by its angles, from its hip joint: the thigh pointing `thigh` degrees
 * (on screen, counterclockwise from forward: 180 is straight back), the knee folding the shin
 * `knee` degrees behind the thigh, the boot pointed `point` degrees past square with the shin.
 */
function leg(pose: Pose, which: 'near' | 'far', thigh: number, knee: number, point: number): Foot {
  const { hip } = solve(pose, RIFF_BODY)[which];
  const shin = thigh - knee;
  const k = {
    x: hip.x + RIFF_BODY.thigh * Math.cos(radians(thigh)),
    y: hip.y + RIFF_BODY.thigh * Math.sin(radians(thigh)),
  };
  return {
    x: k.x + RIFF_BODY.shin * Math.cos(radians(shin)),
    y: k.y + RIFF_BODY.shin * Math.sin(radians(shin)),
    // Square with the shin the sole points 90 degrees round from it; pointing turns it back
    // toward the shin's own line.
    angle: shin + 90 - point,
  };
}

/** The legs of a freeze, by their angles (see leg). */
interface Legs {
  readonly lead: readonly [number, number, number];
  readonly rear: readonly [number, number, number];
}

/** `pose` with its legs set by their angles: they ride its hips. */
function withLegs(pose: Pose, legs: Legs): Pose {
  return {
    ...pose,
    farFoot: leg(pose, 'far', ...legs.lead),
    nearFoot: leg(pose, 'near', ...legs.rear),
  };
}

/**
 * The freeze's legs: the lead leg long behind her, lifted 30 degrees (the arch of the back takes
 * the rest), the knee soft, the boot pointed; the rear one the scorpion's tail, its thigh up
 * behind and its shin folded forward over the hips, the boot pointed at her head.
 */
const FREEZE_LEGS: Legs = { lead: [150, 12, 30], rear: [158, 118, 30] };

/** The freeze: on the lead hand, the elbow in the belly, the body level, the legs up behind. */
const FREEZE: Pose = handOnHip(
  withLegs(
    {
      hip: at(-25, 11.6),
      torso: 69,
      head: -50,
      shrug: 0.5,
      nearFoot: GUARD.nearFoot,
      farFoot: GUARD.farFoot,
      nearFist: at(0, 0),
      farFist: PALM,
      farHand: 'open',
      bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'back', farKnee: 'down' },
      twist: 0.3,
      face: 'focus',
    },
    FREEZE_LEGS,
  ),
);

const dust = (size: number, progress: number): Effect => ({
  kind: 'dust',
  x: PALM.x,
  size,
  progress,
});

// 0 · The wind-up: up on the balls, the chest open, the rear fist on the hip, the lead hand up.
const WIND: Pose = handOnHip({
  ...GUARD,
  hip: at(-6.4, 35),
  torso: 2,
  head: -6,
  shrug: 0.4,
  nearFoot: onBall(-17.5, -24),
  farFoot: onBall(14.2, -16),
  farFist: at(12, 71),
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
  twist: 0.7,
  face: 'cool',
});

// 1 · The plant: the palm slaps down, the body dropping forward over the arm, the legs off the
// floor behind.
const PLANT: Pose = handOnHip(
  withLegs(
    {
      ...FREEZE,
      hip: at(-29, 14.6),
      torso: 56,
      head: -38,
      bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'down', farKnee: 'down' },
      face: 'effort',
      effects: [
        dust(2.5, 0.1),
        smear(4, [13, 68], [12, 46], [2, 22], [-12, 6]),
        smear(4, [-28, 4], [-40, 8], [-49, 16]),
      ],
    },
    { lead: [152, 26, 30], rear: [212, 92, 30] },
  ),
);

// 2 · The kick-up: the elbow gives, the body a pixel below the freeze, the legs past it.
const KICK: Pose = handOnHip(
  withLegs(
    { ...FREEZE, hip: at(-25, 10.6), face: 'effort' },
    { lead: [140, 14, 32], rear: [150, 108, 30] },
  ),
);
// The scorpion's boot curling up over the hips.
const KICK_TRAIL: Effect = smear(3, [-52, 22], [-47, 30], [-39, 35], [-31, 35]);

// 3 · The lock: back onto the freeze, the hips caught half a pixel low, the wink.
const LOCK: Pose = handOnHip(
  withLegs(
    {
      ...FREEZE,
      hip: at(FREEZE.hip.x, FREEZE.hip.y - 0.5),
      face: 'smirk',
      effects: [dust(3, 0.7)],
    },
    FREEZE_LEGS,
  ),
);

/**
 * The bounce, frame by frame from the beat: how far the body sinks (world px, whole sprite
 * pixels), how far the scorpion's knee folds further (degrees, its boot toward the head), and
 * the beat's ring.
 */
const BOUNCE = [
  { dip: 1, pump: 8, ring: 0.15 },
  { dip: 0.5, pump: 3, ring: 0.4 },
  { dip: 0, pump: 0, ring: 0.65 },
  { dip: 0.5, pump: 0, ring: 0.9 },
] as const;

function bounce(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, pump, ring } = BOUNCE[phase];
  const [thigh, knee, point] = FREEZE_LEGS.rear;
  return handOnHip(
    withLegs(
      {
        ...FREEZE,
        hip: at(FREEZE.hip.x, FREEZE.hip.y - dip),
        // The wink on the beat, the eye open on the loser between.
        face: phase === 0 ? 'smirk' : 'focus',
        effects: [
          {
            kind: 'ring',
            center: at(PALM.x, 1),
            radius: 10,
            progress: ring,
            tone: 'sound',
            squash: 0.35,
          },
        ],
      },
      { lead: FREEZE_LEGS.lead, rear: [thigh, knee + pump, point] },
    ),
  );
}

export const POSES: readonly Pose[] = [
  WIND,
  PLANT,
  { ...KICK, effects: [dust(2.5, 0.4), KICK_TRAIL] },
  LOCK,
  bounce(0),
  bounce(1),
  bounce(2),
  bounce(3),
];
