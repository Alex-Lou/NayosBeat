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
 * forwardLight (Jab chassé, docs/combat-v2.md §5.2, §10.1, §11.2): 6 frames, 2, 2, 3, [3], 4, 6
 * ticks (20), active frame 3 (ticks 7-9), hitbox x 10..42 / y 46..58. The game slides him
 * 14 px forward over ticks 0-6; the poses stay anchored and the feet sell the slide.
 *
 * A boxer's step-in jab: the rear foot drives off its ball and the lead foot skims in low, the
 * hips sink and lead, the gloves stay high and tight. As the rear foot snaps in behind him
 * (the "chassé"), the jab fires straight down the centre line off the landing in a low lunge,
 * lower and longer than the standing jab: the lead shoulder rolled up behind the chin, the rear
 * glove glued to the cheek. Then straight back along the line and into the guard.
 *
 * Feet against the slide: while the game carries him, a foot planted on the floor drifts back
 * in his own space. The rear foot pushes and holds its spot on the floor, then skims in and
 * snaps onto its mark with the punch; the lead foot reaches ahead, glides in low and lands on
 * its mark as the slide ends (tick 7).
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

/** The lead glove as drawn: its middle and the front of its knuckles, past the wrist. */
function glove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).near;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/** A body with its gloves: the lead one placed from the shoulder, the rear one at the cheek. */
function jab(body: Body, length: number, angle: number, cheek: Point = at(0, 0)): Pose {
  return { ...body, nearFist: lead(body, length, angle), farFist: atCheek(body, cheek.x, cheek.y) };
}

/**
 * Dust off the rear foot's push, left on the floor behind him: drawn where that spot of floor
 * is while the game slides him `slid` px past it.
 */
function pushDust(slid: number, progress: number): Effect {
  return { kind: 'dust', x: REAR_TOE - 2 - slid, size: 2.2, progress };
}

// Frame 0 (2 ticks): the push. The hips sink and start forward off the rear foot, its heel
// rising; the lead foot unweights and lifts, the gloves tight in the high guard.
const PUSH_BODY: Body = {
  ...GUARD,
  hip: at(-5.8, 35.3),
  torso: 18,
  head: 0,
  shrug: 1.5,
  twist: -0.08,
  nearFoot: lifted(onToes(LEAD_TOE + 0.6, 3), 1),
  farFoot: onToes(REAR_TOE - 3, -23),
};
const PUSH: Pose = {
  ...PUSH_BODY,
  nearFist: at(10.6, 54.6),
  farFist: atCheek(PUSH_BODY, 0, -0.3),
};

// Frame 1 (2 ticks): the glide. The lead foot skims in low ahead of him, the rear leg long
// behind, pushing on its toes from the same spot of floor; the hips low and leading, the head
// level; the lead glove just starting down the line. Dust off the push.
const GLIDE_BODY: Body = {
  ...GUARD,
  hip: at(-4.4, 34.1),
  torso: 20,
  head: -2,
  shrug: 2,
  reach: { near: 0.6 },
  twist: -0.15,
  nearFoot: lifted(onToes(LEAD_TOE + 5.6, 7), 1.6),
  farFoot: onToes(REAR_TOE - 7, -27),
};
const GLIDE: Pose = {
  ...GLIDE_BODY,
  nearFist: at(14.2, 55.4),
  farFist: atCheek(GLIDE_BODY, 0, -0.3),
  effects: [pushDust(7, 0.25)],
};

// Frame 2 (3 ticks): both feet glide in low as the slide runs out, the rear foot drawn in after
// the lead one; the jab three quarters out, the elbow behind the glove. A thin trail down the
// line.
const LAND_BODY: Body = {
  ...GUARD,
  hip: at(-3, 34.8),
  torso: 20.5,
  head: -2.5,
  shrug: 2.6,
  reach: { near: 2 },
  twist: -0.3,
  nearFoot: lifted(onToes(LEAD_TOE + 0.3, 0), 0.35),
  farFoot: lifted(onToes(REAR_TOE - 3, -24), 0.8),
};
const LAND_ARM = jab(LAND_BODY, 20.5, -3);
const LAND: Pose = {
  ...LAND_ARM,
  effects: [
    smear(3, [18.5, 57.6], [24.5, 57.2], [glove(LAND_ARM).middle.x, glove(LAND_ARM).middle.y]),
    pushDust(12, 0.6),
  ],
};

// Frame 3 (3 ticks, active, held through the hitstop): the lunge. The rear foot snaps in onto
// its mark, heel high, as the jab lands: the hips dropped low and forward, the lead knee over
// the toes, the whole body leaning into the punch (lower and longer than the standing jab);
// full extension, long but not locked, the lead shoulder up behind the chin, the rear glove at
// the cheek.
const STRIKE_BODY: Body = {
  ...GUARD,
  hip: at(-1.6, 33.3),
  torso: 24,
  head: -4.5,
  shrug: 3,
  reach: { near: 1.6 },
  twist: -0.42,
  nearFoot: onToes(LEAD_TOE + 0.3, -1),
  farFoot: onToes(REAR_TOE + 0.2, -30),
};
const STRIKE_ARM = jab(STRIKE_BODY, 24.6, -4);
const KNUCKLES = glove(STRIKE_ARM).knuckles;
const ELBOW = solve(STRIKE_ARM).near.elbow;
const STRIKE: Pose = {
  ...STRIKE_ARM,
  effects: [
    // A clean streak under the forearm's sleeve, rising into the bottom of the glove.
    smear(
      4,
      [ELBOW.x - 1, ELBOW.y - 2.6],
      [ELBOW.x + 6, ELBOW.y - 2.2],
      [KNUCKLES.x - 2.6, KNUCKLES.y - 3],
    ),
    // Just ahead of the knuckles: it frames them, never hides them.
    { kind: 'flash', center: at(KNUCKLES.x + 2.6, KNUCKLES.y), radius: 3.5, tone: 'strike' },
  ],
};

// Frame 4 (4 ticks): snapped back along the same line, faster than it went; the hips sitting
// back off the lead knee.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-4.6, 35.6),
  torso: 18.5,
  head: -0.5,
  shrug: 2.4,
  reach: { near: 1.2 },
  twist: -0.22,
  nearFoot: onToes(LEAD_TOE + 0.3, -1),
  farFoot: onToes(REAR_TOE + 0.2, -19),
};
const RETRACT = jab(RETRACT_BODY, 14.5, -14);

// Frame 5 (6 ticks): home a hair past the guard, the lead shoulder rolling up, settling.
const HOME: Pose = {
  ...GUARD,
  hip: at(-6.9, 36.1),
  torso: 15,
  head: 2,
  shrug: 1.8,
  twist: -0.05,
  nearFist: at(8.3, 55),
  farFist: at(GUARD.farFist.x - 0.2, GUARD.farFist.y - 0.4),
};
const SETTLE: Pose = tween(HOME, GUARD, 0.6, ease.out);

export const POSES: readonly Pose[] = [PUSH, GLIDE, LAND, STRIKE, RETRACT, SETTLE];
