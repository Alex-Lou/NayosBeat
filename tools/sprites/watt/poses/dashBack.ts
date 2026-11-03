import {
  at,
  fistsOnShoulders,
  GUARD,
  onBall,
  planted,
  springAnkle,
  tween,
  type Foot,
  type Pose,
} from './common.ts';

export const ANIMATED: boolean = true;

/**
 * dashBack (Recul): 6 frames, 2, 4, 4, 5, 5, 4 ticks (24), 32 px; the game moves him. No
 * anti-grab (docs/watt.md §3): a heavy hop back behind the guard, not an escape. He sits back on
 * the rear leg, pushes off the lead boot, hangs low a moment, the rear boot reaching for the
 * floor, lands on it with dust, then the lead boot comes down and he settles into the guard. The
 * torso leans back behind the clamps; the bulb stays upright.
 */

const HEAD = GUARD.torso + GUARD.head;

/** A boot in the air, its ankle at (x, y), the toe `angle` degrees (down: negative). */
function air(x: number, y: number, angle: number): Foot {
  return { x, y, angle };
}

/** `pose` with the bulb upright and the clamps on the guard's hold, moved by its fists. */
function held(pose: Pose): Pose {
  return fistsOnShoulders({ ...pose, head: HEAD - pose.torso }, pose.nearFist, pose.farFist);
}

// 0: sitting back on the rear leg.
const SIT: Pose = springAnkle(
  held({
    ...GUARD,
    hip: at(-10.5, 35),
    torso: 5,
    shrug: 3.2,
    nearFist: at(0, 0),
    farFist: at(0, 0),
    face: 'effort',
  }),
);

// 1: the push off the lead boot, both boots leaving the floor, the rear one reaching back.
const PUSH: Pose = held({
  ...GUARD,
  hip: at(-11, 38),
  torso: 2,
  shrug: 3,
  nearFoot: air(-25, 8, -22),
  farFoot: air(3, 8, -24),
  nearFist: at(0, 0.5),
  farFist: at(0, 0.5),
  bends: { ...GUARD.bends, farKnee: 'front' },
  effects: [{ kind: 'dust', x: 8, size: 1, progress: 0.4 }],
});

// 2: hanging low, the rear boot reaching for the floor.
const HANG: Pose = held({
  ...GUARD,
  hip: at(-11, 37.5),
  torso: 3,
  shrug: 3,
  nearFoot: air(-24, 7, -12),
  farFoot: air(2, 10, -18),
  nearFist: at(0, 0.5),
  farFist: at(0, 0.5),
  bends: { ...GUARD.bends, farKnee: 'front' },
});

// 3: down on the rear boot, dust, the lead boot still up.
const CATCH: Pose = held({
  ...GUARD,
  hip: at(-11, 34.5),
  torso: 6,
  shrug: 3.4,
  nearFoot: onBall(-20, -22),
  farFoot: air(4, 8, -12),
  nearFist: at(0, -1),
  farFist: at(0, -1),
  bends: { ...GUARD.bends, farKnee: 'front' },
  face: 'effort',
  effects: [{ kind: 'dust', x: -20, size: 1.3, progress: 0.3 }],
});

// 4: the lead boot down, the weight settling.
const SETTLE: Pose = springAnkle(
  held({
    ...GUARD,
    hip: at(-10, 35),
    torso: 7,
    shrug: 3.2,
    nearFoot: onBall(-19, -20),
    farFoot: planted(6.5),
    nearFist: at(0, -0.5),
    farFist: at(0, -0.5),
  }),
);

export const POSES: readonly Pose[] = [SIT, PUSH, HANG, CATCH, SETTLE, tween(SETTLE, GUARD, 0.6)];
