import { at, GUARD, planted, type Effect, type Pose } from './common.ts';

/**
 * victory: 8 frames, 6,6,6,6 then 8x4 looping from frame 4. Out of the guard he sinks, then
 * swings the lead fist up in an arc in front of him and punches the sky, on his toes, with a
 * flash of sound at the knuckles; he settles leaning back, the rear hand in the pocket, and
 * bounces on the beat with a cool smirk: a dip and a nod on each beat (frames 3 and 7, a ring of
 * sound born around the fist), back up in between while the ring spreads and fades.
 *
 * Everything in front stays inside the pushbox (the loser may stand at point blank): the fist
 * goes up, not forward.
 */

/** A ring of sound around the raised fist, `progress` from 0 (born) to 1 (faded). */
const ring = (progress: number): Effect => ({
  kind: 'ring',
  center: at(3.6, 87),
  radius: 11.5,
  progress,
  tone: 'sound',
});

/** The fist raised, leaning back with the hips forward, the rear hand in the pocket. */
const UP: Pose = {
  hip: at(-1.4, 40.6),
  torso: -7,
  head: -8,
  shrug: 0.5,
  nearFoot: planted(5.6),
  farFoot: planted(-10.5),
  nearFist: at(3.5, 83),
  farFist: at(-5, 39),
  bends: { nearElbow: 'front', farElbow: 'back' },
  face: 'smirk',
};

// 0 · Out of the shell he sinks: the lead fist drops to the belt, the chin tucks.
const SINK: Pose = {
  ...GUARD,
  hip: at(-3.8, 35.8),
  torso: 4,
  head: 14,
  shrug: 1.5,
  nearFist: at(3, 39),
  farFist: at(-1.5, 46),
  face: 'cool',
};

// 1 · The fist swings up through the chin, the body rising, the rear hand going to the pocket.
const SWING: Pose = {
  ...UP,
  hip: at(-2.4, 39.4),
  torso: -1,
  head: 0,
  nearFist: at(9.5, 67),
  farFist: at(-3, 42),
};

// 2 · Punching the sky: stretched on the toes, the head thrown back, a flash of sound.
const SKY: Pose = {
  ...UP,
  hip: at(-1.2, 41.4),
  torso: -9,
  head: -12,
  nearFoot: planted(5.6, -12),
  nearFist: at(3, 85.5),
  effects: [{ kind: 'flash', center: at(3.5, 89), radius: 6, tone: 'sound' }],
};

/** The bounce, phase 0 on the beat (dip and nod, a ring is born), 2 at the top. */
const BOUNCE = [
  { dip: 1, nod: 1, ring: 0.06 },
  { dip: 0.35, nod: 0.5, ring: 0.36 },
  { dip: 0, nod: 0, ring: 0.66 },
  { dip: 0.45, nod: 0.3, ring: 0.9 },
] as const;

function bounce(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, nod, ring: progress } = BOUNCE[phase];
  return {
    ...UP,
    hip: at(-1.4 - 0.4 * dip, 40.8 - 1.6 * dip),
    torso: -7 + 1.5 * dip,
    head: -11 + 10 * nod,
    shrug: 0.4 + 1.0 * dip,
    // The fist rides the bounce a little late: it sinks less than the body.
    nearFist: at(3.5 + 0.5 * nod, 83.5 - 0.8 * dip),
    effects: [ring(progress)],
  };
}

// 3 · Settles on the first beat; then the loop (4-7): up, top, down, beat.
export const POSES: readonly Pose[] = [
  SINK,
  SWING,
  SKY,
  bounce(0),
  bounce(1),
  bounce(2),
  bounce(3),
  bounce(0),
];
