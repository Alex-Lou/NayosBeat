import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';
import { HOLD, LEAD_IN, onToes, REAR_TOE, toeOf } from './hold.ts';
import { SETTLE } from './throwForward.ts';

/**
 * throwBack (Projection d'épaule, docs/combat-v2.md §4.3, §11.2): 9 frames, 3, 3, 4, 4, [1], 6,
 * 7, 7, 7 ticks (42); the sides switch on tick 6, the release is frame 4 (tick 14). From hold:
 * at the collar, over his head and down behind him; the opponent lands about 66 px behind him.
 * Back to the guard.
 *
 * He drops his hips under the opponent and hauls the collar down in front; then he sinks under him,
 * upright, and hoists him up over his head, the arms raised in front of his face, elbows forward,
 * the opponent lying across above him; then the heave, the legs driving him up tall, the head
 * ducking a little under the opponent's chest while the fists roll the collar over the top to
 * behind his neck: both hands behind his neck, both elbows forward (hands clasped behind the neck),
 * the lead elbow low under the chin, the rear one up in front of his face on the far side, the
 * opponent upside down over his shoulders (the game puts him behind from tick 6, the heave's
 * first). Then he sits back into the throw, the hips dropping back toward the rear foot, the back
 * arched, the pivot in the feet (the lead heel turns in on its ball, the rear knee sinks low over
 * the ball of its foot, a lunge's), the arms whipping down behind him, long, the elbows soft, to
 * let go low behind him: the release. The arms swing on through, he eases out of it and turns back
 * to the front, the arms swinging loose to the front, steps the lead foot home, the guard comes up
 * a pixel past its marks and settles.
 *
 * The rear foot works on its ball all through the throw, the toes on their mark: every beat
 * bends the rear knee forward over it, deep (the dip, the hoist, the sit), and a heel left on
 * the floor under it would fold the ankle past its stop. The heel rises with the knee and only
 * comes back down to the guard's as he turns out of it.
 *
 * Every joint stays a human one (tools/sprites/anatomy.ts): no arm raised behind the back past 60
 * degrees, the arms go over the head in front of it and come down behind it with the back's arch,
 * and no elbow ever folds backward on the picture: a hand behind the head is reached with its elbow
 * forward, never with the elbow out behind and the forearm up (the barbell grip of a back squat,
 * which reads side on as an arm broken backward). The fists draw the opponent's path for
 * thrownBack, frame for frame (the middle of the two hands, 2.4 px past the wrists, rides the
 * opponent's neck: tests/tools/hold-pairs.test.ts, for Nayo's thrownBack and Riff's): the collar at
 * about (24, 50) pulled down in front, (8, 65) hoisted over his head, (-2.5, 61) behind his neck,
 * then down behind him, about (-25, 26), over and at the release: where thrownBack's last frame
 * holds the opponent's neck.
 */

/** Where the lead foot's toes stay while it pivots on its ball. */
const LEAD_TOE = toeOf(planted(LEAD_IN));

/** How far the grip of a hand sits past its wrist, along the forearm (the pair test's). */
const HAND = 2.4;

/**
 * `body` with its hands on `near` and `far`: the wrists placed so that each hand (HAND px past
 * its wrist, along its forearm) grips there. The collar the fists hold is the middle of the two.
 */
function gripping(body: Omit<Pose, 'nearFist' | 'farFist'>, near: Point, far: Point): Pose {
  let pose: Pose = { ...body, nearFist: near, farFist: far };
  for (let i = 0; i < 12; i++) {
    const { near: n, far: f } = solve(pose);
    pose = {
      ...pose,
      nearFist: at(near.x - n.forearm.x * HAND, near.y - n.forearm.y * HAND),
      farFist: at(far.x - f.forearm.x * HAND, far.y - f.forearm.y * HAND),
    };
  }
  return pose;
}

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
  farFoot: onToes(REAR_TOE, -32),
  nearFist: at(24, 50),
  farFist: at(21.5, 47),
  face: 'effort',
};

// Frame 1 (3 ticks): the hoist. He sinks under him, upright, the hips low between the feet,
// the rear heel high; the arms come up in front of his face, elbows forward and the forearms up,
// and lift the collar over his head: the opponent comes up across above him.
const LOAD: Pose = gripping(
  {
    ...HOLD,
    hip: at(-6, 28.5),
    torso: 16,
    head: -2,
    shrug: 1.5,
    reach: { near: 0, far: 0 },
    twist: 0.45,
    farFoot: onToes(REAR_TOE, -48),
    effects: [smear(4, [22, 51], [17, 57], [12.5, 62])],
    face: 'effort',
  },
  at(12, 62),
  at(5.5, 69),
);

