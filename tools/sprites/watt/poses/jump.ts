import {
  at,
  fistsOnShoulders,
  GUARD,
  onBall,
  planted,
  springAnkle,
  type Foot,
  type Pose,
} from './common.ts';

export const ANIMATED: boolean = true;

/**
 * jump: 6 frames. Frame 0 is the pre-jump (5 ticks); frames 1-4 the air (7, 8, 9, 9 ticks, the
 * last held until he lands); frame 5 the landing (4 ticks). The back jump plays it too, so it
 * carries no forward momentum; the forward jump (jumpForward.ts) leans into it and comes down
 * through the same FALL. His jump is the cast's lowest (60 px) and heaviest: no spin, no flip, a
 * mass thrown up and caught by the floor.
 *
 * Load, stretch, tuck, reach, squash: the hips drop deep and the clamps swing down, the floor
 * puffing under the boots; he leaves it on one line, both legs long, the toes down, the chest up
 * and the clamps coming up before it; at the top the knees come up under him, the clamps in
 * front of the chest, the guard kept; then the legs open for the floor, the lead boot reaching,
 * and the landing crushes into the knees, the boots back on the guard's spots, dust out on both
 * sides. The bulb stays upright over the collar.
 *
 * In the air his hips ride 38 to 41 px over the soles (the game lifts him): the drawing stays
 * inside his air boxes (src/data/fighters/watt.ts, 4 to 88 px).
 */

const HEAD = GUARD.torso + GUARD.head;

/** A boot in the air, its ankle at (x, y), the toe `angle` degrees (down: negative). */
function air(x: number, y: number, angle: number): Foot {
  return { x, y, angle };
}

/**
 * `pose` with the bulb kept upright over the collar and the clamps held from the shoulders as
 * in the guard; its `nearFist` and `farFist` move them from there (world px).
 */
function upright(pose: Pose): Pose {
  return fistsOnShoulders({ ...pose, head: HEAD - pose.torso }, pose.nearFist, pose.farFist);
}

// 0: the load, the hips down as deep as the boots let them, the clamps swung down.
export const LOAD: Pose = springAnkle(
  upright({
    ...GUARD,
    hip: at(-10, 29),
    torso: 14,
    shrug: 3.6,
    nearFoot: onBall(-19, -30),
    farFoot: planted(8, 0),
    nearFist: at(0, -6),
    farFist: at(0.5, -6),
    face: 'effort',
    effects: [{ kind: 'dust', x: -4, size: 1, progress: 0.2 }],
  }),
);

// 1: the takeoff, long: both legs straight under him, the toes pointed, the clamps rising.
const RISE: Pose = upright({
  ...GUARD,
  hip: at(-8.5, 41),
  torso: 4,
  shrug: 2.4,
  nearFoot: air(-14, 7, -48),
  farFoot: air(-3.5, 6.5, -40),
  nearFist: at(0, 3),
  farFist: at(0, 3),
  bends: { ...GUARD.bends, farKnee: 'front' },
  effects: [{ kind: 'dust', x: -6, size: 1.3, progress: 0.6 }],
});

// 2: gathering: the knees coming up, the clamps settling in front of the chest.
const GATHER: Pose = upright({
  ...GUARD,
  hip: at(-9, 40),
  torso: 7,
  shrug: 2.6,
  nearFoot: air(-16, 14, -30),
  farFoot: air(0, 16, -18),
  nearFist: at(0, 1),
  farFist: at(0, 1),
  bends: { ...GUARD.bends, farKnee: 'front' },
});

// 3: the top: the knees up under him, the boots tucked, the guard kept.
const TUCK: Pose = upright({
  ...GUARD,
  hip: at(-9.5, 40),
  torso: 9,
  shrug: 2.8,
  nearFoot: air(-17, 19, -34),
  farFoot: air(1.5, 22, -12),
  nearFist: at(0, 0),
  farFist: at(0, 0),
  bends: { ...GUARD.bends, farKnee: 'front' },
});

// 4: falling: the legs open for the floor, the lead boot reaching, the rear one under him.
export const FALL: Pose = upright({
  ...GUARD,
  hip: at(-9, 39),
  torso: 6,
  shrug: 2.6,
  nearFoot: air(-19, 8, -26),
  farFoot: air(4, 6.5, -6),
  nearFist: at(0.5, 1.5),
  farFist: at(1, 1.5),
  bends: { ...GUARD.bends, farKnee: 'front' },
});

// 5: the landing, crushed into the knees, the boots on the guard's spots, dust both ways.
export const LANDING: Pose = springAnkle(
  upright({
    ...GUARD,
    hip: at(-10.5, 28),
    torso: 15,
    shrug: 4,
    nearFoot: onBall(-18, -30),
    farFoot: planted(7.5, 0),
    nearFist: at(0, -7),
    farFist: at(0.5, -7),
    face: 'effort',
    effects: [
      { kind: 'dust', x: -14, size: 1.4, progress: 0.3 },
      { kind: 'dust', x: 10, size: 1.4, progress: 0.3 },
    ],
  }),
);

export const POSES: readonly Pose[] = [LOAD, RISE, GATHER, TUCK, FALL, LANDING];
