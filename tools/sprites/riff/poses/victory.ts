import { at, GUARD, onBall, smear, type Effect, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * victory: 8 frames, 6, 6, 6, 6 then 8 × 4 looping from frame 4. « Freeze sur une main et clin
 * d'œil »: out of the guard she puts her rear fist on her hip, reaches the lead hand up, dives
 * onto it and kicks up into a one-hand power freeze: the hips lifted over the straight support
 * arm, the lead leg straight to the sky, the rear one curled forward over the hips toward her
 * head like a scorpion's tail, and the free hand still on the hip, the elbow winging up over her
 * back (one hand is all it takes). The head is held up at the loser, and on each beat the lid
 * drops (the wink). Then she holds it, bouncing on the beat (a b-girl's freeze, Christie's and
 * Eddy's win poses, B. Jenet's cheek).
 *
 * - 0 · the wind-up: up out of the plié onto the balls of both feet, the chest open, the rear
 *   fist set on the hip, the lead arm reaching up and forward with the hand open: the
 *   anticipation goes up before the dive goes down; the look from under the lid.
 * - 1 · the plant: the lead hand sweeps down in one arc (its trail, from the raised hand to the
 *   floor) and the palm slaps the floor; the body pitched head down over the arm (94 % of its
 *   length, a little give), the legs swung up behind (a trail on the rear boot); a puff of dust
 *   under the palm. The head stays inside her pushbox.
 * - 2 · the kick-up: the hips over the top, past the freeze (the torso 6 degrees further over,
 *   the hips 2 px higher), the lead leg whipping up past the vertical (its trail sweeps the arc
 *   from behind her to the sky), the rear leg folding.
 * - 3 · the lock: everything settles back onto the freeze, the hips caught half a pixel low;
 *   the dust settling; the first wink.
 * - 4-7 · the freeze bounce, one beat per loop: on the beat (4) she sinks a pixel on the arm,
 *   the scorpion foot pumps toward her head, the wink; then she rises back over three frames,
 *   the eye open on the loser; a ring of her energy spreads flat from the palm on each beat.
 *
 * The wink: face.ts has no wink patch yet (the visible eye shut as a curved lash, the brow up,
 * the mouth's corner pulled); until it exists, `smirk` stands in for it (the lid half down with
 * the brow up and the corner of the mouth), played as an event against `focus` (the eye open,
 * as drawn): shut on the lock and on each beat, open on the three frames between.
 *
 * The support is the lead arm: its shoulder sits on the low side of the turned chest, so with
 * the arm 95 % straight the hips ride 35 px up (the head at 24, the opponent's knees), and the
 * free rear arm, drawn over the body, keeps its hand on the hip in view. The palm never moves
 * from PALM once down (frames 1-7) and the arm is never clamped; the head stays under 20
 * degrees on screen (the drawing as is) and inside the pushbox (its center at most 7 px
 * forward). In the loop the body moves by whole sprite pixels and the head, the legs and the
 * hand on the hip ride it, so the jacket and the face do not boil; only the support arm flexes.
 */

/** Where the lead palm lands, flat on the floor under its shoulder. */
const PALM = at(-5.5, 1.6);

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

/** The freeze: on the lead hand, the hips up, the lead leg to the sky, the rear one curled. */
const FREEZE: Pose = handOnHip({
  hip: at(-21.5, 35.1),
  torso: 114,
  head: -124,
  shrug: 0.5,
  nearFoot: { x: -9, y: 56, angle: 45 },
  farFoot: { x: -22.5, y: 64.4, angle: 92 },
  nearFist: at(0, 0),
  farFist: PALM,
  farHand: 'open',
  bends: { nearElbow: 'up', farElbow: 'back', nearKnee: 'up', farKnee: 'front' },
  twist: 0.3,
  face: 'focus',
});

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
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'back' },
  twist: 0.7,
  face: 'cool',
});

// 1 · The plant: the palm slaps down, the body pitched head down over it, the legs up behind.
const PLANT: Pose = handOnHip({
  ...FREEZE,
  hip: at(-24.2, 31.8),
  torso: 105,
  head: -110,
  nearFoot: { x: -46, y: 51, angle: 160 },
  farFoot: { x: -51, y: 27, angle: 180 },
  bends: { nearElbow: 'up', farElbow: 'back', nearKnee: 'front', farKnee: 'down' },
  face: 'effort',
  effects: [
    dust(2.5, 0.1),
    smear(4, [13, 68], [16, 46], [8, 22], [-5, 4]),
    smear(4, [-26, 10], [-34, 28], [-44, 48]),
  ],
});

// 2 · The kick-up: the hips over the top, the lead leg past the vertical.
const KICK: Pose = handOnHip({
  ...FREEZE,
  hip: at(-22, 36.6),
  torso: 120,
  head: -128,
  nearFoot: { x: -29, y: 61, angle: 80 },
  farFoot: { x: -14, y: 65, angle: 75 },
  face: 'effort',
  effects: [dust(2.5, 0.4), smear(3, [-52, 24], [-48, 44], [-36, 60], [-16, 68])],
});

// 3 · The lock: back onto the freeze, the hips caught half a pixel low, the wink.
const LOCK: Pose = handOnHip({
  ...FREEZE,
  hip: at(FREEZE.hip.x, FREEZE.hip.y - 0.5),
  face: 'smirk',
  effects: [dust(3, 0.7)],
});

/**
 * The bounce, frame by frame from the beat: how far the body sinks (world px, whole sprite
 * pixels), how far the scorpion foot pumps toward the head, and the beat's ring.
 */
const BOUNCE = [
  { dip: 1, pump: 1.5, ring: 0.15 },
  { dip: 0.5, pump: 0.5, ring: 0.4 },
  { dip: 0, pump: 0, ring: 0.65 },
  { dip: 0.5, pump: 0, ring: 0.9 },
] as const;

function bounce(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, pump, ring } = BOUNCE[phase];
  const { nearFoot, farFoot, hip } = FREEZE;
  return handOnHip({
    ...FREEZE,
    hip: at(hip.x, hip.y - dip),
    nearFoot: { ...nearFoot, x: nearFoot.x + pump, y: nearFoot.y - dip - pump * 0.5 },
    farFoot: { ...farFoot, y: farFoot.y - dip },
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
  });
}

export const POSES: readonly Pose[] = [
  WIND,
  PLANT,
  KICK,
  LOCK,
  bounce(0),
  bounce(1),
  bounce(2),
  bounce(3),
];
