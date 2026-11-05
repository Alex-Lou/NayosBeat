import type { Point } from '../../raster.ts';
import { anatomyIssues } from '../../anatomy.ts';
import { solve, type Foot } from '../../skeleton.ts';
import { WATT_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, springAnkle, type Pose } from './common.ts';
import { POSES as GRAB } from './grab.ts';

/**
 * Watt's holds (docs/watt.md §5.1, docs/combat-v2.md §4): the hold and its pummel, the
 * Déchargement (forward) and the Vissage (backward), and his own poses held and thrown backward.
 * Every one is checked against the cast's by tests/tools/hold-pairs.test.ts: his clamps in the
 * held fighter's collar, and through the Vissage up to its release, the thrown fighter's neck in
 * them. The cast's victim strips were drawn for Nayo's shoulder throw, and Watt's contact
 * distances and throw timing are Nayo's (the same pushbox, the same 3, 3, 4, 4 ticks to the
 * release): his clamps follow the neck those strips carry, and his own thrown strip carries his
 * neck along the same points.
 */

/** How far the grip of a clamp sits past its wrist, along the forearm (the pair test's). */
const HAND = 2.4;

/**
 * `body` with its clamps gripping at `near` and `far`: the wrists placed so that each grip (HAND
 * px past its wrist, along its forearm) lands there.
 */
function gripping(body: Omit<Pose, 'nearFist' | 'farFist'>, near: Point, far: Point): Pose {
  let pose: Pose = { ...body, nearFist: near, farFist: far };
  for (let i = 0; i < 12; i++) {
    const { near: n, far: f } = solve(pose, WATT_BODY);
    pose = {
      ...pose,
      nearFist: at(near.x - n.forearm.x * HAND, near.y - n.forearm.y * HAND),
      farFist: at(far.x - f.forearm.x * HAND, far.y - f.forearm.y * HAND),
    };
  }
  return pose;
}

/**
 * `pose` moved so that its neck lands on `neck` (his own poses held and thrown); `grounded`, its
 * boots stay where they stand and the legs follow the hips.
 */
function neckAt(pose: Pose, neck: Point, grounded = false): Pose {
  let moved = pose;
  for (let i = 0; i < 8; i++) {
    const solved = solve(moved, WATT_BODY).neck;
    const dx = neck.x - solved.x;
    const dy = neck.y - solved.y;
    moved = {
      ...moved,
      hip: at(moved.hip.x + dx, moved.hip.y + dy),
      nearFist: at(moved.nearFist.x + dx, moved.nearFist.y + dy),
      farFist: at(moved.farFist.x + dx, moved.farFist.y + dy),
      ...(grounded
        ? {}
        : {
            nearFoot: { ...moved.nearFoot, x: moved.nearFoot.x + dx, y: moved.nearFoot.y + dy },
            farFoot: { ...moved.farFoot, x: moved.farFoot.x + dx, y: moved.farFoot.y + dy },
          }),
    };
  }
  return moved;
}

/** `pose` with its knees folded whichever way breaks the fewest hard limits (a body in the air). */
function leastStrained(pose: Pose): Pose {
  let best = pose;
  let strain = Infinity;
  for (const nearKnee of ['front', 'back'] as const) {
    for (const farKnee of ['front', 'back'] as const) {
      const tried: Pose = { ...pose, bends: { ...pose.bends, nearKnee, farKnee } };
      const hard = anatomyIssues(tried, WATT_BODY).filter((issue) => issue.hard).length;
      if (hard < strain) {
        best = tried;
        strain = hard;
      }
    }
  }
  return best;
}

const HEAD = GUARD.torso + GUARD.head;
/** Where the grab left his lead boot (grab.ts, its last frame before the guard). */
const LEAD = GRAB[GRAB.length - 2]?.farFoot ?? GUARD.farFoot;

// --- hold, pummel ------------------------------------------------------------------------------

/** The grip: both clamps in the collar, the rear one under the chin, the lead one in the lapel. */
const GRIP = { near: at(23.5, 56), far: at(22, 50.5) } as const;

const CLINCH = {
  ...GUARD,
  hip: at(-6, 35.5),
  torso: 16,
  head: HEAD - 16,
  shrug: 3.4,
  twist: 0.4,
  farFoot: LEAD,
  bends: { ...GUARD.bends, nearElbow: 'down', farElbow: 'down' },
} as const;

