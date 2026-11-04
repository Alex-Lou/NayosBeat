import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as CROCHET } from './standHeavy.ts';

/** Drawn: the tests (tests/tools/nayo-v2-sprites.test.ts) check it. */
export const ANIMATED: boolean = true;

/**
 * chainHeavy (Crochet au foie, H, H; docs/combos-v3.md §2.2, §5 row 1): 7 frames, 3, 3, 2, [3],
 * 6, 6, 5 ticks (28: 8/3/17, src/art/nayo/clips.ts), the impact on frame 3
 * (ticks 8-10), hitbox x 8..46 / y 24..44: low, it hits a crouching opponent too. It follows
 * the Crochet (standHeavy): it starts from standHeavy's last frames' body, not from the guard,
 * and ends in the GUARD. The game moves him 22 px forward: the poses stay anchored (the feet
 * step to sell it, the body never slides).
 *
 * Drawn for the glide where §5 draws it: frame 0 is the weight shift, on the spot, and the
 * 22 px are covered by frames 1-2, i.e. `advance(28, { from: 3, to: 8, distancePx: 22 })` in
 * the move's data (4.4 px a tick over ticks 3-7). Started on tick 0, frame 0's planted feet
 * would skate 8 px.
 *
 * The boxer's high-low: the hook to the head, then the same hand to the body. Out of the
 * Crochet the weight drops onto the lead foot and the elbow comes down to the hip; he glides
 * in low under the opponent's guard, knees bent, the fist cocked at the hip and the chest
 * coiled open; the lead shoulder rolls down and through, the arm sweeping in flat at belly
 * height, and the fist sinks in under the ribs, the elbow bent, the hips turned through, the
 * lead shoulder rolled up to the jaw, the rear glove at the cheek, its elbow tucked up on the
 * ribs. He stays down in it a beat,
 * then the knees straighten and he rises back into the guard, sitting a pixel into it.
 *
 * - 0: the weight onto the lead foot, the lead elbow drops to the hip.
 * - 1: a gliding low step, the knees bent, the lead fist cocked at the hip, the rear glove at
 *   the chin.
 * - 2: the shoulder rolls, the arm sweeps low and flat (cyan smear).
 * - 3 (active): the impact, the fist under the ribs (y 24..44), the elbow bent, the hips
 *   turned, the head behind the shoulder.
 * - 4: the follow-through, the fist recoils 1-2 px, the shoulder still low.
 * - 5: the knees straighten, the arm comes back.
 * - 6: the GUARD, with a 1 px bounce.
 *
 * Effects: the low hook's cyan trail, a flat crescent at belly height (frames 2-3) that ends in
 * the impact star (frame 3); on the follow-through (frame 4) the crescent spreads flat around
 * the body at belly height, the fist sunk in its near arc, and the star decays into shards. A
 * puff of dust where the rear foot pushes off (frame 1).
 *
 * Feet against the glide: frame 0 stands on the Crochet's spots (the lead toe where its step
 * put it, the rear ball where it was). While the game carries him, nothing touches the floor:
 * the lead foot skims in low ahead of the slide and comes down heel first as it ends, flat
 * once it has stopped (frame 3); the rear foot pushes off its ball and is dragged up behind,
 * just off the floor. In the world, every foot only ever goes forward. Down in the glide the
 * rear shin lies low behind him, the knee sunk forward over its foot: the rear heel rides high,
 * the foot almost upright on its ball like a lunge's (tools/sprites/anatomy.ts: flatter, the
 * ankle folds past its stop), and comes back down to the guard's as he rises.
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

const REAR_TOE = toeOf(GUARD.farFoot);

/** Where the lead foot lands at the end of the glide (the ankle), heel first, then flat. */
const LANDING = 10.6;
/** The Crochet's lead toe (standHeavy's impact, after its step): the weight comes down on it. */
const LEAD_TOE = toeOf(CROCHET[3]?.nearFoot ?? GUARD.nearFoot);

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

