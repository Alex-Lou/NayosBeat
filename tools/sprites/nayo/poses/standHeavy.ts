import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * standHeavy (Crochet): a stepping lead hook out of the high guard. Ticks 3,3,2,[4],3,3,3,3,4
 * (active: frame 3).
 *
 * Everything goes the other way first: the weight sinks back onto the rear foot, the lead
 * shoulder dips and the chest opens toward us, the glove drawn back with it. Then the lead foot
 * steps in, the lead elbow lifting off the ribs, and the hips lead: they turn in, the shoulders
 * follow, the arm comes last, elbow up at shoulder height, sweeping round in one arc. At impact
 * one long line from the raised rear heel through the hips to the bent arm, the chin buried
 * behind the rolled lead shoulder, the rear glove up at the chin. The arm carries through
 * across, the weight comes back, the lead foot steps home and the shoulder rolls up into the
 * guard.
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
/** Where the lead foot lands after the step in. */
const STEP_X = 10.5;

type Body = Omit<Pose, 'nearFist' | 'farFist'>;
const sketch = (body: Body): Pose => ({
  ...body,
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
});

/** The rear glove's place in the guard, from the head's centre: it rides the head. */
const CHEEK = ((): Point => {
  const { head } = solve(GUARD);
  return at(GUARD.farFist.x - head.x, GUARD.farFist.y - head.y);
})();

/** The rear glove at the cheek (plus `dx`, `dy`), whatever the head does. */
function atCheek(body: Body, dx = 0, dy = 0): Point {
  const { head } = solve(sketch(body));
  return at(head.x + CHEEK.x + dx, head.y + CHEEK.y + dy);
}

/** The lead wrist `length` px from the lead shoulder, `angle` degrees above horizontal. */
function lead(body: Body, length: number, angle: number): Point {
  const { shoulder } = solve(sketch(body)).near;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/** A body with its gloves: the lead one placed from the shoulder, the rear one at the cheek. */
function arms(body: Body, length: number, angle: number, cheek: Point = at(0, 0)): Pose {
  return { ...body, nearFist: lead(body, length, angle), farFist: atCheek(body, cheek.x, cheek.y) };
}

/**
 * The lead glove as drawn (solved): its middle and the front of its knuckles, along the
 * forearm past the wrist.
 */
function glove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).near;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/**
 * The hook's trail: the lower half of a flat ellipse (a horizontal swing seen from a little
 * above), from behind the lead shoulder, dipping under the arm where the glove swung out toward
 * us, and rising forward into the glove; `width` px wide at the fist. It ends moving forward,
 * not upward: a hook, not a shovel. It ends in the middle of the glove, so its rounded end hides
 * under it instead of bulging past it.
 */
function hookArc(pose: Pose, radius: number, depth: number, width: number, from = -105): Effect {
  const end = glove(pose).middle;
  const points: [number, number][] = [];
  for (let degrees = from; degrees <= -3; degrees += 12) {
    const a = (degrees * Math.PI) / 180;
    points.push([end.x - radius + Math.cos(a) * radius, end.y + Math.sin(a) * depth]);
  }
  points.push([end.x, end.y - 0.1]);
  return smear(width, ...points);
}

const HOOK_ARM = { nearElbow: 'up', farElbow: 'down' } as const;
/** The rear glove up from the cheek to cover the chin while the hook lands. */
const CHIN = at(0.7, 4.6);

// Frame 0 (3 ticks): the load. The weight sinks back onto the rear foot (its heel coming
// down), the lead heel unweights, the lead shoulder dips and the chest opens toward us; the
// glove is drawn back a touch under the chin with it: the coil shows in the arm too.
const LOAD_BODY: Body = {
  ...GUARD,
  hip: at(-7.8, 35.2),
  torso: 10,
  head: 7,
  shrug: -0.6,
  twist: 0.5,
  nearFoot: onToes(LEAD_TOE, -7),
  farFoot: onToes(REAR_TOE, -9),
};
const LOAD: Pose = {
  ...LOAD_BODY,
  nearFist: at(6, 56),
  farFist: atCheek(LOAD_BODY, -0.4, 0.2),
};

// Frame 1 (3 ticks): the lead foot steps in low, the hips start forward, the shoulders still
// coiled; the lead elbow lifts off the ribs, forward and up, the glove cocked at the jaw (the
// face stays clear).
const STEP_BODY: Body = {
  ...GUARD,
  hip: at(-4.4, 34.9),
  torso: 19,
  head: -1,
  shrug: 1.4,
  twist: 0.25,
  nearFoot: lifted(planted(8.8, 6), 1.8),
  farFoot: onToes(REAR_TOE, -19),
};
const STEP: Pose = {
  ...STEP_BODY,
  nearFist: at(16.5, 61),
  farFist: atCheek(STEP_BODY),
  bends: { nearElbow: 'front', farElbow: 'down' },
};

