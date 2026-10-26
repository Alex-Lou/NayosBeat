import { at, energy, GUARD, lifted, planted, type Effect, type Pose } from './common.ts';

/** A ring of sound around `(x, y)`, `progress` from 0 (born, bright, thick) to 1 (faded). */
const ring = (x: number, y: number, radius: number, progress: number): Effect => ({
  kind: 'ring',
  center: at(x, y),
  radius,
  progress,
  tone: 'sound',
});

// Startup (frames 0-3, 3 ticks each): the hands go to the rear hip and hunch over a ball of
// sound like a DJ over the decks. The ball grows, rings of sound converge into it.

// Frame 0: out of the shell, the lead hand slides back along the belt, the rear one drops.
const SWING: Pose = {
  ...GUARD,
  hip: at(-4.6, 35.6),
  torso: 1,
  head: 11,
  shrug: 3,
  twist: -0.4,
  nearFist: at(1.5, 40.5),
  farFist: at(-6, 45),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(5.6, -4),
  bends: { nearElbow: 'front', farElbow: 'down' },
};

// Frame 1: coiled, chest turned away, the lead shoulder still up at the chin; the palms frame
// the ball at the rear hip (lead palm on top, rear one under it).
const COIL: Pose = {
  ...GUARD,
  hip: at(-6.4, 34),
  torso: 7,
  head: 6,
  shrug: 3.4,
  twist: -0.8,
  nearFist: at(-8.5, 45),
  farFist: at(-13, 38.5),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(5.6, -9),
  bends: { nearElbow: 'front', farElbow: 'front' },
  effects: [energy(-15, 40, 2.3), ring(-15, 40, 14, 0.8)],
};

// Frame 2: the scratch: the lead fingertips drag back over the top of the ball, the head nods
// on the beat; the first ring closes in, a second one follows.
const SCRATCH: Pose = {
  ...COIL,
  hip: at(-7.3, 33),
  torso: 10,
  head: 12,
  nearFist: at(-11.5, 47),
  farFist: at(-13.5, 38),
  nearFoot: planted(5.5, -11),
  effects: [energy(-15.4, 39.7, 3.2), ring(-15.4, 39.7, 12, 0.5), ring(-15.4, 39.7, 15, 0.85)],
};

// Frame 3: the scratch back and the deepest coil, low on the rear leg, lead heel up; the ball
// at full size, the rings tight around it.
const LOAD: Pose = {
  ...COIL,
  hip: at(-8, 32),
  torso: 12,
  head: 3,
  shrug: 3.8,
  nearFist: at(-8, 45),
  farFist: at(-14, 37.5),
  nearFoot: planted(5.2, -14),
  effects: [energy(-15.6, 39.4, 4), ring(-15.6, 39.4, 12.5, 0.2), ring(-15.6, 39.4, 13, 0.55)],
};

// Frame 4 (8 ticks, the wave leaves at x 24, y 43): the body uncoils, the lead foot stamps a
// short step, chest squared, both palms drive out stacked at the belt; a sound flash in a thin
// ring at the palms, a puff of dust under the stamp.
const PUSH: Pose = {
  ...GUARD,
  hip: at(0, 32.8),
  torso: 5,
  head: 5,
  shrug: 0.3,
  reach: { near: 1.2, far: 1.8 },
  twist: 0.55,
  nearFist: at(22, 42),
  farFist: at(21.2, 47.4),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(9),
  farFoot: planted(-13.5, -28),
  face: 'effort',
  effects: [
    ring(26, 44, 13, 0.5),
    { kind: 'flash', center: at(27, 44), radius: 7.5, tone: 'sound' },
    { kind: 'dust', x: 10.5, size: 2.6, progress: 0.15 },
  ],
};

// Recovery (frames 5-8): the release's ripples spread and drift after the wave while he
// rolls back into the shell.

// Frame 5: follow-through, the palms drift on a hair, two ripples open ahead of them.
const HOLD: Pose = {
  ...PUSH,
  hip: at(0.2, 33),
  torso: 6,
  head: 6,
  nearFist: at(22.4, 42.4),
  farFist: at(21.4, 48),
  effects: [
    ring(29.5, 44, 15, 0.4),
    ring(29.5, 44, 9, 0.3),
    { kind: 'dust', x: 10.5, size: 2.6, progress: 0.55 },
  ],
};

// Frame 6: the hands come back along the same line, the body rises, the lead foot steps back.
const RETURN: Pose = {
  ...GUARD,
  hip: at(-2.2, 35.4),
  torso: 2,
  head: 9,
  shrug: 2.2,
  reach: { near: 0.6, far: 0.6 },
  twist: 0.2,
  nearFist: at(10.8, 44.2),
  farFist: at(10.5, 57),
  nearFoot: lifted(planted(6.8), 0.8),
  farFoot: planted(-13.5, -8),
  effects: [
    ring(31, 44, 15, 0.75),
    ring(31, 44, 11, 0.6),
    { kind: 'dust', x: 10.5, size: 2.6, progress: 0.85 },
  ],
};

// Frame 7: back in the shell, the shoulder rolls up past its rest; a cool look as the last
// ripple fades.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-3, 36.6),
  torso: -1,
  head: 11,
  shrug: 3.9,
  nearFist: at(8.5, 43.5),
  farFist: at(8, 61.5),
  nearFoot: planted(5.8),
  face: 'cool',
  effects: [ring(32.5, 44, 15, 0.95)],
};

// Frame 8: guard.
const REST: Pose = { ...GUARD, hip: at(-3.2, 37.1) };

/**
 * special (Onde sonore): a DJ's scratch on a ball of sound at the rear hip, then both palms
 * push the wave out. Ticks 3,3,3,3,8,6,5,5,5; the wave leaves at the start of frame 4
 * (x 24, y 43), right out of the palms.
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
  REST,
];
