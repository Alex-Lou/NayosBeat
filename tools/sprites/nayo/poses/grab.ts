import { at, GUARD, lifted, planted, type Pose } from './common.ts';
import { LEAD_IN, onToes, REAR_TOE, toeOf } from './hold.ts';

/**
 * grab (docs/combat-v2.md §4, §10.3, §11.2; replaces throw): 6 frames, 2, 3, [3], 6, 7, 7 ticks
 * (28), active frame 2 (ticks 5-7), hitbox x 6..30 / y 20..60: at the collar. Frames 3-5 close
 * on nothing (the missed grab) and come back to the guard; on a catch the game goes on with
 * hold. From and back to the guard.
 *
 * A short, sharp lunge, the body leading the arms: the gloves drop off the face and open, the
 * hips drive in over the lead foot, which slides in, the lead knee bends, the rear heel comes up,
 * and the arms shoot out long and low after them, the open hands level at the collar and the
 * lapel: one line from the rear toe through the hips to the hands. On a catch the hold closes
 * them there. On a whiff they snap shut on air at full stretch, the chest still pitching over
 * the lead foot, the eyes on the empty space; the punish window shows it: he is still reaching
 * out over his feet while the fists come back, and only the last frame is the guard again. No
 * flash: a whiff and a catch share the reach, the hold sells the catch.
 */

const LEAD_TOE = toeOf(GUARD.nearFoot);

// Frame 0 (2 ticks): the gather. The gloves drop off the face and open, the hips dip, the lead
// heel peels up for the slide and the rear heel rises.
const GATHER: Pose = {
  ...GUARD,
  hip: at(-6.2, 35.8),
  torso: 16,
  head: 1,
  shrug: 1.4,
  twist: 0.05,
  nearFoot: onToes(LEAD_TOE, -6),
  farFoot: onToes(REAR_TOE, -18),
  nearFist: at(12.5, 53.2),
  farFist: at(13, 59),
  nearHand: 'open',
  farHand: 'open',
};

// Frame 1 (3 ticks): the lunge. The hips drive in, the lead foot skims in, the hands shoot out
// after them, dropping to the collar's height.
const LUNGE: Pose = {
  ...GUARD,
  hip: at(-4.8, 34.9),
  torso: 18,
  head: 1,
  shrug: 1.4,
  reach: { near: 0.8, far: 1 },
  twist: 0.1,
  nearFoot: lifted(planted(LEAD_IN - 1, 4), 1.2),
  farFoot: onToes(REAR_TOE, -24),
  nearFist: at(22, 54),
  farFist: at(20.5, 53),
  nearHand: 'open',
  farHand: 'open',
};

// Frame 2 (3 ticks, active): full reach. The hips in over the planted lead foot, its knee bent,
// the rear heel high; the arms long, the forearms near level, the open hands at the collar (the
// lead one) and the lapel (the rear one, lower), about to close.
const REACH: Pose = {
  ...GUARD,
  hip: at(-3.6, 33.8),
  torso: 20,
  head: 0,
  shrug: 1.2,
  reach: { near: 0.4, far: 1 },
  twist: 0.1,
  nearFoot: planted(LEAD_IN),
  farFoot: onToes(REAR_TOE, -30),
  nearFist: at(27.3, 53),
  farFist: at(25.8, 50.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
};

// Frame 3 (6 ticks): nothing there. The fists snap shut on air at full stretch, the chest still
// pitching on over the lead foot while the hips sit back half a pixel, the rear heel at its
// highest, the eyes on the empty space.
const WHIFF: Pose = {
  ...GUARD,
  hip: at(-4, 33.9),
  torso: 22.5,
  head: -2.5,
  shrug: 1.6,
  reach: { near: 0.6, far: 1 },
  twist: 0.05,
  nearFoot: planted(LEAD_IN),
  farFoot: onToes(REAR_TOE, -33),
  nearFist: at(28.5, 53.5),
  farFist: at(27, 51),
};

// Frame 4 (7 ticks): the pull-back begins. The fists come back halfway, the rear one rising for
// the cheek, the chest still pitched over the lead foot, which lifts to step home.
const RECOVER: Pose = {
  ...GUARD,
  hip: at(-4.8, 34.8),
  torso: 19,
  head: -0.5,
  shrug: 1.4,
  reach: { near: 0.8, far: 0.8 },
  twist: 0.05,
  nearFoot: lifted(planted(LEAD_IN - 0.8, 4), 1.4),
  farFoot: onToes(REAR_TOE, -26),
  nearFist: at(20, 53.5),
  farFist: at(18.5, 56.5),
};

// Frame 5 (7 ticks): the guard.
export const POSES: readonly Pose[] = [GATHER, LUNGE, REACH, WHIFF, RECOVER, GUARD];
