import { BODY, solve } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, type Effect, type Foot, type Pose } from './common.ts';

/** A ring of sound around `(x, y)`, `progress` from 0 (born, bright, thick) to 1 (faded). */
const ring = (x: number, y: number, radius: number, progress: number): Effect => ({
  kind: 'ring',
  center: at(x, y),
  radius,
  progress,
  tone: 'sound',
});

/** Where the guard's toes touch the floor: the lead foot's and the rear one's (heel up). */
const LEAD_TOE = solve(GUARD).near.toe.x;
const REAR_TOE = solve(GUARD).far.toe.x;

/**
 * A foot on its toes at `toe`, the heel raised `angle` degrees (negative): the heel rises and
 * sinks around the toe, which stays put on the floor.
 */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

// Startup (frames 0-3, 3 ticks each): out of the high guard, the weight rocks back onto the rear
// leg and the hands sink to the rear hip, hunched over a ball of sound like a DJ over the decks.
// The ball grows, rings of sound converge into it.

// Frame 0: out of the guard, the gloves open and drop, sweeping down and back past the belt (the
// lead elbow stays in front of the jacket, between the guard's and the coil's); the chest starts
// turning away, the hips rock back.
const SWING: Pose = {
  ...GUARD,
  hip: at(-7.8, 35.4),
  torso: 10,
  head: 6,
  shrug: 2.6,
  twist: -0.5,
  nearFist: at(-6, 41),
  farFist: at(-9, 43),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -4),
  farFoot: onToes(REAR_TOE, -11),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

// Frame 1: coiled on the rear leg (its heel sinks), chest turned away, the lead shoulder up at
// the chin; the palms frame the ball at the rear hip (lead palm on top, rear one under it).
const COIL: Pose = {
  ...GUARD,
  hip: at(-9.2, 34),
  torso: 7,
  head: 8,
  shrug: 2.8,
  twist: -0.8,
  nearFist: at(-9.5, 45.5),
  farFist: at(-14, 38.5),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -8),
  farFoot: onToes(REAR_TOE, -7),
  bends: { nearElbow: 'front', farElbow: 'front' },
  effects: [energy(-12, 42, 2.3), ring(-12, 42, 14, 0.8)],
};

// Frame 2: the scratch: the lead palm drags back hard over the top of the ball, the head nods
// down on the beat; the first ring closes in, a second one follows.
const SCRATCH: Pose = {
  ...COIL,
  hip: at(-9.9, 33.1),
  torso: 8,
  head: 11,
  nearFist: at(-15, 48.5),
  farFist: at(-14.5, 38),
  nearFoot: onToes(LEAD_TOE, -10),
  farFoot: onToes(REAR_TOE, -6),
  effects: [energy(-14.7, 42.8, 3.2), ring(-14.7, 42.8, 12, 0.5), ring(-14.7, 42.8, 15, 0.85)],
};

// Frame 3: the scratch back and the deepest coil, low on the rear leg, the chest turned right
// away, lead heel up; the ball at full size between the palms, the rings tight around it.
const LOAD: Pose = {
  ...COIL,
  hip: at(-11, 32),
  torso: 6,
  head: 6,
  shrug: 3.2,
  twist: -0.95,
  nearFist: at(-8.5, 44.5),
  farFist: at(-15.5, 37),
  nearFoot: onToes(LEAD_TOE, -13),
  farFoot: onToes(REAR_TOE, -6),
  effects: [energy(-12.5, 41, 4), ring(-12.5, 41, 12.5, 0.2), ring(-12.5, 41, 13, 0.55)],
};

// Frame 4 (8 ticks, the wave leaves at x 24, y 43): the hips drive through off the rear toe,
// the lead foot stamps a short step, chest squared; one line from the rear toe through the hips
// and the leaning back to the head. Both arms shoot out long and the palms meet heel to heel
// just ahead of the spawn, inside the wave; a sound flash in a thin ring past them (the palms
// stay readable), dust under the stamp.
const PUSH: Pose = {
  ...GUARD,
  hip: at(-5.5, 33),
  torso: 17,
  head: 0,
  shrug: 0.6,
  reach: { near: 3, far: 3.5 },
  twist: 0.55,
  nearFist: at(26.5, 46.5),
  farFist: at(24.5, 43),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(10),
  farFoot: onToes(REAR_TOE, -28),
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'effort',
  effects: [
    ring(31, 44, 13, 0.5),
    { kind: 'flash', center: at(31.5, 44.5), radius: 6, tone: 'sound' },
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.15 },
  ],
};

// Recovery (frames 5-8): the release's ripples spread and drift after the wave while he
// rolls back into the high guard.

// Frame 5: follow-through, the whole pose drifts on half a pixel, two ripples open ahead.
const HOLD: Pose = {
  ...PUSH,
  hip: at(-5.2, 33.2),
  torso: 18,
  head: 0,
  nearFist: at(27, 46.9),
  farFist: at(25, 43.4),
  effects: [
    ring(33, 44, 15, 0.4),
    ring(33, 44, 9, 0.3),
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.55 },
  ],
};

// Frame 6: the hands come back up the same line toward the chin, the hips rock back, the lead
// foot steps home.
const RETURN: Pose = {
  ...GUARD,
  hip: at(-5.4, 35.3),
  torso: 15,
  head: 2,
  shrug: 1.6,
  reach: { near: 0.6, far: 0.6 },
  twist: 0.2,
  nearFist: at(15, 50.5),
  farFist: at(14.5, 57),
  nearFoot: lifted(planted(7.6, -4), 1),
  farFoot: onToes(REAR_TOE, -17),
  effects: [
    ring(33, 44, 15, 0.75),
    ring(33, 44, 11, 0.6),
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.85 },
  ],
};

// Frame 7: back in the high guard, up a hair past it on the bounce, the lead shoulder rolling
// up to the chin and the far glove a beat late; the last ripple fades.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.9, 37.1),
  torso: 14,
  head: 3,
  shrug: 2.2,
  nearFist: at(8.8, 55.6),
  farFist: at(10.5, 61.4),
  effects: [ring(33.5, 44, 15, 0.95)],
};

/**
 * Frame 8: the idle's last frame (the lead shoulder still up on the breath): the idle's own
 * 9 -> 0 beat carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
};

/**
 * special (Onde sonore): a DJ's scratch on a ball of sound at the rear hip, then both palms
 * push the wave out. Ticks 3,3,3,3,8,6,5,5,5; the wave leaves at the start of frame 4
 * (x 24, y 43), right out of the palms. Starts from the high guard and ends on the idle's last
 * frame (the guard, shoulder up on the breath); the toes keep their marks while the heels rise
 * and sink.
 */
export const POSES: readonly Pose[] = [
  SWING,
  COIL,
  SCRATCH,
  LOAD,
  PUSH,
  HOLD,
  RETURN,
  SETTLE,
  IDLE_HANG,
];
