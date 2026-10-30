import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * forwardHeavy (Overhand, docs/combat-v2.md §5.2, §10.1, §11.2): 9 frames, 4, 4, 4, 4, 3, [3],
 * 5, 5, 5 ticks (37), active frame 5 (ticks 19-21), hitbox x 12..40 / y 36..72, an overhead.
 * The game moves him 8 px over ticks 6-13: the lead foot steps in, the rear one drags on its
 * ball, the poses stay anchored.
 *
 * Slow and telegraphed on purpose (19 ticks), then a hammer. The weight sinks back, the chest
 * turns away and the rear arm rises the way a hammer is raised, the elbow climbing in front of
 * the face and the glove going up past the brow, while the lead glove reaches out to measure.
 * He steps in and rises, the arm opening steadily on its way up while a cyan arc already traces
 * it; up on the balls of his feet the hips come in, the fist loaded high over the crown, for a
 * beat. Then he drops: the chest pitches over, the elbow leads the arm down over the top with
 * the fist trailing above it, the lead heel slams down and the fist lands on the head at the
 * end of the long arm, coming down, the lead glove tucked under the chin. The fist carries on
 * down across the body, then he rocks back, the lead foot steps home and the gloves come back
 * up into the guard, handing over to the idle's breath. The rear elbow never goes back past the
 * shoulder line (it would fold the wrong way and the arm would seem to grow out of the back).
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

/**
 * An arm set by its joints, as tools/sprites/anatomy.ts measures them in the torso's frame: the
 * upper arm `shoulder` degrees from hanging (90 = straight ahead, 180 = overhead), the elbow
 * flexed `elbow` degrees (0 = straight, always the way an elbow bends). Gives the fist it puts
 * in place and the bend that makes the solver pick that elbow, not its mirror image. The wind-up
 * reads as a bend opening steadily, never an arm that straightens and folds again.
 */
function arm(
  body: Body,
  which: 'near' | 'far',
  shoulder: number,
  elbow: number,
): { fist: Point; bend: Bend } {
  const s = solve(sketch(body));
  const root = s[which].shoulder;
  const turn = (v: Point, degrees: number): Point => {
    const a = (degrees * Math.PI) / 180;
    return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
  };
  const upper = turn({ x: -s.up.x, y: -s.up.y }, shoulder);
  const joint = add(root, scale(upper, BODY.upperArm));
  const fist = add(joint, scale(turn(upper, elbow), BODY.forearm));
  // The other elbow the solver could pick: the mirror image across the shoulder-fist line.
  const line = sub(fist, root);
  const axis = scale(line, 1 / (Math.hypot(line.x, line.y) || 1));
  const offset = sub(joint, root);
  const along = offset.x * axis.x + offset.y * axis.y;
  const mirror = add(root, sub(scale(axis, 2 * along), offset));
  const dx = joint.x - mirror.x;
  const dy = joint.y - mirror.y;
  const bend: Bend =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'down' : 'up') : dx > 0 ? 'front' : 'back';
  return { fist: at(fist.x, fist.y), bend };
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

/** A pose of `body` with both arms set by their joints, `[shoulder, elbow]` each (see arm). */
function posed(body: Body, near: readonly [number, number], far: readonly [number, number]): Pose {
  const lead = arm(body, 'near', near[0], near[1]);
  const rearHand = arm(body, 'far', far[0], far[1]);
  return {
    ...body,
    nearFist: lead.fist,
    farFist: rearHand.fist,
    bends: { ...body.bends, nearElbow: lead.bend, farElbow: rearHand.bend },
  };
}

// The rear arm never goes behind the back: seen side on, an elbow pulled back past the
// shoulder line folds the wrong way and the arm seems to grow out of the back. It loads the
// overhead the way a hammer is raised, the elbow climbing in front of the face and opening
// steadily, the glove going up past the brow to stand high over the head; the face stays clear
// in front of it and the elbow always shows, so the arm reads from the shoulder to the glove.

// Frame 0 (4 ticks): the tell, readable at once. The weight sinks back a touch onto the rear
// foot (its heel coming down), the chest turns away and the rear elbow starts to climb, the
// glove rising off the cheek past the brow; the lead glove eases forward.
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
const LOAD = posed(LOAD_BODY, [37, 118], [98, 96]);

