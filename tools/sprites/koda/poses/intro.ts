import { at, energy, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';

/**
 * intro: 10 frames, 10,8,8,8,10,8,8,10,10,10 ticks (90 ticks, the round announcement).
 * BlazBlue / Guilty Gear style entrance: Koda stands tall with both silver gauntlets crossed in an
 * X in front of his chest, surrounded by a humming jade acoustic barrier; he slashes both tuning
 * blades wide open, shattering the barrier into diamond shards and speed lines, sweeps his lead
 * knife-hand forward in a martial arc, and drops into his low open-palm guard.
 */

const ring = (x: number, y: number, radius: number, progress: number, squash = 1.4): Effect => ({
  kind: 'ring',
  center: at(x, y),
  radius,
  progress,
  tone: 'sound',
  squash,
});

const STAND: Pose = {
  hip: at(-4.0, 40.2),
  torso: 3,
  head: 5,
  shrug: 1.0,
  nearFoot: GUARD.nearFoot,
  farFoot: planted(-10.0),
  nearFist: at(7.5, 53.0),
  farFist: at(9.5, 54.0),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'cool',
};

// 0 · Standing tall, silver gauntlets crossed in front of the chest, a jade aura gathering.
const CROSSED: Pose = {
  ...STAND,
  effects: [energy(9.0, 53.5, 2.8)],
  glows: [{ center: at(9, 53.5), reach: 22, power: 0.8, tone: 'sound' }],
};

// 1 · The crossed silver gauntlets tighten, a jade tuning ring forming around his torso.
const CHARGE_1: Pose = {
  ...STAND,
  hip: at(-4.2, 39.6),
  torso: 5,
  shrug: 2.0,
  nearFist: at(8.5, 54.5),
  farFist: at(10.5, 55.0),
  effects: [energy(9.5, 54.5, 3.6), ring(8, 52, 11, 0.25, 1.3)],
  glows: [{ center: at(9.5, 54.5), reach: 26, power: 1.1, tone: 'sound' }],
};

// 2 · Peak resonance before the slash: the barrier hums bright jade.
const CHARGE_2: Pose = {
  ...CHARGE_1,
  hip: at(-4.4, 39.0),
  torso: 7,
  shrug: 2.6,
  face: 'effort',
  effects: [energy(10.0, 55.0, 4.2), ring(8, 52, 14, 0.45, 1.3)],
  glows: [{ center: at(10, 55), reach: 30, power: 1.3, tone: 'sound' }],
};

// 3 · The X-Slash! Koda flings both silver gauntlets wide apart (lead arm swept down-back, rear
// arm raised high forward), shattering the jade barrier into diamond shards!
const SHATTER: Pose = {
  ...STAND,
  hip: at(-3.5, 40.8),
  torso: -2,
  head: 6,
  shrug: 2.2,
  twist: 0.45,
  nearFist: at(-7.5, 43.0),
  farFist: at(14.5, 68.0),
  bends: { nearElbow: 'back', farElbow: 'down' },
  face: 'kiai',
  effects: [
    smear(3.5, [8.5, 54.5], [1, 48], [-7.5, 43]),
    smear(3.5, [10.5, 55], [12.5, 62], [14.5, 68]),
    { kind: 'flash', center: at(10, 55), radius: 5, tone: 'sound' },
    { kind: 'shards', center: at(10, 55), radius: 16, progress: 0.25, tone: 'sound' },
    ring(8, 2, 16, 0.25, 0.3),
  ],
  glows: [{ center: at(10, 55), reach: 32, power: 1.4, tone: 'sound' }],
};

// 4 · Coat billowing open in the wake of the shatter, shards drifting outward.
const BILLOW: Pose = {
  ...SHATTER,
  hip: at(-3.8, 40.5),
  torso: 0,
  head: 5,
  nearFist: at(-8.5, 42.0),
  farFist: at(13.5, 70.0),
  face: 'cool',
  effects: [
    { kind: 'shards', center: at(10, 56), radius: 20, progress: 0.65, tone: 'sound' },
    ring(8, 2, 22, 0.65, 0.3),
  ],
  glows: [{ center: at(12, 64), reach: 24, power: 0.8, tone: 'sound' }],
};

// 5 · He sweeps his lead open knife-hand forward in a wide kung-fu salute while the rear hand
// chambers near his temple.
const SALUTE: Pose = {
  ...STAND,
  hip: at(-4.2, 39.8),
  torso: 6,
  head: 4,
  shrug: 1.4,
  twist: -0.25,
  nearFist: at(14.5, 51.0),
  farFist: at(4.5, 63.0),
  effects: [smear(3, [-4, 43], [6, 47], [14.5, 51]), ring(14.5, 51, 7, 0.3, 1.5)],
};

// 6 · Holding the extended knife-hand salute for a beat as the tuning ring fades.
const POISE: Pose = {
  ...SALUTE,
  hip: at(-4.5, 39.4),
  torso: 8,
  nearFist: at(13.5, 50.0),
  farFist: at(5.0, 62.8),
  effects: [ring(14.5, 51, 10, 0.75, 1.5)],
};

// 7 · The rear foot begins to slide back into the wide martial stance.
const STEP_BACK: Pose = {
  ...GUARD,
  hip: at(-5.4, 38.0),
  torso: 10,
  head: 4,
  farFoot: lifted(planted(-16.0, -10), 1.4),
  nearFist: at(11.0, 48.5),
  farFist: at(5.2, 62.6),
  face: 'cool',
};

// 8 · Sinking a hair past the guard as the rear foot plants on its ball.
const SINK: Pose = {
  ...GUARD,
  hip: at(-6.8, 35.8),
  torso: 14,
  head: 3,
  nearFist: at(8.8, 45.8),
  farFist: at(5.4, 62.8),
  effects: [{ kind: 'dust', x: -20, size: 2.5, progress: 0.4 }],
};

// 9 · Exactly GUARD: flows seamlessly into idle frame 0.
export const POSES: readonly Pose[] = [
  CROSSED,
  CHARGE_1,
  CHARGE_2,
  SHATTER,
  BILLOW,
  SALUTE,
  POISE,
  STEP_BACK,
  SINK,
  GUARD,
];