// Frame 2 (4 ticks, the sides switch on its first, tick 6): the heave. The legs drive him up out
// of the hoist, tall, the head ducking a little under the opponent's chest while the fists roll
// the collar over the top to behind his neck: both hands there, the lead one at his nape, the
// rear one just behind his head, both elbows forward as when hands clasp behind the neck. The
// lead elbow low in front of the chest, its forearm rising under the jaw (the face stays clear),
// the rear elbow up in front of the face on the far side, its forearm hidden behind the head;
// the opponent upside down over his shoulders. The collar (the middle of the hands) stays where
// the pair test holds it, about (-2.25, 60.75): the torso leans only 16 degrees, the hips a
// pixel higher, so that his nape comes back under it and both elbows can stay forward.
const HEAVE: Pose = gripping(
  {
    ...HOLD,
    hip: at(-6, 34),
    torso: 16,
    head: 4,
    shrug: -1,
    reach: { near: 0, far: 0 },
    twist: 0.6,
    farFoot: onToes(REAR_TOE, -30),
    bends: { nearElbow: 'front', farElbow: 'front' },
    effects: [smear(5, [13, 63], [9, 68.5], [3, 69], [-2, 64])],
    face: 'effort',
  },
  at(0.75, 59.75),
  at(-5.25, 61.75),
);

// Frame 3 (4 ticks): over. He sits back into the throw, the hips dropping back toward the rear
// foot, the back arched: the arms, long, the elbows soft, drag the collar over his shoulder and
// down behind him, low, where the opponent hangs head down; the pivot in the feet: the lead heel
// turns in on its ball, the rear knee sinks low over the ball of its foot, the heel up.
const OVER: Pose = gripping(
  {
    ...HOLD,
    hip: at(-11, 31.5),
    torso: -18,
    head: 12,
    shrug: 1,
    reach: { near: 0, far: 0 },
    twist: 1,
    nearFoot: onToes(LEAD_TOE, -18),
    farFoot: onToes(REAR_TOE, -34),
    bends: { nearElbow: 'back', farElbow: 'back' },
    effects: [smear(5, [-3, 65], [-13, 61], [-20.5, 49], [-23.5, 34])],
    face: 'effort',
  },
  at(-23, 27),
  at(-26.5, 26),
);

// Frame 4 (1 tick, the release): arched a little further, the arms whip down behind him and let
// go, the hands opening; speed lines where the opponent leaves, up and back.
const RELEASE: Pose = gripping(
  {
    ...HOLD,
    hip: at(-11.5, 31),
    torso: -21,
    head: 12,
    shrug: 0.8,
    reach: { near: 0, far: 0 },
    twist: 0.8,
    nearFoot: onToes(LEAD_TOE, -20),
    farFoot: onToes(REAR_TOE, -37),
    bends: { nearElbow: 'back', farElbow: 'back' },
    nearHand: 'open',
    farHand: 'open',
    effects: [
      smear(5, [-18, 45], [-22.5, 36], [-24.5, 29], [-25, 26]),
      { kind: 'speed', center: at(-38, 30), length: 14, spread: 9, direction: 130, tone: 'strike' },
    ],
    face: 'effort',
  },
  at(-23.5, 26),
  at(-27, 25),
);

// Frame 5 (6 ticks): the follow-through. The arms swing on, loose, the elbows giving, the weight
// coming back up over the hips out of the arch, the lead heel coming down off the pivot, the rear
// one easing down; a puff of dust where the rear ball ground into the floor.
const THROUGH: Pose = gripping(
  {
    ...HOLD,
    hip: at(-9, 33),
    torso: -10,
    head: 10,
    shrug: 1,
    reach: { near: 0, far: 0 },
    twist: 0.5,
    nearFoot: onToes(LEAD_TOE, -10),
    farFoot: onToes(REAR_TOE, -28),
    bends: { nearElbow: 'back', farElbow: 'back' },
    nearHand: 'open',
    farHand: 'open',
    effects: [dust(REAR_TOE - 2, 2.6, 0.4)],
    face: 'effort',
  },
  at(-18, 29),
  at(-21, 29.5),
);

// Frame 6 (7 ticks): he eases out of it, turning back to the front: the chest coming up over the
// hips, the arms swinging loose to the front, the elbows soft, the fists closing low in front of
// the hips; the lead foot lifting home, the rear heel back where the guard holds it.
const TURN: Pose = {
  ...GUARD,
  hip: at(-5.5, 35.4),
  torso: 4,
  head: 7,
  shrug: 1.4,
  twist: 0.35,
  nearFoot: lifted(planted(LEAD_IN - 1.6, 3), 1.2),
  farFoot: onToes(REAR_TOE, -15),
  nearFist: at(3.1, 38.9),
  farFist: at(-1.1, 40.1),
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
