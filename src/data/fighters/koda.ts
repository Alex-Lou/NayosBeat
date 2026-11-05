import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import { advance, box, dash, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike, throwMove } from './shared';
import { kodaBoost } from './koda-boost';
import { KODA_STRINGS } from './koda-strings';

/**
 * Koda, « l'accordeur d'acier »: a martial-arts pressure and resonance fighter in an open
 * storm-teal frock coat and silver plate pauldrons/vambraces (issue #174). Unlike Nayo (who zones
 * with a projectile and a meterless DP reversal), Koda has no projectile and his plain Cymbale
 * beats air attacks only; instead, he walks faster, cancels his forward Pas glissé dash from frame
 * 10, clashes his silver bracers in the Diapason shockwave to keep the opponent standing in his
 * pressure, and pierces mid-range with the grounded Fente d'acier lunge.
 */
const KODA_PLAIN: FighterTemplate = {
  name: 'Koda',
  maxHealth: 1000,
  walkForwardSpeed: px(1.65),
  walkBackSpeed: px(1.3),
  jumpVelocity: px(10.5),
  gravity: px(0.65),
  jumpForwardSpeed: px(2.2),
  jumpBackSpeed: px(1.9),
  preJumpFrames: 4,
  landingFrames: 3,
  knockdownFrames: 40,
  standingPushbox: { width: px(28), height: px(80) },
  crouchingPushbox: { width: px(32), height: px(50) },
  airPushbox: { width: px(24), height: px(44), lift: px(30) },
  lyingPushbox: { width: px(28), height: px(20) },
  standingHurtboxes: [box(-27, 0, 40.5, 78.5)],
  crouchingHurtboxes: [box(-18.5, 0, 32.5, 57)],
  airHurtboxes: [box(-22, 4, 43, 40), box(-11, 44, 29, 42.5)],
  moves: {
    ...KODA_STRINGS,
    forwardHeavy: strike({
      name: "Marteau d'argent",
      frames: [19, 3, 15],
      damage: 70,
      stun: [18, 13],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(12, 36, 28, 36),
      motion: advance(37, { from: 6, to: 14, distancePx: 8 }),
    }),
    backHeavy: strike({
      name: 'Sursaut',
      frames: [7, 4, 17],
      damage: 65,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 58, 26, 46),
      knockdown: kd(8, 0.5, { juggle: 4 }),
      counter: { knockdown: kd(8, 0.5, { juggle: 5 }) },
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Pointe basse',
      frames: [4, 2, 8],
      damage: 25,
      stun: [12, 8],
      hitstop: 7,
      pushbackPx: 2.5,
      guard: 'low',
      hitbox: box(12, 4, 26, 10),
      cancelInto: LIGHT_CANCELS,
      crouching: true,
    }),
    crouchHeavy: strike({
      name: 'Fauche du manteau',
      frames: [9, 3, 20],
      damage: 70,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(12, 2, 39, 12),
      knockdown: kd(2, 3.5, { trip: true }),
      crouching: true,
    }),
    jumpLight: strike({
      name: 'Genou vif',
      frames: [4, 6, 6],
      damage: 30,
      stun: [14, 10],
      hitstop: 8,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(4, 10, 24, 16),
    }),
    jumpHeavy: strike({
      name: 'Lame sautée',
      frames: [7, 5, 10],
      damage: 70,
      stun: [18, 12],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(2, -4, 34, 22),
    }),
    // S: Koda steps 26 px forward, clashes his two silver vambraces together, and releases a wide
    // acoustic shockwave (hitbox 8..45) that leaves the opponent standing (+1 on hit, −9 on block).
    special: strike({
      name: 'Diapason',
      kind: 'special',
      frames: [10, 4, 20],
      damage: 75,
      stun: [24, 14],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(8, 30, 37, 26),
      motion: advance(34, { from: 2, to: 10, distancePx: 26 }),
    }),
    // → + S: a grounded martial-arts spear-palm lunge over 42 px that floors the opponent.
    specialForward: strike({
      name: "Fente d'acier",
      kind: 'special',
      frames: [12, 4, 18],
      damage: 80,
      stun: [0, 12],
      hitstop: 13,
      pushbackPx: 3.5,
      guard: 'mid',
      hitbox: box(10, 32, 39, 20),
      motion: advance(34, { from: 2, to: 14, distancePx: 42 }),
      knockdown: kd(3, 3.5),
    }),
    // ↓ + S: rising silver-bracer sky slash, invincible to air attacks on f0-7 (his Remix buys full
    // reversal invincibility).
    specialAntiAir: strike({
      name: 'Cymbale',
      kind: 'special',
      frames: [3, 8, 28],
      damage: 105,
      stun: [0, 12],
      hitstop: 15,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 30, 20, 70),
      invincible: { from: 0, to: 8, against: 'air' },
      knockdown: kd(3, 3),
    }),
    grab: {
      name: 'Prise',
      kind: 'grab',
      startup: 5,
      active: 3,
      recovery: 20,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 24, 40),
    },
    pummel: throwMove({ name: 'Coup de coude', startup: 6, recovery: 9, damage: 15, hitstop: 6 }),
    throwForward: throwMove({
      name: 'Rejet',
      startup: 10,
      recovery: 25,
      damage: 100,
      hitstop: 10,
      knockdown: kd(3.5, 3.5),
    }),
    throwBack: throwMove({
      name: "Volte d'épaule",
      startup: 14,
      recovery: 27,
      damage: 90,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // A 52 px martial-arts glide, cancellable from frame 10 into any normal or special.
    dashForward: dash({
      name: 'Pas glissé',
      duration: 17,
      frames: 13,
      distancePx: 52,
      freeCancelFrom: 10,
    }),
    dashBack: dash({
      name: 'Retrait',
      duration: 22,
      frames: 16,
      distancePx: 44,
      back: true,
      throwInvincible: { from: 0, to: 12 },
    }),
  },
};

/** Koda with his Boost moves: the platine Remixes, Tempo, Octave. */
export const KODA: FighterTemplate = {
  ...KODA_PLAIN,
  moves: { ...KODA_PLAIN.moves, ...kodaBoost(KODA_PLAIN.moves) },
};