/**
 * The rear glove a hair under the cheek, covering the jaw while the body shot goes in: high
 * enough that its elbow stays tucked up on the ribs, clear of the lead arm.
 */
const TUCK = at(-0.6, -1);

/** The lead glove as drawn: its middle and the front of its knuckles, past the wrist. */
function glove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).near;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/**
 * The body hook's trail: the lower half of a flat ellipse (a swing level with the belly, seen
 * from a little above), from beside the hip, dipping under it where the glove swung out
 * toward us, and curling up into the middle of the glove; `width` px wide at the fist: the fist
 * comes in level, then digs up under the ribs.
 */
function lowArc(pose: Pose, radius: number, depth: number, width: number, from = -110): Effect {
  const end = glove(pose).middle;
  const points: [number, number][] = [];
  for (let degrees = from; degrees <= -3; degrees += 12) {
    const a = (degrees * Math.PI) / 180;
    points.push([end.x - radius + Math.cos(a) * radius, end.y + Math.sin(a) * depth]);
  }
  points.push([end.x, end.y - 0.1]);
  return smear(width, ...points);
}

// Frame 0 (3 ticks): the drop. Out of the Crochet the weight comes down onto the lead foot (its
// heel back on the floor), the hips sink, the rear heel up and pushing; the lead arm folds
// down out of the hook, the elbow dropping to the hip, the glove in front of the ribs; the rear
// glove stays at the jaw. On the spot: the lead toe where the Crochet's step put it, the rear
// ball where it was.
const DROP_BODY: Body = {
  ...GUARD,
  hip: at(-1.8, 32.4),
  torso: 31,
  head: -12,
  shrug: 1.4,
  twist: -0.3,
  nearFoot: planted(LEAD_TOE - 7, 0),
  farFoot: onToes(REAR_TOE, -32),
};
const DROP: Pose = {
  ...DROP_BODY,
  nearFist: at(17.5, 44.5),
  farFist: atCheek(DROP_BODY, TUCK.x, TUCK.y),
};

// Frame 1 (3 ticks): the glide. Down into both knees, the lead foot skimming in low ahead of
// the slide, the rear one pushing off its ball; the lead shoulder drops back and the chest
// coils open toward us, the fist cocked low in front of the hip, the elbow back by the ribs
// (the upper arm along the side, not swung out behind the back); the rear glove at the jaw.
const GLIDE_BODY: Body = {
  ...GUARD,
  hip: at(-2.4, 29.6),
  torso: 36,
  head: -17,
  shrug: -0.4,
  reach: { near: -1 },
  twist: 0.45,
  nearFoot: lifted(planted(13.5, 5), 1.3),
  farFoot: lifted(onToes(REAR_TOE - 3.8, -46), 0.8),
  bends: { nearElbow: 'back', farElbow: 'down' },
};
const GLIDE: Pose = {
  ...GLIDE_BODY,
  nearFist: at(12.2, 34.4),
  farFist: atCheek(GLIDE_BODY, TUCK.x, TUCK.y),
  // The push-off: a puff where the rear ball drives off the floor.
  effects: [{ kind: 'dust', x: toeOf(GLIDE_BODY.farFoot) - 2, size: 2.2, progress: 0.25 }],
};

// Frame 2 (2 ticks): the sweep. The lead foot comes down heel first (it lands as the glide
// ends), the rear one dragged up on its ball; the hips turn through, the lead shoulder rolls down and in, the arm swinging round low and flat
// behind it.
const SWEEP_BODY: Body = {
  ...GUARD,
  hip: at(-1.4, 28.9),
  torso: 41,
  head: -22,
  shrug: 2.4,
  reach: { near: 1.5 },
  twist: -0.35,
  nearFoot: lifted(planted(LANDING - 0.3, 6), 0.8),
  farFoot: lifted(onToes(REAR_TOE - 4.7, -46), 0.5),
};
const SWEEP_ARM: Pose = {
  ...SWEEP_BODY,
  nearFist: at(29, 33),
  farFist: atCheek(SWEEP_BODY, TUCK.x, TUCK.y),
};
const SWEEP: Pose = { ...SWEEP_ARM, effects: [lowArc(SWEEP_ARM, 17, 5, 4.5)] };

