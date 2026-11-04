import { solve } from '../../skeleton.ts';
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
 * time: cracks his knuckles (the lead fist pressed into the rear palm, a squeeze, then the pop:
 * the shoulders hunch, the chin tucks, a small spark of sound at the knuckles), shakes both
 * hands out, sets the headphones around his neck (two flat pulses of sound at the cup on the
 * beat, the knees giving on it), then a composed stare at the opponent, no smile, and he sinks
 * into Tazz's high guard: the back foot slides back on its ball, the gloves come up. The last
 * frame is exactly GUARD: the fight starts on idle's frame 0 without a pop.
 *
 * Standing tall and loose between the beats, the weight on the back leg; the lead foot is
 * GUARD's from the start, so only the rear foot travels. The head stays under 20 degrees (drawn
 * upright, see head.ts): the attitude is in the chest, the shoulders and the hands.
 *
 * Seen side on, an elbow can only fold forward and down here (the solver cannot swing it out to
 * the side): the crack is sold by the shoulders and the chin, not by a flared elbow, and the
 * hand that holds the headphones' cup comes up the chest from an elbow kept low and in front,
 * the open fingers reaching back onto the cup, never an arm folded flat on itself. When the rear
 * arm has nothing to do, it hangs along the flank, hidden behind the body.
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

/**
 * The rear arm let go, hanging plumb from its shoulder along the flank, the elbow a little soft
 * (about 30 degrees, the forearm falling forward of it): wherever the body is, it stays hidden
 * behind the torso and the hips, never poking out of the back.
 */
function hanging(pose: Pose): Pose {
  const { shoulder } = solve(pose).far;
  return {
    ...pose,
    farFist: at(shoulder.x + HANG.x, shoulder.y + HANG.y),
    farHand: 'open',
    bends: { ...pose.bends, farElbow: 'back' },
  };
}
/** Where a hanging hand's wrist falls from its shoulder. */
const HANG = at(1.5, -23.9);

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

// 2 · The crack: the hands pulled in tight under the chin, the shoulders hunched up and rolled
// in, the chest folding over them, the chin tucked, the knees giving a little; a small pop of
// sound at the knuckles (his music, not a hit). Both elbows stay down, folded forward.
const CRACK: Pose = {
  ...STAND,
  hip: at(-3.8, 39.3),
  torso: 9,
  head: 10,
  shrug: 3,
  twist: -0.3,
  reach: { near: 1, far: 1 },
  farHand: 'open',
  nearFist: at(10.5, 56),
  farFist: at(13, 55.5),
  effects: [{ kind: 'flash', center: at(14.5, 56), radius: 2.5, tone: 'sound' }],
};

// 3 · Shaking them out: a loose flick of both wrists low in front of him, the hands open and
// trailing the forearms, the shoulders let go, the hips settle back, the lead heel lifts. The
// rear hand shows under the lead one, in front of the thigh.
const SHAKE: Pose = {
  ...STAND,
  hip: at(-4, 40.8),
  torso: 3,
  head: 4,
  shrug: 0.2,
  nearFoot: planted(GUARD.nearFoot.x, -8),
  nearFist: at(11, 44),
  farFist: at(7, 40.5),
  bends: { nearElbow: 'back', farElbow: 'down' },
  nearHand: 'open',
  farHand: 'open',
  effects: [smear(3, [14, 49], [13, 46], [11, 44]), smear(2.5, [9.5, 45], [8.5, 42.5], [7, 40.5])],
};

// 4 · The lead hand up to the headphones' cup: the elbow low in front of the ribs, the forearm
// up the chest on a diagonal, the open fingers reaching back over the cup's rim (the cup is
// drawn over them); the rear arm let go. The first pulse.
const CUP: Pose = hanging({
  ...STAND,
  hip: at(-4.2, 40.2),
  head: 9,
  shrug: 0.4,
  nearHand: 'open',
  nearFist: at(4.9, 64.2),
  bends: { nearElbow: 'front' },
  effects: [pulse(0.2)],
});

// 5 · Setting it on the beat: the fingers pinch the cup, the knees dip, a second pulse.
const SET: Pose = hanging({
  ...CUP,
  hip: at(-4.4, 39.2),
  torso: 6,
  head: 12,
  nearHand: 'fist',
  nearFist: at(5.2, 62.6),
  effects: [pulse(0.6), pulse(0.15)],
});

// 6 · The hand slides off down the jacket, he comes up tall, the second pulse spreads.
const LET_GO: Pose = hanging({
  ...CUP,
  hip: at(-4.1, 40.4),
  torso: 4,
  head: 5,
  shrug: 1,
  nearFist: at(8.5, 50),
  bends: {},
  effects: [pulse(0.55)],
});

// 7 · The stare: chin level, chest square on the opponent, the lead hand closing at his side.
const STARE: Pose = hanging({
  ...STAND,
  hip: at(-4.6, 39.8),
  torso: 8,
  head: 7,
  shrug: 1.8,
  nearFist: at(4.5, 43),
  effects: [pulse(0.9)],
});

// 8 · He drops into the guard: the back foot drag-steps back, skimming the floor on its ball
// (the heel up, under the sinking knee) to land on the guard's mark, the body sinks a touch
// past the stance (it settles back up into it), the gloves come up halfway, the lead shoulder
// rolls in.
const DROP = tween(STARE, GUARD, 0.7, ease.linear);
const RISE = tween(STARE, GUARD, 0.55, ease.linear);
const SINK: Pose = {
  ...DROP,
  hip: at(DROP.hip.x, GUARD.hip.y - 1),
  farFoot: lifted(planted(-19.1, -24), 1.5),
  // The gloves halfway up, riding the sink.
  nearFist: at(RISE.nearFist.x, RISE.nearFist.y - 1),
  farFist: at(RISE.farFist.x, RISE.farFist.y - 1),
  farHand: 'fist',
  bends: { nearElbow: 'down', farElbow: 'down' },
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
