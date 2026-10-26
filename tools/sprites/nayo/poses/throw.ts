import { at, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';

type Knot = readonly [number, number];

/**
 * A smooth path through `knots` (Catmull-Rom), sampled finely enough that a motion trail
 * drawn along it reads as one clean curve instead of a broken line.
 */
function curve(...knots: readonly Knot[]): Knot[] {
  const points: Knot[] = [];
  for (let i = 0; i + 1 < knots.length; i++) {
    const p0 = knots[Math.max(0, i - 1)];
    const p1 = knots[i];
    const p2 = knots[i + 1];
    const p3 = knots[Math.min(knots.length - 1, i + 2)];
    if (!p0 || !p1 || !p2 || !p3) continue;
    for (let step = 0; step < 4; step++) {
      const t = step / 4;
      const blend = (a: number, b: number, c: number, d: number): number =>
        0.5 *
        (2 * b +
          (c - a) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (3 * b - a - 3 * c + d) * t * t * t);
      points.push([blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const last = knots[knots.length - 1];
  if (last) points.push(last);
  return points;
}

/**
 * A ring spreading on the floor, its lowest edge on the ground line at every size (nothing
 * may be drawn below the floor).
 */
function floorRing(x: number, radius: number, progress: number, squash = 0.32): Effect {
  const outer = radius * (0.35 + 0.65 * progress) + 0.5;
  return {
    kind: 'ring',
    center: at(x, outer * squash - 0.6),
    radius,
    progress,
    tone: 'strike',
    squash,
  };
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// Frame 0 (3 ticks): the reach. The lead foot slides in, both hands open and shoot for the
// collar, the shell opens.
const REACH: Pose = {
  ...GUARD,
  hip: at(-1.2, 36),
  torso: 9,
  head: 6,
  shrug: 1.6,
  twist: 0.15,
  reach: { near: 2, far: 2 },
  nearFoot: lifted(planted(8, 6), 1.5),
  farFoot: planted(-13.5, -6),
  nearFist: at(19, 55),
  farFist: at(17.5, 51),
  nearHand: 'open',
  farHand: 'open',
};

// Frame 1 (2 ticks, active): the lead fist closes on the collar, the rear one on the lapel.
const GRAB: Pose = {
  ...GUARD,
  hip: at(0.2, 35.6),
  torso: 12,
  head: 6,
  shrug: 1,
  twist: 0.1,
  reach: { near: 3, far: 3 },
  nearFoot: planted(9.5),
  farFoot: planted(-13.5, -14),
  nearFist: at(24.5, 58.5),
  farFist: at(23, 49.5),
  face: 'effort',
  effects: [{ kind: 'flash', center: at(29, 56), radius: 4, tone: 'strike' }],
};

// Frame 2 (4 ticks): the pivot. He drops his hips under the load and turns his lead shoulder
// in, the collar hauled in to his chest.
const SCOOP: Pose = {
  ...GUARD,
  hip: at(-3, 31.5),
  torso: 14,
  head: 12,
  shrug: 4,
  twist: -0.7,
  nearFoot: planted(9.5, -10),
  farFoot: planted(-13.5),
  nearFist: at(16, 51),
  farFist: at(13.5, 47.5),
  face: 'effort',
  effects: [
    { kind: 'speed', center: at(21.5, 50), length: 9, spread: 3.5, direction: 205, tone: 'strike' },
  ],
};

// Frame 3 (4 ticks): the heave. The legs drive, the hips come through under the load, the
// back arches and the arms carry it up and over his head.
const HEAVE: Pose = {
  ...GUARD,
  hip: at(2.5, 38.2),
  torso: -11,
  head: 2,
  shrug: 3,
  twist: 0.6,
  nearFoot: planted(9.5),
  farFoot: planted(-13.5, -32),
  nearFist: at(-2, 84),
  farFist: at(-5, 81),
  face: 'effort',
  effects: [smear(5, ...curve([19, 49], [25, 60], [23, 75], [13, 86], [0, 88]))],
};

// Frame 4 (5 ticks): the slam. He folds over his lead knee and drives it down over the top,
// into the floor in front of him: flash, ring and dust where it lands.
const SLAM: Pose = {
  ...GUARD,
  hip: at(2, 30.5),
  torso: 44,
  head: 8,
  shrug: 1,
  twist: 0.4,
  nearFoot: planted(9.5),
  farFoot: planted(-13.5, -40),
  nearFist: at(25.5, 22.5),
  farFist: at(22.5, 24.5),
  face: 'effort',
  effects: [
    smear(6, ...curve([-1, 89], [12, 93], [27, 86], [35, 69], [35, 47], [28.5, 19])),
    { kind: 'flash', center: at(32, 4.5), radius: 5.5, tone: 'strike' },
    floorRing(36, 18, 0.12),
    dust(36, 5, 0.12),
  ],
};

// Frame 5 (5 ticks): he lets go and rises, the lead foot stepping back home.
const RISE: Pose = {
  ...GUARD,
  hip: at(-0.5, 34.4),
  torso: 18,
  head: 6,
  shrug: 2.5,
  twist: 0.1,
  nearFoot: lifted(planted(8, -8), 1.2),
  farFoot: planted(-13.5, -14),
  nearFist: at(17, 40),
  farFist: at(13, 56),
  nearHand: 'open',
  face: 'cool',
  effects: [floorRing(36, 18, 0.55), dust(36, 5, 0.5)],
};

// Frame 6 (4 ticks): back in the shell.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-3.4, 36.9),
  torso: -3,
  head: 11,
  shrug: 4,
  effects: [floorRing(36, 18, 0.9), dust(36, 5, 0.85)],
};

/**
 * throw (Projection): grab at the collar, pivot under the load, heave it over the top and slam
 * it into the floor in front (the game knocks the opponent down forward). Ticks 3,2,4,4,5,5,4.
 */
export const POSES: readonly Pose[] = [REACH, GRAB, SCOOP, HEAVE, SLAM, RISE, SETTLE];
