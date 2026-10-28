import { at, GUARD, lifted, onBall, planted, smear, type Pose } from './common.ts';
import { LEAD_IN, REAR_TOE } from './hold.ts';

export const ANIMATED: boolean = true;

/**
 * grab (Prise, docs/combat-v2.md §4, §10.3, §11.3): 6 frames, 2, 3, [3], 6, 6, 7 ticks (27),
 * active frame 2 (ticks 5-7), hitbox x 6..28 / y 20..56: at the collar. Frames 3-5 close on
 * nothing (the missed grab) and come back to the guard; on a catch the game goes on with hold.
 * From and back to the guard.
 *
 * A predator's one-handed snatch, nothing like Nayo's two-handed reach: the cocked rear fist by
 * the ear is the hand that grabs (the guard keeps it there for this). It opens, cocks back and
 * rises over the head, the fingers spread like a claw, while the hips drive in over the lead
 * foot (it skims in) and the chin goes out; then it rakes down and forward onto the collar at
 * full stretch, a short magenta arc from over her ear to the collar behind it. The lead hand
 * stays low and late at his belt, a fist: one hand takes him, the other waits. The near arm is
 * drawn over the head, so the claw passes over the top of the head, never across the face, and
 * reaches the collar under the chin.
 *
 * On a catch the hold closes it there and draws him in. On a whiff it shuts on air and drops a
 * few pixels, the chest still pitching over the lead foot; the punish window shows it: she is
 * still out over her feet while the empty hand comes back, shaken out, past the ribs, the lead
 * hand still out, the hips coming back; only the last frame is the guard again, the rear fist a
 * hair past its mark by the ear.
 */

// Frame 0 (2 ticks): the gather. The hips dip, the rear heel rises, the rear fist by the ear
// opens and cocks back; the lead fist drops a hair.
const GATHER: Pose = {
  ...GUARD,
  hip: at(-7.4, 30.8),
  torso: 17.5,
  head: -9,
  shrug: 3,
  twist: 0.55,
  nearFoot: onBall(REAR_TOE, -17),
  nearFist: at(-13.5, 59.5),
  farFist: at(8.5, 44.5),
  nearHand: 'open',
};

// Frame 1 (3 ticks): the lunge. The hips drive in, the lead foot skims in off the floor, the
// chin out; the open rear hand rises over the head, the elbow up behind it, the claw cocked
// above the brow; the lead fist low and late.
const LUNGE: Pose = {
  ...GUARD,
  hip: at(-5.6, 31.2),
  torso: 24,
  head: -13,
  shrug: 2.4,
  reach: { near: 1.5, far: 0.4 },
  twist: 0.6,
  nearFoot: onBall(REAR_TOE, -24),
  farFoot: lifted(planted(LEAD_IN - 2, 6), 1.8),
  nearFist: at(7, 71),
  farFist: at(12, 42),
  nearHand: 'open',
  bends: { nearElbow: 'up', farElbow: 'down', nearKnee: 'back' },
};

// Frame 2 (3 ticks, active): the claw on the collar. The lead foot planted where the hold
// keeps it, the rear heel high, the chest pitched in; the open rear hand raked down onto the
// collar at full stretch under the chin (a short arc behind it, from over her ear), the lead
// fist low at his belt.
const REACH: Pose = {
  ...GUARD,
  hip: at(-4.4, 31),
  torso: 28,
  head: -15,
  shrug: 2,
  reach: { near: 2.5, far: 0.6 },
  twist: 0.6,
  nearFoot: onBall(REAR_TOE, -29),
  farFoot: planted(LEAD_IN),
  nearFist: at(24, 56),
  farFist: at(17, 41),
  nearHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'back' },
  face: 'effort',
  effects: [smear(3, [6, 67], [15, 66.5], [21, 62.5], [25, 58.5])],
};

// Frame 3 (6 ticks): nothing there. The claw shuts on air and drops, the chest still pitching
// on over the lead foot, the rear heel at its highest, the eyes on the empty space.
const WHIFF: Pose = {
  ...REACH,
  hip: at(-4, 30.7),
  torso: 30,
  head: -16,
  shrug: 2.4,
  reach: { near: 2.8, far: 0.6 },
  nearFoot: onBall(REAR_TOE, -31),
  nearFist: at(24, 52.5),
  farFist: at(17.5, 40.5),
  nearHand: 'fist',
  face: 'focus',
  effects: [],
};

// Frame 4 (6 ticks): the pull-back, halfway. The chest still over the lead foot, the hips
// coming back, the lead foot lifting to step home; the empty rear hand drawn back past the ribs
// and shaken out, the lead fist still out.
const RECOVER: Pose = {
  ...GUARD,
  hip: at(-5, 31.6),
  torso: 25,
  head: -13,
  shrug: 2.6,
  reach: { near: 1, far: 0.3 },
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -22),
  farFoot: lifted(planted(LEAD_IN - 2, 5), 1.4),
  nearFist: at(7, 51),
  farFist: at(16, 46),
  nearHand: 'open',
};

// Frame 5 (7 ticks): the guard, the hips a hair low and back, the rear fist a hair past its
// mark by the ear; idle settles it.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-7.1, 31.3),
  torso: 18,
  head: -10.5,
  shrug: 2.6,
  nearFist: at(-13, 59),
  farFist: at(9.2, 46.4),
};

export const POSES: readonly Pose[] = [GATHER, LUNGE, REACH, WHIFF, RECOVER, SETTLE];
