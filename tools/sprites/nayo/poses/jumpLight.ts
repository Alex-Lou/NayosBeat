import { at, ease, smear, tween, type Pose } from './common.ts';

/**
 * Airborne guard of the jump attacks, their last frame (held until landing): the legs reaching
 * down for the floor under the body, the shell kept in the air (lead arm low across the body,
 * rear fist by the jaw, clear of the mouth). Head back over the hips as in the jump's fall.
 * Compact: nothing pokes toward the opponent while he comes down.
 */
export const AIR_GUARD: Pose = {
  hip: at(-1.5, 37),
  torso: 3,
  head: 7,
  shrug: 3,
  nearFoot: { x: 2.5, y: 8.5, angle: -18 },
  farFoot: { x: -10, y: 11, angle: -30 },
  nearFist: at(8.5, 49),
  farFist: at(10, 61.5),
};

// Frame 0 (2 ticks): the knee folds up to the chest, hips back, the back curls over it; the
// rear fist stays at the jaw line, in front of the chin.
const CHAMBER: Pose = {
  hip: at(-3.5, 38),
  torso: 15,
  head: 3,
  shrug: 3.8,
  twist: -0.2,
  nearFoot: { x: 2.5, y: 32, angle: -40 },
  farFoot: { x: -10, y: 22, angle: -45 },
  nearFist: at(11, 51),
  farFist: at(13.5, 61.5),
  bends: { nearKnee: 'up' },
};

// Frame 2 (6 ticks, active): the hips thrust through and the shoulders lean back, the thigh
// driven down into the target with the shin folded tight under it, the back leg trailing; the
// rear fist on the jaw, elbow covering the ribs, the lead arm swinging back (elbow soft) for
// counterbalance.
const KNEE: Pose = {
  hip: at(3, 32.5),
  torso: -13,
  head: 14,
  shrug: 1.5,
  twist: 0.3,
  nearFoot: { x: 7, y: 14.5, angle: -85 },
  farFoot: { x: -20, y: 21.5, angle: -40 },
  nearFist: at(-12, 36),
  farFist: at(6, 56),
  bends: { nearElbow: 'back', farKnee: 'down' },
};

const STRIKE: Pose = {
  ...KNEE,
  effects: [
    // Short motion blur of the knee coming down into the target, bowed forward, rooted in the
    // knee itself (the trail is drawn behind the body) so it streams out of the thigh's top.
    smear(6, [17, 36], [20.5, 30.5], [22.5, 25]),
    { kind: 'flash', center: at(29, 25.5), radius: 5, tone: 'strike' },
  ],
};

// Frame 1 (2 ticks): most of the way there (the strike snaps out), the hips coming through,
// the lead arm passing the hip.
const DRIVE: Pose = {
  ...tween(CHAMBER, KNEE, 0.5, ease.out),
  farFist: at(9, 58),
  effects: [smear(5, [16.5, 40.5], [19.5, 34], [21, 28.5])],
};

// Frame 3 (3 ticks): the knee drops, the shoulders come back over the hips, the lead arm swings
// back toward the shell: 60% of the way home, the rest settles into the held airborne guard.
const RECOVER: Pose = {
  ...tween(KNEE, AIR_GUARD, 0.6, ease.linear),
  hip: at(0, 35),
  farFist: at(9.5, 59),
  bends: { nearElbow: 'back' },
};

/** jumpLight (Genou sauté): a flying knee. Ticks 2,2,6,3,3 (last held until landing). */
export const POSES: readonly Pose[] = [CHAMBER, DRIVE, STRIKE, RECOVER, AIR_GUARD];