/** hold: 2 frames of 6 ticks, looped: the grip, then a short heave on the collar with a live spark. */
export const HOLD: Pose = {
  ...gripping(CLINCH, GRIP.near, GRIP.far),
  effects: [{ kind: 'energy', center: at(23, 53), radius: 2.2 }],
};
const HEAVE: Pose = {
  ...gripping(
    { ...CLINCH, hip: at(-6.6, 35), torso: 14, head: HEAD - 14, shrug: 3.8 },
    at(GRIP.near.x - 0.6, GRIP.near.y),
    at(GRIP.far.x - 0.6, GRIP.far.y),
  ),
  effects: [{ kind: 'arc', from: at(18, 54), to: at(25, 51), spread: 2 }],
};
export const HOLD_POSES: readonly Pose[] = [HOLD, HEAVE];

/**
 * pummel (Serrage): 4 frames, 3, 4, [1], 10 ticks; the clamps squeeze on frame 2. The grip
 * stays in the collar: the shoulders draw up, the hips sink, the gauntlets' LEDs flare as the
 * clamps shut, then he lets it out.
 */
export const PUMMEL_POSES: readonly Pose[] = [
  gripping({ ...CLINCH, hip: at(-6.4, 35.2), shrug: 3.8, face: 'effort' }, GRIP.near, GRIP.far),
  gripping(
    { ...CLINCH, hip: at(-6.8, 34.4), torso: 18, head: HEAD - 18, shrug: 4.4, face: 'effort' },
    GRIP.near,
    GRIP.far,
  ),
  gripping(
    {
      ...CLINCH,
      hip: at(-7, 34),
      torso: 19,
      head: HEAD - 19,
      shrug: 4.8,
      face: 'kiai',
      effects: [{ kind: 'energy', center: at(23, 53), radius: 3 }],
    },
    GRIP.near,
    GRIP.far,
  ),
  gripping({ ...CLINCH, shrug: 3.6 }, GRIP.near, GRIP.far),
];

// --- throwBack (Vissage) -------------------------------------------------------------------------

/** The thrown fighter's neck through the Vissage, frame by frame (the cast's thrownBack strips). */
const ARC = [at(23.7, 51), at(7.7, 64.7), at(-3.2, 63), at(-25.7, 25.5)] as const;
/** The two grips about the neck: the rear clamp a little in front of it, the lead one behind. */
const around = (neck: Point, dx: number, dy: number): [Point, Point] => [
  at(neck.x + dx, neck.y + dy),
  at(neck.x - dx, neck.y - dy),
];

const air = (x: number, y: number, angle: number): Foot => ({ x, y, angle });

/**
 * throwBack (Vissage): 8 frames, 3, 3, 4, 4, [1], 8, 9, 9 ticks; the release on frame 4, the sides
 * switching on tick 6. He gives the body a quarter turn like a bulb in its socket, lifts it onto
 * his shoulder, turns under it and brings it down behind him; then he rights himself into the
 * guard.
 */
