import type { Point } from '../../raster.ts';
import { BODY, solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * forwardHeavy (Overhand, docs/combat-v2.md §5.2, §10.1, §11.2): 9 frames, 4, 4, 4, 4, 3, [3],
 * 5, 5, 5 ticks (37), active frame 5 (ticks 19-21), hitbox x 12..40 / y 36..72, an overhead.
 * The game moves him 8 px over ticks 6-13: the lead foot steps in, the rear one drags on its
 * ball, the poses stay anchored.
 *
 * Slow and telegraphed on purpose (19 ticks), then a hammer. The weight sinks back, the chest
 * turns away and the rear glove cocks back behind the ear, clear of the head, while the lead
 * glove reaches out to measure. He steps in and rises, the bent arm climbing up and back in a
 * loop that a cyan arc already traces; up on the balls of his feet the hips come in under it,
 * the arm loaded high behind the head, for a beat. Then he drops: the chest pitches over, the
 * elbow comes through over the top with the fist trailing above the head, the lead heel slams
 * down and the fist lands on the head at the end of the arm, the elbow high and the knuckles
 * turned down, the lead glove tucked under the chin. The fist carries on down across the body,
 * then he rocks back, the lead foot steps home and the gloves come back up into the guard,
 * handing over to the idle's breath.
 *
 * Line of action: bowed back over the rear leg on the cock, tall on the toes at the top, one
 * long diagonal from the raised rear heel through the hips to the fist on the impact.
 */

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

const LEAD_TOE = toeOf(GUARD.nearFoot);
const REAR_TOE = toeOf(GUARD.farFoot);
/** How far in the lead foot steps (its toe), while the game carries him forward. */
const STEP = 3.5;

type Body = Omit<Pose, 'nearFist' | 'farFist'>;
const sketch = (body: Body): Pose => ({
  ...body,
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
});

/** The rear wrist `length` px from the rear shoulder, `angle` degrees above horizontal. */
function rear(body: Body, length: number, angle: number): Point {
  const { shoulder } = solve(sketch(body)).far;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/**
 * The rear wrist of an arm set by its two angles, in degrees above the horizontal toward the
 * opponent: the upper arm out of the shoulder, then the forearm out of the elbow. The wind-up
 * reads as a bend opening steadily, never an arm that straightens and folds again.
 */
function rearArm(body: Body, upper: number, forearm: number): Point {
  const { shoulder } = solve(sketch(body)).far;
  const u = (upper * Math.PI) / 180;
  const f = (forearm * Math.PI) / 180;
  return at(
    shoulder.x + Math.cos(u) * BODY.upperArm + Math.cos(f) * BODY.forearm,
    shoulder.y + Math.sin(u) * BODY.upperArm + Math.sin(f) * BODY.forearm,
  );
}

/** The lead glove tucked under the chin, in front of the neck, wherever the head goes. */
const CHIN = at(3, -8);
function atChin(body: Body): Point {
  const { head } = solve(sketch(body));
  return at(head.x + CHIN.x, head.y + CHIN.y);
}

/** A point of the rear arm `distance` px past the wrist along the forearm (back up it if < 0). */
function rearAlong(pose: Pose, distance: number): Point {
  const { wrist, forearm } = solve(pose).far;
  return at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
}

/** The middle of the rear glove as drawn, and the front of its knuckles. */
const GLOVE_MIDDLE = 2.6;
const KNUCKLES = 5.4;

/**
 * The overhand's arc: from `tail` along the loop into the rear arm, `into` px past the wrist
 * (the middle of the glove by default).
 */
function arc(
  pose: Pose,
  width: number,
  tail: readonly (readonly [number, number])[],
  into = GLOVE_MIDDLE,
): Effect {
  const end = rearAlong(pose, into);
  return smear(width, ...tail, [end.x, end.y]);
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// Frame 0 (4 ticks): the tell, readable at once. The weight sinks back a touch onto the rear
// foot (its heel coming down), the chest turns away and the rear elbow flares out behind the
// back, the glove cocked behind the ear with clear air between it and the hair; the lead glove
// eases forward.
const LOAD_BODY: Body = {
  ...GUARD,
  hip: at(-8, 35.4),
  torso: 11,
  head: 5,
  shrug: 1.8,
  twist: -0.4,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(REAR_TOE, -10),
};
const LOAD: Pose = {
  ...LOAD_BODY,
  nearFist: at(11.2, 56),
  farFist: rearArm(LOAD_BODY, 172, 72),
  bends: { nearElbow: 'down', farElbow: 'back' },
};

// Frame 1 (4 ticks): cocked. Coiled back over the rear leg, the chest turned away, the rear
// elbow back at shoulder height and the glove up behind the head; the lead glove reaching out
// to measure, the lead foot unweighted, its toe leaving the floor as the step starts.
const COCK_BODY: Body = {
  ...GUARD,
  hip: at(-9, 35.8),
  torso: 7,
  head: 8,
  shrug: 2.2,
  twist: -0.8,
  nearFoot: lifted(onToes(LEAD_TOE, -9), 0.8),
  farFoot: onToes(REAR_TOE, -12),
};
const COCK: Pose = {
  ...COCK_BODY,
  nearFist: at(13, 60),
  farFist: rearArm(COCK_BODY, 148, 70),
  bends: { nearElbow: 'down', farElbow: 'back' },
};

// Frame 2 (4 ticks): the step in (the game carries him), rising: the lead foot reaches in low,
// the rear foot drives off its ball; the chest bows back, the arm climbs up and back still bent,
// the glove behind the crown, and the arc lights up.
const STEP_BODY: Body = {
  ...GUARD,
  hip: at(-8, 39),
  torso: 5,
  head: 10,
  shrug: 2.4,
  twist: -0.85,
  nearFoot: lifted(planted(LEAD_TOE + STEP - 7.6, 5), 2.4),
  farFoot: onToes(REAR_TOE, -24),
};
const CLIMB: Pose = {
  ...STEP_BODY,
  nearFist: at(12.5, 61.5),
  farFist: rearArm(STEP_BODY, 143, 70),
  bends: { nearElbow: 'down', farElbow: 'back' },
};

// Frame 3 (4 ticks): high on the balls of both feet, the hang before the drop: the hips come in
// under the arm, the chest leans over the lead leg and the arm stays loaded back, the elbow
// behind the head and the glove up behind the crown, background all round it.
const TOP_BODY: Body = {
  ...GUARD,
  hip: at(-5.2, 41.2),
  torso: 14,
  head: 3,
  shrug: 2.2,
  twist: -0.5,
  nearFoot: onToes(LEAD_TOE + STEP, -28),
  farFoot: onToes(REAR_TOE, -42),
};
const TOP: Pose = {
  ...TOP_BODY,
  nearFist: at(12.5, 62),
  farFist: rearArm(TOP_BODY, 142, 84),
  bends: { nearElbow: 'down', farElbow: 'back' },
};

// Frame 4 (3 ticks): still on the toes, the drop starts: the chest pitches over, the rear
// shoulder comes through and the arm whips over the top, the elbow leading and the fist
// trailing above the head, the face clear; the lead glove pulls in under the chin.
const OVER_BODY: Body = {
  ...GUARD,
  hip: at(-3.6, 40.5),
  torso: 20,
  head: -3,
  shrug: 1.6,
  reach: { far: 1.5 },
  twist: 0.35,
  nearFoot: onToes(LEAD_TOE + STEP, -26),
  farFoot: onToes(REAR_TOE, -40),
};
const OVER: Pose = {
  ...OVER_BODY,
  nearFist: atChin(OVER_BODY),
  farFist: rearArm(OVER_BODY, 66, 108),
  bends: { nearElbow: 'down', farElbow: 'front' },
};

// Frame 5 (3 ticks, active): the hammer lands. The lead heel slams down, the hips and the chest
// pitch over the lead knee, the rear shoulder thrown through, the arm long, the elbow high and
// the fist turned down on the head; the lead glove tucked under the chin, the jaw set. The trail
// comes down from above the head: the whole loop in one stroke.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(-1.3, 36.8),
  torso: 31,
  head: -12,
  shrug: 1.2,
  reach: { far: 3 },
  twist: 0.85,
  nearFoot: planted(LEAD_TOE + STEP - 7),
  farFoot: onToes(REAR_TOE, -30),
  face: 'effort',
};
const IMPACT_ARM: Pose = {
  ...IMPACT_BODY,
  nearFist: atChin(IMPACT_BODY),
  farFist: rear(IMPACT_BODY, 23, 5),
  bends: { nearElbow: 'down', farElbow: 'up' },
};
const IMPACT_KNUCKLES = rearAlong(IMPACT_ARM, KNUCKLES);
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    // Into the wrist, not the glove: the bow wave and the spray ahead of a stroke this long
    // would burst well past the knuckles, and the fist itself is what lands at the edge.
    arc(
      IMPACT_ARM,
      5,
      [
        [-4, 88],
        [4, 93],
        [15, 92],
        [24, 85],
        [29, 75],
      ],
      0,
    ),
    {
      kind: 'flash',
      center: at(IMPACT_KNUCKLES.x + 2.5, IMPACT_KNUCKLES.y - 0.5),
      radius: 5.5,
      tone: 'strike',
    },
    dust(LEAD_TOE + STEP - 2, 2.6, 0.15),
  ],
};

