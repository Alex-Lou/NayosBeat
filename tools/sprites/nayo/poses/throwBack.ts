import { at, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';
import { HOLD, LEAD_IN, onToes, REAR_TOE, toeOf } from './hold.ts';
import { SETTLE } from './throwForward.ts';

/**
 * throwBack (Projection d'épaule, docs/combat-v2.md §4.3, §11.2): 9 frames, 3, 3, 4, 4, [1], 6,
 * 7, 7, 7 ticks (42); the sides switch on tick 6, the release is frame 4 (tick 14). From hold:
 * at the collar, a pivot, over the shoulder; the opponent lands about 66 px behind him. Back to
 * the guard.
 *
 * He drops his hips under the opponent and ducks his lead shoulder into the chest, hauling the
 * collar down over his back; then the heave, the legs still driving, the back bent under the
 * load: the fists bring the collar onto the top of his shoulders behind the neck, elbows down,
 * the opponent across his shoulders (the game puts him behind from tick 6, the heave's first).
 * Only then he straightens and throws his weight back, the back arched far over, the pivot in
 * the feet (the lead heel turns in on its ball, the rear heel drops), the arms whip down behind
 * him and let go at his rear hip: the release. The arms swing on through, he eases out of it and
 * turns back to the front, steps the lead foot home, the guard comes up a pixel past its marks
 * and settles. The fists draw the opponent's path for thrownBack, frame for frame: the collar at
 * about (24, 50) pulled down in front, (8, 64) over his back, (-2.5, 62.5) on top of his
 * shoulders behind the neck, then down his back to his rear hip, about (-25, 26), over and at
 * the release: where thrownBack's last frame holds the opponent's neck (the pair test of
 * tests/tools/nayo-v2-sprites.test.ts).
 */

/** Where the lead foot's toes stay while it pivots on its ball. */
const LEAD_TOE = toeOf(planted(LEAD_IN));

/** Dust off the floor at `x`. */
function dust(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

// Frame 0 (3 ticks): the dip. The hips drop under him, the lead shoulder ducks in at his chest,
// the fists haul the collar down in front.
const DIP: Pose = {
  ...HOLD,
  hip: at(-4.8, 32),
  torso: 30,
  head: -11,
  shrug: 2.6,
  reach: { near: 1.5, far: 1.5 },
  twist: 0.2,
  farFoot: onToes(REAR_TOE, -14),
  nearFist: at(24, 50),
  farFist: at(21.5, 47),
  face: 'effort',
};

// Frame 1 (3 ticks): the load. Bent under him, the fists drag the collar up onto the back of his
// shoulders: the opponent comes up over his back.
const LOAD: Pose = {
  ...HOLD,
  hip: at(-4.2, 31.4),
  torso: 40,
  head: -21,
  shrug: 2.8,
  reach: { near: 0.5, far: 0.5 },
  twist: 0.45,
  farFoot: onToes(REAR_TOE, -12),
  nearFist: at(8, 64),
  farFist: at(5.5, 62.5),
  effects: [smear(4, [22, 51], [17, 57], [11, 62])],
  face: 'effort',
};

// Frame 2 (4 ticks, the sides switch on its first, tick 6): the heave. The legs still driving, the hips
// low, the back bent under the load: the fists have brought the collar up over his back onto the
// top of his shoulders behind the neck, elbows down, the opponent across his shoulders; the
// chest starts turning toward us.
const HEAVE: Pose = {
  ...HOLD,
  hip: at(-3.8, 33.6),
  torso: 18,
  head: 2,
  shrug: 2.8,
  reach: { near: 1, far: 0.5 },
  twist: 0.6,
  farFoot: onToes(REAR_TOE, -15),
  nearFist: at(-2.5, 62.5),
  farFist: at(-5, 61),
  effects: [smear(5, [14, 62], [9, 67.5], [3, 69], [-1.5, 66.5])],
  face: 'effort',
};

// Frame 3 (4 ticks): over. He straightens and throws his weight back, hips pushed through and
// sinking, the back arched far over: the arms, long, drag the collar on over his shoulder and
// down behind him to his rear hip, where the opponent hangs on his back, head down; the pivot in
// the feet: the lead heel turns in on its ball, the rear heel drops.
const OVER: Pose = {
  ...HOLD,
  hip: at(-1.4, 32),
  torso: -36,
  head: 12,
  shrug: 1.6,
  twist: 1,
  nearFoot: onToes(LEAD_TOE, -18),
  farFoot: onToes(REAR_TOE, -3),
  nearFist: at(-23.2, 29.4),
  farFist: at(-25.4, 27.2),
  effects: [smear(5, [-4, 66], [-14, 61.5], [-21, 48], [-23.5, 33])],
  face: 'effort',
};

// Frame 4 (1 tick, the release): arched a little further, the arms whip down behind him and let
// go at his rear hip, the hands opening; speed lines where the opponent leaves, up and back.
const RELEASE: Pose = {
  ...HOLD,
  hip: at(-1.2, 31.6),
  torso: -40,
  head: 12,
  shrug: 1.4,
  twist: 0.8,
  nearFoot: onToes(LEAD_TOE, -20),
  farFoot: onToes(REAR_TOE, -2),
  nearFist: at(-23.6, 27.6),
  farFist: at(-25.8, 25.4),
  nearHand: 'open',
  farHand: 'open',
  effects: [
    smear(5, [-18, 45], [-22.5, 36], [-24.5, 29], [-25, 26]),
    { kind: 'speed', center: at(-38, 30), length: 14, spread: 9, direction: 130, tone: 'strike' },
  ],
  face: 'effort',
};

// Frame 5 (6 ticks): the follow-through. The arms swing on, loose, the weight coming back up over
// the hips out of the arch, the lead heel coming down off the pivot; a puff of dust where the
// rear heel ground into the floor.
const THROUGH: Pose = {
  ...HOLD,
  hip: at(-2.8, 33.8),
  torso: -18,
  head: 10,
  shrug: 1.5,
  twist: 0.5,
  nearFoot: onToes(LEAD_TOE, -10),
  farFoot: onToes(REAR_TOE, -5),
  nearFist: at(-16, 31),
  farFist: at(-19, 30.5),
  nearHand: 'open',
  farHand: 'open',
  effects: [dust(REAR_TOE - 2, 2.6, 0.4)],
  face: 'effort',
};

// Frame 6 (7 ticks): he eases out of it, turning back to the front: the chest coming up, the arms
// swinging back down from behind, loose, the fists closing, the lead foot lifting home.
const TURN: Pose = {
  ...GUARD,
  hip: at(-4.6, 35.4),
  torso: 1,
  head: 9,
  shrug: 1.4,
  twist: 0.35,
  nearFoot: lifted(planted(LEAD_IN - 1.6, 3), 1.2),
  farFoot: onToes(REAR_TOE, -9),
  nearFist: at(-3.5, 39.5),
  farFist: at(-7, 40.5),
  bends: { nearElbow: 'back', farElbow: 'back' },
  effects: [dust(REAR_TOE - 2, 2.6, 0.8)],
};

// Frame 7 (7 ticks): the settle, the guard a pixel past itself (throwForward's). Frame 8 (7
// ticks): the guard.
export const POSES: readonly Pose[] = [
  DIP,
  LOAD,
  HEAVE,
  OVER,
  RELEASE,
  THROUGH,
  TURN,
  SETTLE,
  GUARD,
];