export const THROW_BACK_POSES: readonly Pose[] = [
  // 0: the screw, both clamps twisting the collar, the hips dropping under it.
  gripping(
    {
      ...CLINCH,
      hip: at(-6, 33),
      torso: 22,
      head: HEAD - 22,
      twist: 0.2,
      nearFoot: onBall(-20, -34),
      face: 'effort',
    },
    ...around(ARC[0], 1.5, 2),
  ),
  // 1: the lift onto the shoulder, the clamps up by the bulb.
  gripping(
    {
      ...CLINCH,
      hip: at(-7, 31),
      torso: 6,
      head: HEAD - 6,
      shrug: 2,
      twist: 0.5,
      nearFoot: onBall(-16, -40),
      bends: { ...CLINCH.bends, nearElbow: 'front', farElbow: 'front' },
      effects: [smear(4, [22, 52], [16, 59], [9, 64])],
      face: 'effort',
    },
    ...around(ARC[1], 1.5, -1.5),
  ),
  // 2: turning under it, the body over his back.
  gripping(
    {
      ...CLINCH,
      hip: at(-7, 35),
      torso: 12,
      head: HEAD - 12,
      shrug: 0,
      twist: 0.7,
      nearFoot: onBall(-16, -32),
      bends: { ...CLINCH.bends, nearElbow: 'front', farElbow: 'front' },
      effects: [smear(5, [10, 64], [5, 68], [-1, 67], [-4, 63])],
      face: 'effort',
    },
    ...around(ARC[2], 3, -1),
  ),
  // 3: down behind him, the arms swung over and back, the torso thrown back.
  gripping(
    {
      ...CLINCH,
      hip: at(-12, 32),
      torso: -20,
      head: HEAD + 10,
      shrug: 1,
      twist: 1,
      nearFoot: onBall(LEAD.x - 2, -20),
      farFoot: onBall(-18, -34),
      bends: { ...CLINCH.bends, nearElbow: 'back', farElbow: 'back' },
      effects: [smear(5, [-4, 64], [-14, 60], [-21, 48], [-24, 34])],
      face: 'kiai',
    },
    ...around(ARC[3], 1.5, 0.5),
  ),
  // 4: the release, the clamps opening behind him with an electric shockwave.
  springAnkle({
    ...gripping(
      {
        ...CLINCH,
        hip: at(-12, 31.5),
        torso: -22,
        head: HEAD + 10,
        twist: 0.9,
        nearFoot: onBall(LEAD.x - 2, -22),
        farFoot: onBall(-18, -36),
        bends: { ...CLINCH.bends, nearElbow: 'back', farElbow: 'back' },
        nearHand: 'open',
        farHand: 'open',
        face: 'kiai',
        effects: [
          { kind: 'plasma', center: at(-25, 24), radius: 5, tone: 'sound' },
          { kind: 'arc', from: at(-12, 42), to: at(-27, 22), spread: 4 },
          {
            kind: 'ring',
            center: at(-25, 16),
            radius: 12,
            progress: 0.25,
            squash: 0.35,
            tone: 'sound',
          },
        ],
        glows: [{ center: at(-24, 24), reach: 28, power: 1.1, tone: 'sound' }],
      },
      at(-24, 24),
      at(-27, 24),
    ),
  }),
  // 5-8: coming back up and round into the guard.
  springAnkle({
    ...GUARD,
    hip: at(-11, 33),
    torso: -12,
    head: HEAD + 8,
    nearFist: at(-10, 38),
    farFist: at(2, 40),
    effects: [{ kind: 'arc', from: at(-18, 28), to: at(-8, 38), spread: 2.5 }],
  }),
  springAnkle({
    ...GUARD,
    hip: at(-10, 34),
    torso: -6,
    head: HEAD + 6,
    nearFist: at(-4, 44),
    farFist: at(8, 43),
  }),
  springAnkle({
    ...GUARD,
    hip: at(-8.5, 36),
    torso: 4,
    head: HEAD - 4,
    nearFist: at(-1, 48),
    farFist: at(10, 47),
  }),
  GUARD,
];

// --- throwForward (Déchargement) -----------------------------------------------------------------

/**
 * throwForward (Déchargement): 8 frames, 4, 4, 4, [1], 6, 6, 6, 5 ticks; the release on frame 3.
 */
