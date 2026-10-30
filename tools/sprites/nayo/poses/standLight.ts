import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, ease, GUARD, planted, smear, tween, type Foot, type Pose } from './common.ts';

/**
 * standLight (Direct): Tazz's jab out of the high guard. Ticks 2,2,[3],2,2,3 (active: frame 2).
 *
 * The lead glove leaves from under the chin and goes straight down the centre line, the elbow
 * behind it; it never drops or loops. The hips push a couple of pixels in off the ball of the
 * rear foot, the lead shoulder rolls up behind the chin as the arm extends, the rear glove stays
 * glued to the cheek (it rides the head). Back along the same line, a pixel of overshoot as the
 * shoulder rolls home, and the guard.
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

/** The rear glove's place in the guard, from the head's centre: it rides the head. */
const CHEEK = ((): Point => {
  const { head } = solve(GUARD);
  return at(GUARD.farFist.x - head.x, GUARD.farFist.y - head.y);
})();

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/** The rear glove at the cheek (plus `dx`, `dy`), whatever the head does. */
function atCheek(body: Body, dx = 0, dy = 0): Point {
  const { head } = solve({ ...body, nearFist: GUARD.nearFist, farFist: GUARD.farFist });
  return at(head.x + CHEEK.x + dx, head.y + CHEEK.y + dy);
}

/** The lead wrist `length` px from the lead shoulder, `angle` degrees above horizontal. */
function lead(body: Body, length: number, angle: number): Point {
  const shoulder = solve({ ...body, nearFist: GUARD.nearFist, farFist: GUARD.farFist }).near
    .shoulder;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/** The front of the lead glove's knuckles, as drawn (past the wrist along the forearm). */
function knucklesOf(arm: Pose): Point {
  const { wrist, forearm } = solve(arm).near;
  return at(wrist.x + forearm.x * 5.4, wrist.y + forearm.y * 5.4);
}

/** A body with its gloves: the lead one placed from the shoulder, the rear one at the cheek. */
function pose(body: Body, length: number, angle: number, cheek: Point = at(0, 0)): Pose {
  return { ...body, nearFist: lead(body, length, angle), farFist: atCheek(body, cheek.x, cheek.y) };
}

/**
 * As the jab goes out the shoulders turn (the rear one back, `reach.far` < 0) and the rear glove
 * tucks in from the cheek to the chin: its elbow folds down onto the ribs, behind the chest,
 * instead of hanging in front of it as a lump under the extended lead arm.
 */
const TUCK = at(-1.4, -1.6);
const TUCK_HALF = at(-1.1, -1.2);

// Frame 0 (2 ticks): the glove leaves the chin. The hips start in off the rear foot (its heel
// rising), the lead shoulder starts to roll; the glove already a third of the way out.
const START: Pose = {
  ...GUARD,
  hip: at(-6, 36.3),
  torso: 16,
  head: 1,
  shrug: 1.8,
  reach: { near: 0.8 },
  twist: -0.12,
  nearFoot: onToes(LEAD_TOE, -1),
  farFoot: onToes(REAR_TOE, -18),
  nearFist: at(14.5, 55),
  farFist: atCheek({ ...GUARD, hip: at(-6, 36.3), torso: 16, head: 1 }),
};

// Frame 1 (2 ticks): three quarters out, straight down the line, the elbow behind the glove.
const SNAP_BODY: Body = {
  ...GUARD,
  hip: at(-4.9, 36.2),
  torso: 17.5,
  head: 0,
  shrug: 2.5,
  reach: { near: 2, far: -2.2 },
  twist: -0.28,
  nearFoot: onToes(LEAD_TOE, 0),
  farFoot: onToes(REAR_TOE, -21),
};
const SNAP_ARM = pose(SNAP_BODY, 21.5, -4, TUCK_HALF);
const SNAP_KNUCKLES = knucklesOf(SNAP_ARM);
const SNAP: Pose = {
  ...SNAP_ARM,
  // Along the path of the knuckles, ending in the glove.
  effects: [smear(3, [19.5, 59.5], [25, 59.2], [SNAP_KNUCKLES.x - 2.1, SNAP_KNUCKLES.y])],
};

// Frame 2 (3 ticks, active): full extension, the arm long but not locked, the lead shoulder up
// behind the chin, the rear glove tucked at the chin. A thin trail down the line into the knuckles,
// a small flash on them.
const STRIKE_BODY: Body = {
  ...GUARD,
  hip: at(-4, 36.1),
  torso: 19,
  head: -1,
  shrug: 3,
  reach: { near: 3, far: -2.2 },
  twist: -0.4,
  nearFoot: onToes(LEAD_TOE, 0),
  farFoot: onToes(REAR_TOE, -24),
};
const STRIKE_ARM = pose(STRIKE_BODY, 24.6, -6, TUCK);
const KNUCKLES = knucklesOf(STRIKE_ARM);
const STRIKE: Pose = {
  ...STRIKE_ARM,
  effects: [
    // One clean streak just under the forearm's sleeve, rising into the bottom of the glove.
    smear(4, [22, 51.2], [29, 51.6], [KNUCKLES.x - 2.6, KNUCKLES.y - 3]),
    // Just ahead of the knuckles: it frames them, never hides them.
    { kind: 'flash', center: at(KNUCKLES.x + 2.6, KNUCKLES.y), radius: 3.5, tone: 'strike' },
  ],
};

// Frame 3 (2 ticks): snapped back along the same line, faster than it went.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-5.2, 36.2),
  torso: 17.5,
  head: 0.5,
  shrug: 2.6,
  reach: { near: 1.6, far: -1.2 },
  twist: -0.25,
  nearFoot: onToes(LEAD_TOE, -0.5),
  farFoot: onToes(REAR_TOE, -20),
};
const RETRACT = pose(RETRACT_BODY, 17.5, -9, at(-0.4, -0.6));

// Frame 4 (2 ticks): home a hair past the guard: the glove tucked in under the chin, the
// shoulder still rolled up, the hips sinking back a pixel.
const HOME: Pose = {
  ...GUARD,
  hip: at(-6.8, 36),
  torso: 15.5,
  head: 1.5,
  shrug: 1.9,
  twist: -0.08,
  nearFist: at(8.4, 55),
  farFist: at(GUARD.farFist.x - 0.2, GUARD.farFist.y - 0.4),
};

// Frame 5 (3 ticks): settled into the guard, ready for the next one.
const SETTLE: Pose = tween(HOME, GUARD, 0.75, ease.out);

export const POSES: readonly Pose[] = [START, SNAP, STRIKE, RETRACT, HOME, SETTLE];