// Frame 3 (3 ticks, active, held through the hitstop): the impact. The fist sunk in under the
// ribs, the elbow bent at a right angle under it, the hips turned through, the lead heel just
// off the floor; one line from the raised rear heel through the hips to the lead shoulder,
// rolled up to the jaw, the chin buried behind it; the rear glove at the jaw, its elbow tucked
// up on the ribs, so the lead arm's bend stands against open space; jaw set.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(-0.9, 28.5),
  torso: 45,
  head: -26,
  shrug: 5.3,
  reach: { near: 3 },
  twist: -0.9,
  nearFoot: planted(LANDING, -4),
  farFoot: onToes(REAR_TOE - 4.5, -47),
  face: 'effort',
};
const IMPACT_ARM: Pose = {
  ...IMPACT_BODY,
  nearFist: at(38.3, 37),
  farFist: atCheek(IMPACT_BODY, TUCK.x, TUCK.y),
};
const CONTACT = ((): Point => {
  const { knuckles } = glove(IMPACT_ARM);
  return at(knuckles.x + 3, knuckles.y);
})();
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    lowArc(IMPACT_ARM, 25, 6, 6),
    { kind: 'flash', center: CONTACT, radius: 5, tone: 'strike' },
  ],
};

/**
 * The shock of the blow on the follow-through: the hook's low crescent spread flat around the
 * body at belly height (a ring seen from a little above, open at the back, the fist sunk in its
 * near arc), and the impact star decaying into shards flying on along the blow.
 */
const SHOCK: readonly Effect[] = [
  {
    kind: 'ring',
    center: at(CONTACT.x - 6, CONTACT.y - 2),
    radius: 14,
    progress: 0.45,
    tone: 'sound',
    squash: 0.4,
  },
  { kind: 'shards', center: CONTACT, radius: 12, progress: 0.6, tone: 'strike' },
];

// Frame 4 (6 ticks): the follow-through. Still down in it, the fist recoiling a pixel and a half
// off the ribs, the shoulder still low; the shock of the blow spreads into the body as a ")"
// just ahead of the glove, fading.
const THROUGH_BODY: Body = {
  ...IMPACT_BODY,
  hip: at(-1.1, 28.8),
  torso: 43.5,
  head: -24.5,
  shrug: 4.8,
  reach: { near: 2.2 },
  twist: -0.95,
};
const THROUGH: Pose = {
  ...THROUGH_BODY,
  nearFist: at(36.8, 37.3),
  farFist: atCheek(THROUGH_BODY, TUCK.x, TUCK.y),
  effects: SHOCK,
};

// Frame 5 (6 ticks): the rise. The knees straighten, the hips come back up over the feet, the
// lead foot steps home off the floor; the elbow drops in front of the ribs and the glove comes
// back up toward the chin.
const RISE_BODY: Body = {
  ...GUARD,
  hip: at(-4.6, 33.8),
  torso: 25,
  head: -7,
  shrug: 2.2,
  twist: -0.4,
  nearFoot: lifted(planted(8, 2), 0.6),
  farFoot: onToes(REAR_TOE - 1.2, -25),
};
const RISE: Pose = {
  ...RISE_BODY,
  nearFist: at(16, 50),
  farFist: atCheek(RISE_BODY),
};

// Frame 6 (5 ticks): the guard, sat a pixel down into it (the idle's dip), the lead shoulder
// rolled up: the idle springs him back up out of it.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-7.1, 35.5),
  shrug: 1.4,
  nearFist: at(7.9, 53.6),
  farFist: at(10.3, 61.8),
};

export const POSES: readonly Pose[] = [DROP, GLIDE, SWEEP, IMPACT, THROUGH, RISE, SETTLE];
