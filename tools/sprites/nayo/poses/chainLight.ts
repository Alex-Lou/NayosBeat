import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, ease, GUARD, lifted, planted, smear, tween, type Foot, type Pose } from './common.ts';

/**
 * chainLight (Cross, docs/combat-v2.md §5.2, §10.1, §11.2): 6 frames, 2, 2, 2, [3], 6, 6 ticks
 * (21), active frame 3 (ticks 6-8), hitbox x 10..46 / y 46..60. The boxer's "two", chained
 * from the jab (standLight): the game moves him 10 px over ticks 0-5, a short drag step sells
 * it while the poses stay anchored.
 *
 * The jab comes back down its line as the rear hand leaves: the two gloves cross, the lead one
 * home on the jaw line while the rear heel turns up and the hips drive in, the chest opening
 * toward us. The lead foot steps in, the rear foot drags up on its ball. The rear glove goes
 * straight down the line from the cheek, the elbow behind it, the rear shoulder turning through
 * to throw it long: one line from the raised rear heel through the hips to the fist, the chin
 * tucked behind the lead shoulder and glove. Back along the same line, elbow first, the
 * shoulders unwinding, the weight settling into the guard.
 *
 * Feet against the slide: while the game carries him, a foot planted on the floor drifts back
 * in his own space. The rear foot holds its spot while the hips drive off it, then skims in
 * behind the step and plants for the punch; the lead foot skims in low and lands as the slide
 * ends, on its mark.
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

/** The lead wrist placed so that the front of the glove's knuckles lands on `knuckles`. */
function leadTo(body: Body, knuckles: Point): Point {
  let wrist = at(knuckles.x, knuckles.y - 5.4);
  for (let step = 0; step < 16; step++) {
    const { forearm } = solve({ ...sketch(body), nearFist: wrist }).near;
    wrist = at(knuckles.x - forearm.x * 5.4, knuckles.y - forearm.y * 5.4);
  }
  return wrist;
}

/**
 * The lead glove on the jaw line, whatever the head does: its knuckles `ahead` px in front of
 * the head's centre and `below` px under it. The glove covers the chin, the lips and nose clear.
 */
function atJaw(body: Body, ahead = 7.5, below = 6): Point {
  const { head } = solve(sketch(body));
  return leadTo(body, at(head.x + ahead, head.y - below));
}

/** The rear wrist `length` px from the rear shoulder, `angle` degrees above horizontal. */
function rear(body: Body, length: number, angle: number): Point {
  const { shoulder } = solve(sketch(body)).far;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/** The rear glove as drawn: its middle and the front of its knuckles, past the wrist. */
function rearGlove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).far;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/** A body with its gloves: the rear one thrown from the shoulder, the lead one on the jaw. */
function cross(body: Body, length: number, angle: number): Pose {
  return { ...body, nearFist: atJaw(body), farFist: rear(body, length, angle) };
}

/** A trail down the rear glove's line, from `tail` into the middle of the glove. */
function trail(pose: Pose, width: number, ...tail: readonly (readonly [number, number])[]) {
  const { middle } = rearGlove(pose);
  return smear(width, ...tail, [middle.x, middle.y]);
}

// Frame 0 (2 ticks): the turn. Out of the jab the lead glove is halfway home down its line
// while the rear one leaves the cheek: the two hands trade places. The rear heel comes up, the
// hips keep driving in off the rear foot (it holds its spot on the floor while the game carries
// him) and the chest starts to open; the lead foot lifts for the step.
const TURN_BODY: Body = {
  ...GUARD,
  hip: at(-4, 35.8),
  torso: 20,
  head: -2,
  shrug: 2.4,
  reach: { near: 1.2, far: 0.6 },
  twist: 0.1,
  nearFoot: lifted(onToes(LEAD_TOE + 1.2, 4), 1.4),
  farFoot: onToes(REAR_TOE - 2.5, -23),
};
const TURN: Pose = {
  ...TURN_BODY,
  nearFist: leadTo(TURN_BODY, at(25, 57)),
  farFist: atCheek(TURN_BODY, 1.8, -0.9),
};