// Frame 6 (5 ticks): follow-through. The fist carries on down across the body, the weight deep
// on the lead leg, still set, the lead glove still at the chin.
const THROUGH_BODY: Body = {
  ...GUARD,
  hip: at(-1.2, 34.2),
  torso: 35,
  head: -16,
  shrug: 0.8,
  reach: { far: 2.4 },
  twist: 0.75,
  nearFoot: planted(LEAD_TOE + STEP - 7),
  farFoot: onToes(REAR_TOE, -26),
  face: 'effort',
};
const THROUGH: Pose = {
  ...THROUGH_BODY,
  nearFist: atChin(THROUGH_BODY),
  farFist: at(18, 37.5),
  bends: { nearElbow: 'down', farElbow: 'front' },
  effects: [dust(LEAD_TOE + STEP - 2, 2.6, 0.55)],
};

// Frame 7 (5 ticks): he rocks back over the hips, the lead foot steps home, the rear glove
// comes back up the middle toward the cheek.
const BACK_BODY: Body = {
  ...GUARD,
  hip: at(-5, 36),
  torso: 20,
  head: -2,
  shrug: 1.4,
  twist: 0.2,
  nearFoot: lifted(planted(GUARD.nearFoot.x + 1.4, 2), 1.2),
  farFoot: onToes(REAR_TOE, -17),
};
const BACK: Pose = {
  ...BACK_BODY,
  nearFist: at(8, 54.5),
  farFist: at(13.5, 53.5),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

/**
 * The idle's last frame (the lead shoulder up on the breath): the idle's own 9 -> 0 beat
 * carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
};

export const POSES: readonly Pose[] = [
  LOAD,
  COCK,
  {
    ...CLIMB,
    effects: [
      arc(CLIMB, 3, [
        [-17, 70],
        [-16, 77],
      ]),
    ],
  },
  {
    ...TOP,
    effects: [
      arc(TOP, 3.5, [
        [-17, 76],
        [-14, 82],
      ]),
    ],
  },
  {
    ...OVER,
    effects: [
      arc(OVER, 5, [
        [-12, 84],
        [-6, 89],
        [1, 91],
      ]),
    ],
  },
  IMPACT,
  THROUGH,
  BACK,
  IDLE_HANG,
];
