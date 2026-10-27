import {
  at,
  ease,
  GUARD,
  lifted,
  planted,
  smear,
  tween,
  type Effect,
  type Pose,
} from './common.ts';

/**
 * intro: 10 frames, 10,8,8,8,10,8,8,10,10,10 ticks (90, the round announcement). He takes his
 * time: cracks his knuckles (the lead fist pressed into the rear palm, a squeeze, the elbow
 * flares, a small pop), shakes the hands out, sets the headphones around his neck (two flat
 * pulses of sound at the cup on the beat, the knees giving on it), then a composed stare at the
 * opponent, no smile, and he sinks into Tazz's high guard: the back foot slides back on its
 * ball, the gloves come up. The last frame is exactly GUARD: the fight starts on idle's frame 0
 * without a pop.
 *
 * Standing tall and loose between the beats, the weight on the back leg; the lead foot is
 * GUARD's from the start, so only the rear foot travels. The head stays under 20 degrees (drawn
 * upright, see head.ts): the attitude is in the chest, the shoulders and the hands.
 */

/**
 * A ring of sound around the neck, flattened, born just behind the headphones' cup: it spreads
 * over the collar, never over the face, and stays small and behind the cup so the hand holding
 * the cup reads.
 */
const pulse = (progress: number): Effect => ({
  kind: 'ring',
  center: at(-4, 64.5),
  radius: 7,
  progress,
  tone: 'sound',
  squash: 0.4,
});

/** Standing tall and easy, the weight on the back leg: the base of the entrance. */
const STAND: Pose = {
  hip: at(-4.2, 40),
  torso: 5,
  head: 6,
  shrug: 0.8,
  nearFoot: GUARD.nearFoot,
  farFoot: planted(-9.5),
  nearFist: at(8, 46),
  farFist: at(6, 46),
  face: 'cool',
};

/** The rear hand tucked in the back pocket (the elbow shows behind the back). */
const POCKET = at(-6, 39.5);

// 0 · The lead fist pressed into the rear palm at the chest, the shoulders loose.
const PALM: Pose = {
  ...STAND,
  hip: at(-4.6, 39.8),
  head: 12,
  shrug: 1.2,
  farHand: 'open',
  nearFist: at(9, 50),
  farFist: at(11.5, 51),
};

// 1 · The squeeze: hands pushed up and out, shoulders up, the chest lifting, up on the legs.
const SQUEEZE: Pose = {
  ...STAND,
  hip: at(-4.2, 40.6),
  torso: 3,
  head: 8,
  shrug: 2.6,
  twist: 0.3,
  farHand: 'open',
  nearFist: at(10.5, 54),
  farFist: at(13, 54.5),
};

// 2 · The crack: the lead elbow flares up over the hands, the shoulders roll in, the chin tucks
// and the knees give a little; a small pop of sound at the knuckles (his music, not a hit).
const CRACK: Pose = {
  ...STAND,
  hip: at(-3.8, 39.3),
  torso: 9,
  head: 10,
  shrug: 3,
  twist: -0.3,
  reach: { near: 1.5, far: 1.5 },
  farHand: 'open',
  nearFist: at(11.5, 51.5),
  farFist: at(14, 51),
  bends: { nearElbow: 'up' },
  effects: [{ kind: 'flash', center: at(15, 51.5), radius: 2.5, tone: 'sound' }],
};

// 3 · Shaking them out: a loose flick of the wrists, the hands open and trailing behind the
// forearms, the shoulders let go, the hips settle back, the lead heel lifts.
const SHAKE: Pose = {
  ...STAND,
  hip: at(-4, 40.8),
  torso: 3,
  head: 4,
  shrug: 0.2,
  nearFoot: planted(GUARD.nearFoot.x, -8),
  nearFist: at(11, 44),
  farFist: at(-1, 44),
  bends: { nearElbow: 'back', farElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  effects: [smear(3, [14, 49], [13, 46], [11, 44])],
};

// 4 · The lead hand up to the headphones' cup, the rear one into the pocket: the first pulse.
// The lead elbow comes forward at chest height, the forearm crossing the chest on a diagonal up
// to the cup, the fingers under its rim (the cup is drawn over them).
const CUP: Pose = {
  ...STAND,
  hip: at(-4.2, 40.2),
  head: 9,
  shrug: 1.6,
  nearHand: 'open',
  nearFist: at(3, 63.5),
  farFist: POCKET,
  bends: { nearElbow: 'front', farElbow: 'back' },
  effects: [pulse(0.2)],
};

// 5 · Setting it on the beat: the fingers pinch the cup, the knees dip, a second pulse.
const SET: Pose = {
  ...CUP,
  hip: at(-4.4, 39.2),
  torso: 6,
  head: 12,
  nearHand: 'fist',
  nearFist: at(3, 63),
  effects: [pulse(0.6), pulse(0.15)],
};

// 6 · The hand slides off down the jacket, he comes up tall, the second pulse spreads.
const LET_GO: Pose = {
  ...CUP,
  hip: at(-4.1, 40.4),
  torso: 4,
  head: 5,
  shrug: 1,
  nearFist: at(8.5, 50),
  bends: { farElbow: 'back' },
  effects: [pulse(0.55)],
};

// 7 · The stare: chin level, chest square on the opponent, the lead hand closing at his side.
const STARE: Pose = {
  ...STAND,
  hip: at(-4.6, 39.8),
  torso: 8,
  head: 7,
  shrug: 1.8,
  nearFist: at(4.5, 43),
  farFist: POCKET,
  bends: { farElbow: 'back' },
  effects: [pulse(0.9)],
};

// 8 · He drops into the guard: the back foot drag-steps back, skimming the floor on its ball to
// land on the guard's mark, the body sinks a touch past the stance (it settles back up into
// it), the gloves come up, the lead shoulder rolls in.
const DROP = tween(STARE, GUARD, 0.7, ease.linear);
const SINK: Pose = {
  ...DROP,
  hip: at(DROP.hip.x, GUARD.hip.y - 1),
  farFoot: lifted(planted(-20, -12), 1.5),
  face: 'cool',
};

// 9 · The guard, game face on.
export const POSES: readonly Pose[] = [
  PALM,
  SQUEEZE,
  CRACK,
  SHAKE,
  CUP,
  SET,
  LET_GO,
  STARE,
  SINK,
  GUARD,
];