// Frame 1 (4 ticks): cocked. Coiled back over the rear leg, the chest turned away, the rear
// elbow up at chin height in front of the face and the glove up over the brow; the lead glove
// reaching out to measure, the lead foot unweighted, its toe leaving the floor as the step
// starts.
const COCK_BODY: Body = {
  ...GUARD,
  hip: at(-9, 35.8),
  torso: 7,
  head: 6,
  shrug: 2.2,
  twist: -0.8,
  nearFoot: lifted(onToes(LEAD_TOE, -9), 0.8),
  farFoot: onToes(REAR_TOE, -12),
};
const COCK = posed(COCK_BODY, [55, 95], [110, 82]);

// Frame 2 (4 ticks): the step in (the game carries him), rising: the lead foot reaches in low,
// the rear foot drives off its ball; the chest bows back, the arm climbs on, the elbow at the
// eyes and the glove over the forehead, and the arc lights up.
const STEP_BODY: Body = {
  ...GUARD,
  hip: at(-8, 39),
  torso: 4,
  head: 6,
  shrug: 2.4,
  twist: -0.85,
  reach: { far: 1 },
  nearFoot: lifted(planted(LEAD_TOE + STEP - 7.6, 5), 2.4),
  farFoot: onToes(REAR_TOE, -24),
};
const CLIMB = posed(STEP_BODY, [44, 99], [137, 48]);

// Frame 3 (4 ticks): high on the balls of both feet, the hang before the drop: the hips come in
// over the lead foot, the chest leans over the lead leg and the arm stands loaded overhead, the
// elbow up by the brow, the glove high over the crown, background all round it.
const TOP_BODY: Body = {
  ...GUARD,
  hip: at(-3.6, 41),
  torso: 12,
  head: 2,
  shrug: 2.2,
  twist: -0.5,
  reach: { far: 1.5 },
  nearFoot: onToes(LEAD_TOE + STEP, -22),
  farFoot: onToes(REAR_TOE, -42),
};
const TOP = posed(TOP_BODY, [33, 128], [151, 46]);

// Frame 4 (3 ticks): still on the toes, the drop starts: the chest pitches over, the rear
// shoulder comes through and the elbow leads the arm down over the top, the glove trailing high
// above it, the face clear; the lead glove pulls in under the chin.
const OVER_BODY: Body = {
  ...GUARD,
  hip: at(-3.6, 40.5),
  torso: 20,
  head: -3,
  shrug: 1.6,
  reach: { far: 2 },
  twist: 0.35,
  nearFoot: onToes(LEAD_TOE + STEP, -26),
  farFoot: onToes(REAR_TOE, -40),
};
const OVER = posed(OVER_BODY, [62, 142], [128, 62]);

// Frame 5 (3 ticks, active): the hammer lands. The lead heel slams down, the hips and the chest
// pitch over the lead knee, the rear shoulder thrown through, the arm long and coming down, the
// fist dropping onto the head at the end of it; the lead glove tucked under the chin, the jaw
// set. The trail comes down from above the head: the whole loop in one stroke.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(-1.3, 36.8),
  torso: 31,
  head: -12,
  shrug: 1.2,
  reach: { far: 1 },
  twist: 0.85,
  nearFoot: planted(LEAD_TOE + STEP - 7),
  farFoot: onToes(REAR_TOE, -30),
  face: 'effort',
};
const IMPACT_ARM = posed(IMPACT_BODY, [68, 142], [106, 12]);
const IMPACT_KNUCKLES = rearAlong(IMPACT_ARM, KNUCKLES);
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    // Into the forearm, short of the wrist: the bow wave and the spray ahead of a stroke this
    // long would burst well past the knuckles, and the fist itself is what lands at the edge.
    arc(
      IMPACT_ARM,
      5,
      [
        [-1, 86],
        [7, 90],
        [16, 88],
        [22, 81],
        [26, 71],
      ],
      -3,
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

// Frame 6 (5 ticks): follow-through. The fist carries on down across the body, the arm long,
// the weight deep on the lead leg, still set, the lead glove still at the chin.
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
  ...posed(THROUGH_BODY, [70, 140], [62, 22]),
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
const BACK = posed(BACK_BODY, [12, 145], [40, 119]);

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
        [5, 67],
        [1.5, 75],
      ]),
    ],
  },
  {
    ...TOP,
    effects: [
      arc(TOP, 3.5, [
        [0, 78],
        [1.5, 85],
      ]),
    ],
  },
  {
    ...OVER,
    effects: [
      arc(OVER, 5, [
        [0, 82],
        [4, 88],
        [11, 89],
      ]),
    ],
  },
  IMPACT,
  THROUGH,
  BACK,
  IDLE_HANG,
];
