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
 * dashForward (Avancée): 6 frames, 2, 3, 4, 4, 4, 3 ticks (20), 36 px; the game moves him, the
 * poses ride the floor. The Rallumage, his Rewind, plays frames 0, 1, 2, 4 and 5 (clips.ts). A
 * colosse's lurch, shoulder first: he loads on the rear boot, throws his mass forward low behind
 * the lead knee, skims the floor a frame, lands heavy on the lead boot with dust, drags the rear
 * one up and rights himself into the guard. The bulb stays upright; the clamps keep the guard's
 * hold on the shoulders.
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

// 0: the load, low over the lead knee, the rear boot pushing on its ball.
const LOAD: Pose = springAnkle(
  held({
    ...GUARD,
    hip: at(-9, 34.5),
    torso: 16,
    shrug: 3.4,
    nearFoot: onBall(-19, -32),
    nearFist: at(0, -1),
    farFist: at(0.5, -1),
    face: 'effort',
  }),
);

// 1: the throw: the rear leg long behind, the lead boot off the floor, reaching.
const THROW: Pose = held({
  ...GUARD,
  hip: at(-6.5, 36),
  torso: 21,
  shrug: 3.6,
  nearFoot: onBall(-25, -44),
  farFoot: air(6, 9, 4),
  nearFist: at(0.5, 0),
  farFist: at(1, 0),
  bends: { ...GUARD.bends, farKnee: 'front' },
  face: 'effort',
  effects: [{ kind: 'dust', x: -22, size: 1, progress: 0.4 }],
});

// 2: skimming the floor, both boots off it a frame, the rear one coming through, the exoskeleton
// lit by the Pas blindé's armor.
const SKIM: Pose = held({
  ...GUARD,
  hip: at(-7, 37),
  torso: 19,
  shrug: 3.4,
  nearFoot: air(-20, 9, -38),
  farFoot: air(7, 7.5, 2),
  nearFist: at(0.5, 0.5),
  farFist: at(1, 0.5),
  bends: { ...GUARD.bends, farKnee: 'front' },
  effects: [{ kind: 'energy', center: at(8, 54), radius: 2.8 }],
  glows: [{ center: at(8, 54), reach: 26, power: 1.0, tone: 'sound' }],
});

// 3: down heavy on the lead boot, dust, the rear boot dragging.
const LAND: Pose = springAnkle(
  held({
    ...GUARD,
    hip: at(-8, 33.5),
    torso: 17,
    shrug: 3.8,
    nearFoot: onBall(-22, -30),
    farFoot: planted(7.5),
    nearFist: at(0, -1.5),
    farFist: at(0.5, -1.5),
    face: 'effort',
    effects: [{ kind: 'dust', x: 10, size: 1.3, progress: 0.3 }],
  }),
);

// 4: the rear boot drawn up into the stance, the torso rising.
const GATHER: Pose = springAnkle(
  held({
    ...GUARD,
    hip: at(-8.5, 35.5),
    torso: 12,
    shrug: 3.2,
    nearFoot: onBall(-19, -24),
    nearFist: at(0, -0.5),
    farFist: at(0, -0.5),
  }),
);

export const POSES: readonly Pose[] = [LOAD, THROW, SKIM, LAND, GATHER, tween(GATHER, GUARD, 0.6)];
