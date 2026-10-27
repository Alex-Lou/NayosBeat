import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import {
  advance,
  box,
  dash,
  glide,
  HEAVY_CANCELS,
  kd,
  leapArc,
  LIGHT_CANCELS,
  strike,
  throwMove,
} from './shared';

/**
 * Riff, the rushdown, « elle danse autour de toi » (docs/combat-v2.md §5.3, §5.5, §10.2): the
 * quickest normals, a slide under projectiles, two overheads, the only blow behind her in the
 * air; less health, a short reach, no reversal on the ground. Her blows spin and kick where
 * Nayo's go straight.
 */
export const RIFF: FighterTemplate = {
  name: 'Riff',
  maxHealth: 900,
  walkForwardSpeed: px(1.9),
  walkBackSpeed: px(1.4),
  // A quicker, lower jump: 27 ticks above the ground, 66.5 px high, 73 px forward. Jump-ins
  // hard to catch on reaction: the rushdown's identity.
  jumpVelocity: px(10),
  gravity: px(0.7),
  jumpForwardSpeed: px(2.6),
  jumpBackSpeed: px(2.1),
  preJumpFrames: 3,
  landingFrames: 2,
  knockdownFrames: 40,
  standingPushbox: { width: px(26), height: px(74) },
  crouchingPushbox: { width: px(30), height: px(46) },
  airPushbox: { width: px(22), height: px(40), lift: px(26) },
  lyingPushbox: { width: px(26), height: px(20) },
  // Her body as the art brief draws it (docs/combat-v2.md §9.2), until her strips can be
  // measured: the grey box shows exactly these.
  standingHurtboxes: [box(-15, 0, 27, 76)],
  crouchingHurtboxes: [box(-16, 0, 29, 50)],
  airHurtboxes: [box(-14, 4, 26, 60)],
  moves: {
    standLight: strike({
      name: 'Jab',
      frames: [3, 2, 6],
      damage: 25,
      stun: [13, 9],
      hitstop: 7,
      pushbackPx: 2.5,
      guard: 'mid',
      hitbox: box(9, 42, 24, 12),
      cancelInto: LIGHT_CANCELS,
      chain: 'chainLight',
    }),
    // L, L, L (§7.2): a spinning backhand, then a circular kick that sweeps the opponent away.
    // Each steps in 10 px and the backhand barely pushes back: the chain holds wherever the
    // jab hit.
    chainLight: strike({
      name: 'Revers',
      frames: [5, 3, 10],
      damage: 30,
      stun: [16, 11],
      hitstop: 8,
      pushbackPx: 1.5,
      guard: 'mid',
      hitbox: box(8, 44, 30, 14),
      motion: advance(18, { from: 0, to: 5, distancePx: 10 }),
      cancelInto: HEAVY_CANCELS,
      chain: 'lightFinisher',
    }),
    lightFinisher: strike({
      name: 'Swipe',
      frames: [7, 3, 18],
      damage: 45,
      stun: [0, 11],
      hitstop: 10,
      pushbackPx: 4,
      guard: 'mid',
      hitbox: box(8, 30, 34, 26),
      motion: advance(28, { from: 0, to: 7, distancePx: 10 }),
      knockdown: kd(2.5, 4),
    }),
    // → + L: a dance step forward (20 px), then a jab. +1 on block and cancellable into a
    // normal: her pressure and her traps.
    forwardLight: strike({
      name: 'Toprock',
      frames: [8, 2, 10],
      damage: 30,
      stun: [15, 12],
      hitstop: 8,
      pushbackPx: 2.5,
      guard: 'mid',
      hitbox: box(8, 44, 24, 14),
      motion: advance(20, { from: 0, to: 8, distancePx: 20 }),
      cancelInto: LIGHT_CANCELS,
    }),
    // → + H: the leg rises straight, then chops down like an axe. An overhead quicker than
    // Nayo's (17 ticks), −4 on block.
    forwardHeavy: strike({
      name: 'Talon',
      frames: [17, 3, 14],
      damage: 60,
      stun: [17, 12],
      hitstop: 11,
      // Pushed 14 px in all: a CONTRE still links into the Jab (§7.3).
      pushbackPx: 2.5,
      guard: 'overhead',
      hitbox: box(8, 34, 26, 36),
      motion: advance(34, { from: 4, to: 14, distancePx: 15 }),
    }),
    // ← + H: a scorpion kick, the leg over her head, covering behind her too (against
    // cross-ups). The launcher; it whiffs on a crouching opponent (57 px at most).
    backHeavy: strike({
      name: 'Retourné',
      frames: [6, 5, 15],
      damage: 55,
      stun: [0, 13],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(-12, 58, 34, 42),
      knockdown: kd(5, 0.5, { juggle: true }),
      cancelInto: HEAVY_CANCELS,
    }),
    standHeavy: strike({
      name: 'Coup de coude',
      frames: [6, 3, 14],
      damage: 70,
      stun: [19, 13],
      hitstop: 11,
      // A short push: the Genou montant (28 px of reach) still catches what it hit (§7.8).
      pushbackPx: 2,
      guard: 'mid',
      hitbox: box(9, 40, 34, 18),
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Coup bas',
      frames: [3, 2, 7],
      damage: 20,
      stun: [12, 8],
      hitstop: 6,
      pushbackPx: 2,
      guard: 'low',
      hitbox: box(10, 4, 22, 10),
      cancelInto: LIGHT_CANCELS,
    }),
    // A breakdance windmill along the floor: it sweeps.
    crouchHeavy: strike({
      name: 'Windmill',
      frames: [7, 3, 18],
      damage: 65,
      stun: [0, 13],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'low',
      hitbox: box(10, 2, 34, 12),
      knockdown: kd(2, 3, { trip: true }),
    }),
    // The splits in the air: the only blow of the duo that hits behind (a cross-up).
    jumpLight: strike({
      name: 'Ciseau aérien',
      frames: [3, 6, 5],
      damage: 25,
      stun: [13, 9],
      hitstop: 7,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(-14, 6, 40, 18),
    }),
    jumpHeavy: strike({
      name: 'Talon sauté',
      frames: [6, 5, 9],
      damage: 65,
      stun: [17, 11],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(2, -4, 30, 22),
    }),
    // She dives and slides on her hip, feet first, 64 px: her body 26 px high from frame 2 to
    // 20 goes under the Vinyle and the high blows. A low that sweeps: block it crouching, or
    // hit it low (the Coup bas catches it).
    special: strike({
      name: 'Glissade',
      kind: 'special',
      frames: [10, 8, 16],
      damage: 70,
      stun: [0, 14],
      hitstop: 10,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(6, 2, 30, 12),
      motion: glide(34, { from: 1, to: 18, distancePx: 64 }),
      hurtboxes: [{ frames: { from: 2, to: 21 }, boxes: [box(-20, 0, 40, 26)] }],
      knockdown: kd(2, 3.5, { trip: true }),
    }),
    // A spin that really leaves the ground (34 px high at frame 11) and lands heels first: an
    // overhead over the low blows (frames 4-18) and the grabs (in the air on frames 3-19). An
    // anti-air brings her down.
    specialForward: strike({
      name: "Saut de l'ange",
      kind: 'special',
      frames: [16, 4, 14],
      damage: 70,
      stun: [18, 10],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(0, 16, 30, 40),
      motion: {
        ...advance(34, { from: 4, to: 20, distancePx: 35 }),
        y: leapArc(34, { from: 3, to: 20, apexPx: 34 }),
      },
    }),
    specialAntiAir: strike({
      name: 'Genou montant',
      kind: 'special',
      frames: [4, 6, 24],
      damage: 95,
      stun: [0, 12],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 30, 24, 62),
      // Against attacks from the air only: no reversal on the ground, her weakness.
      invincible: { from: 0, to: 6, against: 'air' },
      motion: advance(34, { from: 0, to: 8, speed: 1.5 }),
      knockdown: kd(3, 3),
    }),
    // The grab, then what she does with the opponent she holds (docs/combat-v2.md §4.3).
    grab: {
      name: 'Prise',
      kind: 'grab',
      startup: 5,
      active: 3,
      recovery: 19,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 22, 36),
    },
    // Quick headbutts: three fit in a hold the opponent does not struggle against.
    pummel: throwMove({ name: 'Coup de tête', startup: 4, recovery: 7, damage: 10, hitstop: 5 }),
    // A scissor of the legs: the opponent falls close by, for the pressure on the wake-up.
    throwForward: throwMove({
      name: 'Ciseaux',
      startup: 10,
      recovery: 21,
      damage: 85,
      hitstop: 10,
      knockdown: kd(3, 2),
    }),
    // The monkey flip: over her, about 66 px behind. The sides switch on tick 6, like Nayo's
    // (the same first frames: the arc goes over the head there).
    throwBack: throwMove({
      name: 'Roulade',
      startup: 14,
      recovery: 25,
      damage: 80,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // Footwork: from frame 8 (53 px covered) it cancels into a normal or the grab, which glides
    // on with half the dash's speed. No run state: the cancel does that job.
    dashForward: dash({
      name: 'Footwork',
      duration: 16,
      frames: 12,
      distancePx: 64,
      freeCancelFrom: 8,
    }),
    // Grab-proof on frames 0-10 (the answer to the grab), but strikes still hit it.
    dashBack: dash({
      name: 'Retrait',
      duration: 20,
      frames: 14,
      distancePx: 48,
      back: true,
      throwInvincible: { from: 0, to: 11 },
    }),
  },
};
