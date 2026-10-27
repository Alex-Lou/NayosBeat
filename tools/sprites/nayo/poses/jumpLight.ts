import { at, ease, smear, tween, type Pose } from './common.ts';
import { FALL, guarded } from './jump.ts';

/**
 * Airborne guard of the jump attacks, their last frame (held until landing): the jump's own fall,
 * so an air attack hands back to the same pose the jump lands from. The legs reach down for the
 * floor, both gloves up at the face; nothing pokes toward the opponent while he comes down.
 */
export const AIR_GUARD: Pose = FALL;

// Frame 0 (2 ticks): the knee folds up to the chest, the hips sit back, the back curls over it
// behind the high guard. Close to every jump frame, so the knee can come from any of them.
const CHAMBER: Pose = guarded(
  {
    hip: at(-4, 38),
    torso: 17,
    head: 1,
    shrug: 1.6,
    twist: -0.2,
    nearFoot: { x: 2.5, y: 32, angle: -40 },
    farFoot: { x: -10, y: 22, angle: -45 },
    bends: { nearKnee: 'up' },
  },
  at(0.6, -0.4),
);

// Frame 2 (6 ticks, active): the hips thrust through and the shoulders lean back, the thigh
// driven down into the target with the shin folded tight under it, the back leg trailing. The
// lead arm sweeps back and down along the body, past the hip (the pull that drives the hips in):
// a long counterweight, the elbow soft and pointing back, the shoulder no more than 60 degrees
// behind the torso, so it reads as an arm, not a coat hanger. The rear glove stays up in front of
// the face: he strikes and still guards.
const KNEE: Pose = {
  ...guarded(
    {
      hip: at(5.5, 31),
      torso: -15,
      head: 15,
      shrug: 0.4,
      twist: 0.3,
      nearFoot: { x: 10.5, y: 12.5, angle: -85 },
      farFoot: { x: -17.5, y: 20, angle: -40 },
      bends: { nearElbow: 'up', farKnee: 'down' },
    },
    at(0, 0),
    at(2.1, -1.6),
  ),
  nearFist: at(-10, 31.5),
};

const STRIKE: Pose = {
  ...KNEE,
  effects: [
    // The knee's path as it comes down into the target, from above the thigh (the trail is
    // drawn behind the body, so it streams out of the top of the knee).
    smear(6, [18.5, 40], [22.5, 31.5], [25.5, 25]),
    { kind: 'flash', center: at(32, 23), radius: 5, tone: 'strike' },
  ],
};

// Frame 1 (2 ticks): most of the way there (the strike snaps out), the hips coming through,
// the lead fist sweeping down past the belly on its way back.
const DRIVE: Pose = {
  ...tween(CHAMBER, KNEE, 0.5, ease.out),
  nearFist: at(-6, 38),
  bends: { nearElbow: 'up', nearKnee: 'up' },
  effects: [smear(5, [16, 44], [19.5, 37.5], [22, 31])],
};

// Frame 3 (3 ticks): the knee drops, the shoulders come back over the hips, 60% of the way
// home. The lead arm lags behind the legs (overlapping action): the elbow still back, the fist
// swinging forward past the hip; the held airborne guard then brings the glove up to the chin.
const RECOVER: Pose = {
  ...tween(KNEE, AIR_GUARD, 0.6, ease.linear),
  hip: at(-0.5, 35),
  nearFist: at(-1, 42),
  bends: { nearElbow: 'back' },
};

/** jumpLight (Genou sauté): a flying knee. Ticks 2,2,6,3,3 (last held until landing). */
export const POSES: readonly Pose[] = [CHAMBER, DRIVE, STRIKE, RECOVER, AIR_GUARD];
