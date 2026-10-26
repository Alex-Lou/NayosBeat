import { at, ease, GUARD, planted, tween, type Effect, type Pose } from './common.ts';

/**
 * intro: 10 frames, 10,8,8,8,10,8,8,10,10,10 ticks (90, the round announcement). He takes his
 * time: cracks his knuckles (fist pressed into the palm, the elbow flares, a small pop), rolls
 * his neck, touches the headphones around his neck and nods on the beat they pulse (flat rings
 * of sound around the collar), then a smirk and a lazy "come on" with the lead hand, and he
 * slides the back foot into the Philly shell. The last frame is exactly GUARD: the fight starts
 * on idle's frame 0 without a pop.
 *
 * Standing tall and loose between the beats (weight on the back leg, the rear hand in the
 * pocket while the lead one works), the head always a little late on the body.
 */

/** A ring of sound around the collar, flattened: it spreads around the neck, not over the face. */
const pulse = (radius: number, progress: number): Effect => ({
  kind: 'ring',
  center: at(-0.5, 64),
  radius,
  progress,
  tone: 'sound',
  squash: 0.5,
});

/** Standing tall and relaxed, the weight on the back leg: the base of the entrance. */
const STAND: Pose = {
  hip: at(-2.5, 40.4),
  torso: -2,
  head: 6,
  shrug: 1,
  nearFoot: planted(5.5),
  farFoot: planted(-9),
  nearFist: at(9, 47),
  farFist: at(8, 47),
  face: 'cool',
};

/** The rear hand in the pocket (the elbow shows behind the back). */
const POCKET = at(-4, 38.5);

// 0 · Head down, the lead fist resting in the rear palm at the belt.
const PALM: Pose = {
  ...STAND,
  hip: at(-3.4, 40.2),
  torso: -3,
  head: 14,
  farHand: 'open',
  nearFist: at(7.5, 45),
  farFist: at(11.5, 44.5),
};

// 1 · Up to the chest, shoulders up, the elbow tucked: the squeeze.
const SQUEEZE: Pose = {
  ...STAND,
  hip: at(-3, 40.7),
  torso: -5,
  head: 10,
  shrug: 2.8,
  twist: 0.3,
  farHand: 'open',
  nearFist: at(9, 55),
  farFist: at(13.5, 54.5),
};

// 2 · The crack: the elbow flares up over the hands, the shoulders roll in, the chin tucks and
// the knees give a little; a small pop at the knuckles.
const CRACK: Pose = {
  ...STAND,
  hip: at(-2, 39.6),
  torso: 4,
  head: 16,
  shrug: 3.4,
  twist: -0.3,
  reach: { near: 1.5, far: 1.5 },
  farHand: 'open',
  nearFist: at(11.5, 52.5),
  farFist: at(15.5, 52),
  bends: { nearElbow: 'up' },
  effects: [{ kind: 'flash', center: at(16, 52.5), radius: 3.5, tone: 'strike' }],
};

// 3 · Release: the hands drop open and loose, the neck rolls back, the lead heel pops.
const ROLL: Pose = {
  ...STAND,
  hip: at(-2.8, 40.7),
  torso: -5,
  head: -9,
  shrug: 0.4,
  nearFoot: planted(5.5, -7),
  nearFist: at(9, 43),
  farFist: at(-6, 41),
  nearHand: 'open',
  farHand: 'open',
};

// 4 · The lead hand to the headphones' cup, the head tilts down to listen: the first pulse.
const LISTEN: Pose = {
  ...STAND,
  head: 10,
  shrug: 1.5,
  nearHand: 'open',
  nearFist: at(2.5, 60),
  farFist: POCKET,
  bends: { farElbow: 'back' },
  effects: [pulse(7, 0.1)],
};

// 5 · The nod on the beat: knees dip, the fingers pinch the cup, a second pulse.
const NOD: Pose = {
  ...LISTEN,
  hip: at(-2.7, 39.4),
  head: 15,
  nearHand: 'fist',
  nearFist: at(2.2, 60.5),
  effects: [pulse(11, 0.5), pulse(7, 0.05)],
};

// 6 · Chin up, feeling it; the hand slides off down the jacket, the pulses fade out.
const VIBE: Pose = {
  ...LISTEN,
  hip: at(-2.6, 40.5),
  head: -4,
  nearFist: at(7, 52),
  effects: [pulse(14, 0.85), pulse(10.5, 0.5)],
};

// 7 · The smirk, leaning back, hips forward: the lead palm turns up, "come on".
const COME_ON: Pose = {
  ...STAND,
  hip: at(-2.2, 40.6),
  torso: -7,
  head: -8,
  shrug: 1,
  nearFist: at(11.5, 57),
  farFist: POCKET,
  nearHand: 'open',
  bends: { farElbow: 'back' },
  face: 'smirk',
};

// 8 · He slides into the shell: the back foot drags back on its toes, the body sinks, the
// hands come up, the lead shoulder rolls to the chin. Still smirking.
const SLIDE: Pose = {
  ...tween(COME_ON, GUARD, 0.75, ease.out),
  farFoot: planted(-12, -10),
  face: 'smirk',
};

// 9 · The guard, game face on.
export const POSES: readonly Pose[] = [
  PALM,
  SQUEEZE,
  CRACK,
  ROLL,
  LISTEN,
  NOD,
  VIBE,
  COME_ON,
  SLIDE,
  GUARD,
];
