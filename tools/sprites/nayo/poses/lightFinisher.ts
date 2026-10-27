import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import {
  at,
  ease,
  GUARD,
  lifted,
  planted,
  smear,
  tween,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

/**
 * lightFinisher (Mise au tapis, docs/combat-v2.md §5.2, §10.1, §11.2): 7 frames, 2, 3, 3, [3],
 * 5, 6, 7 ticks (29), active frame 3 (ticks 8-10), hitbox x 10..48 / y 44..62. The end of the
 * L, L, L chain, out of the cross (chainLight); the game carries him 12 px over ticks 0-7, a
 * step in sells it while the poses stay anchored.
 *
 * The cross left his chest open: that is the coil. The rear glove snaps home to the chin, the
 * lead shoulder dips and turns away, the lead glove drops to the belt, the hips sink, while the
 * lead foot steps in. It lands and everything unwinds from the floor up: the hips whip round,
 * the shoulders after them, the arm last, rising out of the dip and swinging round in a wide
 * arc, elbow up, the whole weight dropping through it. At impact one long line from the raised
 * rear heel to the fist, the chin buried behind the lead shoulder, jaw set. The fist carries on
 * through and down, driving the opponent to the mat, then he rises out of it unhurried and
 * rolls back into the guard.
 *
 * Feet against the slide: while the game carries him, a foot planted on the floor drifts back
 * in his own space. The rear foot holds its spot through the coil, then skims in behind the
 * swing and plants for the impact; the lead foot steps in and lands as the slide ends (tick 8).
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

/** The lead wrist placed so that the front of the glove's knuckles lands on `knuckles`. */
function leadTo(body: Body, knuckles: Point): Point {
  let wrist = at(knuckles.x, knuckles.y - 5.4);
  for (let step = 0; step < 16; step++) {
    const { forearm } = solve({ ...sketch(body), nearFist: wrist }).near;
    wrist = at(knuckles.x - forearm.x * 5.4, knuckles.y - forearm.y * 5.4);
  }
  return wrist;
}

/** A body with its gloves: the lead one placed from the shoulder, the rear one at the cheek. */
function arms(body: Body, length: number, angle: number, cheek: Point = at(0, 0)): Pose {
  return { ...body, nearFist: lead(body, length, angle), farFist: atCheek(body, cheek.x, cheek.y) };
}

/** A point of the lead glove as drawn, `distance` past the wrist along the forearm. */
function onGlove(pose: Pose, distance: number): Point {
  const { wrist, forearm } = solve(pose).near;
  return at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
}

/** The front of the lead glove's knuckles. */
const knucklesOf = (pose: Pose): Point => onGlove(pose, 5.4);

/**
 * The hook's trail (as the Crochet's, wider): the lower half of a flat ellipse, a horizontal
 * swing seen from a little above, from behind the lead shoulder, dipping under the arm where
 * the glove swung out toward us, and rising forward into the glove. It ends inside the glove,
 * `into` px past the wrist: its bow wave wraps the knuckles instead of running ahead of them.
 */
function hookArc(
  pose: Pose,
  radius: number,
  depth: number,
  width: number,
  into = 2.6,
  from = -110,
): Effect {
  const end = onGlove(pose, into);
  const points: [number, number][] = [];
  for (let degrees = from; degrees <= -3; degrees += 10) {
    const a = (degrees * Math.PI) / 180;
    points.push([end.x - radius + Math.cos(a) * radius, end.y + Math.sin(a) * depth]);
  }
  points.push([end.x, end.y - 0.1]);
  return smear(width, ...points);
}

const HOOK_ARM = { nearElbow: 'up', farElbow: 'down' } as const;
/** The rear glove up from the cheek to cover the chin while the hook goes. */
const CHIN = at(0.7, 4.6);

// Frame 0 (2 ticks): the turn back. The rear glove snaps home from the cross, the chest stays
// open toward us and the lead glove starts down off the chin; the lead foot lifts to step in,
// the rear foot keeps its spot on the floor.
const TURN_BODY: Body = {
  ...GUARD,
  hip: at(-4.4, 34.6),
  torso: 27,
  head: -8,
  shrug: 0.4,
  reach: { near: -0.6, far: 1.4 },
  twist: 0.7,
  nearFoot: lifted(onToes(LEAD_TOE + 1.2, 4), 1.2),
  farFoot: onToes(REAR_TOE - 4.5, -22),
};
const TURN: Pose = {
  ...TURN_BODY,
  nearFist: at(12, 51.4),
  farFist: atCheek(TURN_BODY, 2.4, -0.6),
};

// Frame 1 (3 ticks): the dip, the wind-up held a beat. The lead foot reaching in low, the hips
// sunk over the rear foot (still on its spot, the leg long), the lead shoulder dropped and
// turned away, the lead glove down at the belt, the rear glove up at the chin; the head level,
// eyes on the target.
const DIP_BODY: Body = {
  ...GUARD,
  hip: at(-5.2, 33.6),
  torso: 24,
  head: -5,
  shrug: -1.8,
  reach: { near: -1 },
  twist: 0.85,
  nearFoot: lifted(onToes(LEAD_TOE + 4.5, 7), 2.2),
  farFoot: onToes(REAR_TOE - 7.5, -22),
};
const DIP: Pose = {
  ...DIP_BODY,
  nearFist: at(7.4, 45),
  farFist: atCheek(DIP_BODY, 0.4, 3.6),
};

// Frame 2 (3 ticks): the hips whip round, the shoulders after them, both feet skimming in low as
// the slide runs out; the arm comes last, rising out of the dip and swinging out wide at
// shoulder height, elbow up, the forearm angled down into the glove. The trail opens.
const SWING_BODY: Body = {
  ...GUARD,
  hip: at(-2.4, 33.6),
  torso: 28,
  head: -9,
  shrug: 2.6,
  reach: { near: 1.6 },
  twist: -0.3,
  nearFoot: lifted(onToes(LEAD_TOE + 1.3, -3), 0.4),
  farFoot: lifted(onToes(REAR_TOE - 4.7, -31), 0.8),
  bends: HOOK_ARM,
};
const SWING_ARM = arms(SWING_BODY, 22.5, 4.5, CHIN);
const SWING: Pose = { ...SWING_ARM, effects: [hookArc(SWING_ARM, 18, 9, 4.5)] };

// Frame 3 (3 ticks, active, held through the hitstop): impact. The weight dropped through the
// punch, the lead heel turned out on the ball, the rear leg long behind on its toes, the arm
// long and bent, elbow up; the chin behind the rolled lead shoulder, jaw set. A wide cyan arc
// into the glove and a gold spark at the contact point.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(-0.8, 33),
  torso: 36,
  head: -17,
  shrug: 3.8,
  reach: { near: 3 },
  twist: -0.95,
  nearFoot: onToes(LEAD_TOE + 1.3, -8),
  farFoot: onToes(REAR_TOE - 1, -33),
  bends: HOOK_ARM,
  face: 'effort',
};
const IMPACT_ARM = arms(IMPACT_BODY, 22.6, 5, CHIN);
const IMPACT_KNUCKLES = knucklesOf(IMPACT_ARM);
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    hookArc(IMPACT_ARM, 30, 11, 6, 0),
    {
      kind: 'flash',
      center: at(IMPACT_KNUCKLES.x + 4.2, IMPACT_KNUCKLES.y + 0.4),
      radius: 5.2,
      tone: 'strike',
    },
  ],
};