export const THROW_FORWARD_POSES: readonly Pose[] = [
  gripping(
    {
      ...CLINCH,
      hip: at(-7, 33.5),
      torso: 20,
      head: HEAD - 20,
      nearFoot: onBall(-20, -34),
      face: 'effort',
      effects: [{ kind: 'energy', center: at(23, 53), radius: 2.5 }],
    },
    GRIP.near,
    GRIP.far,
  ),
  gripping(
    {
      ...CLINCH,
      hip: at(-7.5, 38),
      torso: 4,
      head: HEAD - 4,
      shrug: 1.6,
      face: 'effort',
      effects: [{ kind: 'arc', from: at(14, 58), to: at(22, 68), spread: 2.5 }],
    },
    at(22, 68),
    at(21, 63),
  ),
  gripping(
    {
      ...CLINCH,
      hip: at(-5, 38),
      torso: 6,
      head: HEAD - 6,
      shrug: 1.6,
      farFoot: planted(LEAD.x + 2),
      face: 'effort',
      effects: [{ kind: 'arc', from: at(16, 60), to: at(25, 70), spread: 3 }],
    },
    at(25, 70),
    at(24, 65),
  ),
  gripping(
    {
      ...CLINCH,
      hip: at(-3, 36),
      torso: 18,
      head: HEAD - 18,
      reach: { near: 2, far: 2 },
      farFoot: planted(LEAD.x + 2),
      nearHand: 'open',
      farHand: 'open',
      face: 'kiai',
      effects: [
        smear(4, [24, 68], [30, 62], [33, 54]),
        { kind: 'plasma', center: at(34, 54), radius: 5.5, tone: 'sound' },
        { kind: 'arc', from: at(20, 58), to: at(38, 52), spread: 4 },
        { kind: 'ring', center: at(35, 54), radius: 11, progress: 0.25, tone: 'sound' },
      ],
      glows: [{ center: at(33, 54), reach: 28, power: 1.15, tone: 'sound' }],
    },
    at(33, 56),
    at(31, 52),
  ),
  springAnkle({
    ...GUARD,
    hip: at(-3.5, 36),
    torso: 17,
    head: HEAD - 17,
    farFoot: planted(LEAD.x + 1.5),
    nearFist: at(25, 52),
    farFist: at(28, 50),
    effects: [{ kind: 'arc', from: at(18, 52), to: at(30, 50), spread: 2.5 }],
  }),
  springAnkle({
    ...GUARD,
    hip: at(-4, 36),
    torso: 16,
    head: HEAD - 16,
    farFoot: planted(LEAD.x + 1),
    nearFist: at(20, 50),
    farFist: at(24, 48),
  }),
  springAnkle({
    ...GUARD,
    hip: at(-6.5, 36.5),
    torso: 12,
    head: HEAD - 12,
    nearFist: at(8, 50),
    farFist: at(13, 49),
  }),
  GUARD,
];

// --- held, thrownBack (Watt as the victim) -------------------------------------------------------

/** His body hauled in by the collar, bent toward the holder, the boots dragging. */
const HAULED: Pose = {
  ...GUARD,
  torso: 16,
  head: HEAD - 4,
  shrug: 4,
  nearFist: at(4, 44),
  farFist: at(10, 44),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onBall(-20, -20),
  farFoot: planted(4),
  face: 'hurt',
};

/**
 * held: 2 frames (4 ticks each, played 1, 0), looped: hauled in, his neck where the cast's grips
 * hold a neck (about (-3, 58) in his space), straining, then yanked.
 */
export const HELD_POSES: readonly Pose[] = [
  springAnkle(neckAt(HAULED, at(-3.8, 58.8), true)),
  springAnkle(neckAt({ ...HAULED, torso: 22, head: HEAD - 8, shrug: 4.4 }, at(-2, 57.3), true)),
];

/**
 * thrownBack: 4 frames, 3, 3, 4, 4 ticks, frame for frame with the thrower's throwBack up to its
 * release; thrownFall (airHit) takes over. His neck rides the thrower's fists along the cast's
 * points: yanked forward, lifted over the thrower's shoulder, over his back, down behind him.
 */
export const THROWN_BACK_POSES: readonly Pose[] = [
  neckAt(
    {
      ...HAULED,
      torso: 40,
      head: HEAD - 20,
      nearFoot: onBall(-24, -40),
      farFoot: planted(2),
      nearFist: at(8, 38),
      farFist: at(14, 40),
    },
    at(4, 51.5),
    true,
  ),
  neckAt(
    {
      ...HAULED,
      torso: 10,
      head: HEAD - 6,
      nearFoot: air(-12, 6, -40),
      farFoot: air(-4, 4, -30),
      nearFist: at(6, 48),
      farFist: at(12, 50),
    },
    at(21, 64),
  ),
  neckAt(
    {
      ...HAULED,
      torso: -40,
      head: 10,
      nearFoot: air(13, 10, -30),
      farFoot: air(6, 8, -30),
      nearFist: at(-18, 62),
      farFist: at(-12, 64),
    },
    at(-25, 62),
  ),
  neckAt(
    {
      ...HAULED,
      torso: -80,
      head: -10,
      nearFoot: air(6, 33, 0),
      farFoot: air(0, 31, 0),
      nearFist: at(-14, 40),
      farFist: at(-6, 42),
      face: 'hurt',
    },
    at(-2, 25),
  ),
].map(leastStrained);