// Frame 1 (2 ticks): the step. The lead foot reaches in, the rear one still holding its spot,
// heel up; the hips drive, the shoulders turn, the lead glove home on the jaw, the rear glove
// already past the chin, elbow behind it.
const DRIVE_BODY: Body = {
  ...GUARD,
  hip: at(-3, 35.4),
  torso: 24,
  head: -5,
  shrug: 2.2,
  reach: { near: -0.4, far: 1.8 },
  twist: 0.4,
  nearFoot: lifted(onToes(LEAD_TOE + 2.8, 5), 1.4),
  farFoot: onToes(REAR_TOE - 5.5, -29),
};
const DRIVE = cross(DRIVE_BODY, 15.8, 12);

// Frame 2 (2 ticks): both feet skim in low as the slide ends, the rear heel high; the arm three
// quarters out, the rear shoulder coming through. A thin trail down the line.
const THROW_BODY: Body = {
  ...GUARD,
  hip: at(-2, 35.1),
  torso: 29,
  head: -10,
  shrug: 2.4,
  reach: { near: -1.2, far: 3 },
  twist: 0.7,
  nearFoot: lifted(onToes(LEAD_TOE, 0), 0.4),
  farFoot: lifted(onToes(REAR_TOE - 5.5, -33), 0.8),
};
const THROW_ARM = cross(THROW_BODY, 23.2, 7.5);
const THROW: Pose = { ...THROW_ARM, effects: [trail(THROW_ARM, 3, [23.5, 57.4], [28, 56.8])] };

// Frame 3 (3 ticks, active, held through the hitstop): full extension. The rear leg long behind
// on its ball, driving: one line from the heel through the hips to the fist. The rear shoulder
// turned through, the arm long but not locked, the chest open toward us; the lead shoulder
// rolled up and the lead glove on the jaw, the elbow down over the ribs.
const STRIKE_BODY: Body = {
  ...GUARD,
  hip: at(-0.8, 35),
  torso: 34,
  head: -14.5,
  shrug: 2.6,
  reach: { near: -1.6, far: 4.2 },
  twist: 0.9,
  nearFoot: onToes(LEAD_TOE, -2),
  farFoot: onToes(REAR_TOE - 4.3, -33),
};
const STRIKE_ARM = cross(STRIKE_BODY, 24.7, 7);
const KNUCKLES = rearGlove(STRIKE_ARM).knuckles;
const STRIKE: Pose = {
  ...STRIKE_ARM,
  effects: [
    // Down the arm itself: the streaks show above and below the sleeve, a blur of speed.
    trail(STRIKE_ARM, 5, [25, 55.6], [31.5, 55.4]),
    { kind: 'flash', center: at(KNUCKLES.x + 2.6, KNUCKLES.y), radius: 4, tone: 'strike' },
  ],
};

// Frame 4 (6 ticks): coming back along the same line, elbow first, the glove trailing a little
// low; the shoulders half unwound, the chest still open, the weight still forward. The rear
// foot drags back up onto its mark.
const RETURN_BODY: Body = {
  ...GUARD,
  hip: at(-3.4, 35.6),
  torso: 25,
  head: -7.5,
  shrug: 2.2,
  reach: { near: -0.6, far: 2.2 },
  twist: 0.55,
  nearFoot: onToes(LEAD_TOE, -1.5),
  farFoot: lifted(onToes(REAR_TOE - 1.5, -25), 0.5),
};
const RETURN = cross(RETURN_BODY, 16, -4);

// Frame 5 (6 ticks): into the guard, the lead shoulder rolling up as the hips sit back.
const HOME: Pose = {
  ...GUARD,
  hip: at(-6.9, 36.2),
  torso: 14.5,
  head: 2.5,
  shrug: 1.6,
  twist: 0.08,
  nearFist: at(8.4, 54.8),
  farFist: at(GUARD.farFist.x - 0.3, GUARD.farFist.y - 0.3),
};
const SETTLE: Pose = tween(HOME, GUARD, 0.6, ease.out);

export const POSES: readonly Pose[] = [TURN, DRIVE, THROW, STRIKE, RETURN, SETTLE];