// Frame 4 (5 ticks): follow-through. The fist carries on across and down (it comes back toward
// us in the picture), the chest turned away, the hips dipping; still set.
const THROUGH_BODY: Body = {
  ...GUARD,
  hip: at(-1.2, 32.6),
  torso: 37,
  head: -18,
  shrug: 3.4,
  reach: { near: 2 },
  twist: -1,
  nearFoot: onToes(LEAD_TOE + 1.3, -6),
  farFoot: onToes(REAR_TOE - 1, -31),
  bends: HOOK_ARM,
  face: 'effort',
};
const THROUGH = arms(THROUGH_BODY, 19.5, -12, CHIN);

// Frame 5 (6 ticks): he rises out of it, unhurried, half way home: the hips coming up and back,
// the chest turning back toward us, the head level again; the lead elbow drops under the
// glove as it comes back up the line, the rear glove still on the chin, the lead foot drawn in.
const RISE_BODY: Body = {
  ...GUARD,
  hip: at(-2.8, 34),
  torso: 29.5,
  head: -10,
  shrug: 3,
  reach: { near: 1.4 },
  twist: -0.7,
  nearFoot: lifted(onToes(LEAD_TOE + 0.8, 2), 0.8),
  farFoot: onToes(REAR_TOE - 0.5, -24),
};
const RISE: Pose = {
  ...RISE_BODY,
  nearFist: leadTo(RISE_BODY, at(27.5, 50.5)),
  farFist: atCheek(RISE_BODY, CHIN.x, CHIN.y),
};

// Frame 6 (7 ticks): the hips sit back into the guard and the lead shoulder rolls up as in the
// idle's breath: a hair past the guard, which the idle picks up.
const ROLL: Pose = {
  ...GUARD,
  hip: at(-7.1, 36),
  torso: 14.5,
  head: 2.5,
  shrug: 1.7,
  nearFist: at(8.3, 55),
  farFist: at(GUARD.farFist.x - 0.5, GUARD.farFist.y - 0.5),
};
const SETTLE: Pose = tween(ROLL, GUARD, 0.5, ease.out);

export const POSES: readonly Pose[] = [TURN, DIP, SWING, IMPACT, THROUGH, RISE, SETTLE];