// Frame 2 (2 ticks): the foot lands, the hips turn through, the arm whips round behind them,
// elbow up at shoulder height.
const SWING_BODY: Body = {
  ...GUARD,
  hip: at(-1.8, 34.3),
  torso: 29,
  head: -10,
  shrug: 3,
  reach: { near: 2 },
  twist: -0.4,
  nearFoot: planted(STEP_X),
  farFoot: onToes(REAR_TOE, -26),
  bends: HOOK_ARM,
};
const SWING_ARM = arms(SWING_BODY, 23.5, 0, at(0.3, 2.4));
const SWING: Pose = { ...SWING_ARM, effects: [hookArc(SWING_ARM, 17, 7, 4.5)] };

// Frame 3 (4 ticks, active, held through the hitstop): impact. The lead heel turned out (on
// the ball), the rear leg long behind, the chin buried behind the lead shoulder, jaw set.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(-0.6, 34),
  torso: 38,
  head: -19,
  shrug: 4,
  reach: { near: 3 },
  twist: -0.8,
  nearFoot: onToes(STEP_X + 7, -7),
  farFoot: onToes(REAR_TOE, -31),
  bends: HOOK_ARM,
  face: 'effort',
};
// The elbow bent (about 140 degrees), the forearm coming in from above toward the jaw. The rear
// glove rides up to the chin: it covers the jaw and tucks the rear elbow up behind the punching
// arm instead of hanging under it.
const IMPACT_ARM = arms(IMPACT_BODY, 23.6, 2, CHIN);
const IMPACT_KNUCKLES = glove(IMPACT_ARM).knuckles;
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    hookArc(IMPACT_ARM, 25, 9, 6),
    // At the contact point just ahead of the glove: it frames the knuckles, never hides them.
    {
      kind: 'flash',
      center: at(IMPACT_KNUCKLES.x + 3.5, IMPACT_KNUCKLES.y),
      radius: 5,
      tone: 'strike',
    },
  ],
};

// Frame 4 (3 ticks): follow-through. The fist carries on across the body (it comes back toward
// us in the picture), the elbow still up, the chest turned away; still set.
const THROUGH_BODY: Body = {
  ...GUARD,
  hip: at(-0.9, 34.2),
  torso: 33,
  head: -14,
  shrug: 3.6,
  reach: { near: 2 },
  twist: -0.9,
  nearFoot: onToes(STEP_X + 7, -5),
  farFoot: onToes(REAR_TOE, -28),
  bends: HOOK_ARM,
  face: 'effort',
};
const THROUGH = arms(THROUGH_BODY, 23, -3, CHIN);

// Frame 5 (3 ticks): the weight comes back over the hips, the elbow drops, the glove heads home.
const BACK_BODY: Body = {
  ...GUARD,
  hip: at(-2.8, 35.1),
  torso: 24,
  head: -5,
  shrug: 2.6,
  reach: { near: 0.8 },
  twist: -0.5,
  nearFoot: planted(STEP_X),
  farFoot: onToes(REAR_TOE, -20),
};
const BACK = arms(BACK_BODY, 15, 4);

// Frame 6 (3 ticks): the lead foot steps back home, the hips settle back.
const STEP_BACK_BODY: Body = {
  ...GUARD,
  hip: at(-5.4, 36),
  torso: 18,
  head: 0,
  shrug: 2,
  twist: -0.2,
  nearFoot: lifted(planted(8, 4), 1.4),
  farFoot: onToes(REAR_TOE, -16),
};
const STEP_BACK: Pose = {
  ...STEP_BACK_BODY,
  nearFist: at(10.5, 54.8),
  farFist: atCheek(STEP_BACK_BODY),
};

// Frames 7-8 (3 + 4 ticks): a pixel past the guard (the hips sit back, the lead shoulder rolls
// up as in the idle's breath), then the guard.
const ROLL: Pose = {
  ...GUARD,
  hip: at(-7.1, 36),
  torso: 14.5,
  head: 2.5,
  shrug: 1.7,
  nearFist: at(8.3, 55),
  farFist: at(GUARD.farFist.x - 0.5, GUARD.farFist.y - 0.5),
};
const SETTLE: Pose = GUARD;

export const POSES: readonly Pose[] = [
  LOAD,
  STEP,
  SWING,
  IMPACT,
  THROUGH,
  BACK,
  STEP_BACK,
  ROLL,
  SETTLE,
];
