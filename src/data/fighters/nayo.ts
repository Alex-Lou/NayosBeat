import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import { advance, box, dash, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike, throwMove } from './shared';
import { NAYO_STRINGS } from './nayo-strings';

/**
 * Nayo, the all-rounder, « le boxeur posé » (docs/combat-v2.md §5.2, §10.1): good range, a
 * projectile and a reliable anti-air; a boxer's straight lines, his chain ends on a wide hook,
 * his overhead is slow and telegraphed. He counts the beats (docs/combos-v3.md §2): the Direct,
 * the Cross, then the bass on the third, chosen by the direction; few blows, each heavy.
 */
export const NAYO: FighterTemplate = {
  name: 'Nayo',
  maxHealth: 1000,
  walkForwardSpeed: px(1.5),
  walkBackSpeed: px(1.2),
  // 31 ticks above the ground, 79.6 px high, 70 px forward: a higher jump than Riff's, which
  // clears projectiles better (feet above 48 px for 20 ticks).
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
  // Calibrated on the drawing (`npm run measure-boxes`, docs/combat-v2.md §9.2): the front edge
  // at the farthest the body reaches (toes and gloves, 15 px standing), the back at the rear
  // foot, the top at the hair. In the air the knees tuck 4 px ahead of the chest: legs and torso
  // get a box each.
  standingHurtboxes: [box(-27, 0, 40.5, 78.5)],
  crouchingHurtboxes: [box(-18.5, 0, 32.5, 57)],
  airHurtboxes: [box(-22, 4, 43, 40), box(-11, 44, 29, 42.5)],
  moves: {
    ...NAYO_STRINGS,
    // → + H: up on his toes, the rear fist over the guard onto the head. An overhead, slow (19
    // ticks) and telegraphed: to mix with the sweep.
    forwardHeavy: strike({
      name: 'Overhand',
      frames: [19, 3, 15],
      damage: 70,
      stun: [18, 13],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(12, 36, 28, 36),
      motion: advance(37, { from: 6, to: 14, distancePx: 8 }),
    }),
    // ← + H: a short uppercut, nearly vertical. An anti-air without invincibility, and the
    // launcher: about 60 px up with 4 juggle points (5 on a CONTRE or a PUNITION), cancelled
    // into a special at once or linked into the phrase again once he has recovered. Its box
    // starts above a crouching body (57 px): it whiffs on a crouching opponent.
    backHeavy: strike({
      name: 'Remontant',
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
      name: 'Coup bas',
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
      name: 'Balayage',
      frames: [9, 3, 20],
      damage: 70,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(12, 2, 39, 12),
      // Swept off his legs: a low lift, onto the back.
      knockdown: kd(2, 3.5, { trip: true }),
      crouching: true,
    }),
    jumpLight: strike({
      name: 'Genou sauté',
      frames: [4, 6, 6],
      damage: 30,
      stun: [14, 10],
      hitstop: 8,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(4, 10, 24, 16),
    }),
    jumpHeavy: strike({
      name: 'Coup de pied sauté',
      frames: [7, 5, 10],
      damage: 70,
      stun: [18, 12],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(2, -4, 34, 22),
    }),
    special: strike({
      name: 'Vinyle',
      kind: 'special',
      frames: [12, 1, 28],
      damage: 60,
      stun: [18, 14],
      hitstop: 8,
      pushbackPx: 3,
      guard: 'mid',
      projectile: { speed: px(3.5), spawnX: px(24), hitbox: box(-10, 32, 20, 20) },
    }),
    specialForward: strike({
      name: 'Pied fendu',
      kind: 'special',
      frames: [11, 4, 18],
      damage: 75,
      stun: [0, 12],
      hitstop: 14,
      pushbackPx: 3.5,
      guard: 'mid',
      hitbox: box(8, 24, 36, 16),
      motion: advance(33, { from: 3, to: 15, speed: 2.5 }),
      // A combo's end: it floors.
      knockdown: kd(3, 3.5),
    }),
    specialAntiAir: strike({
      name: 'Uppercut',
      kind: 'special',
      frames: [3, 8, 28],
      damage: 110,
      stun: [0, 12],
      hitstop: 16,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 30, 20, 70),
      invincible: { from: 0, to: 7 },
      knockdown: kd(3, 3),
    }),
    // The grab, then what he does with the opponent he holds (docs/combat-v2.md §4.3). Shorter
    // than any blow; a miss leaves him open for 20 ticks.
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
    // The knee in the belly: two fit in a hold the opponent does not struggle against.
    pummel: throwMove({ name: 'Coup de genou', startup: 6, recovery: 9, damage: 15, hitstop: 6 }),
    // Pushed off and sent away by a straight: lands about 72 px off, Nayo back at his range.
    throwForward: throwMove({
      name: 'Renvoi',
      startup: 10,
      recovery: 25,
      damage: 100,
      hitstop: 10,
      knockdown: kd(3.5, 3.5),
    }),
    // Over the shoulder: the opponent lands about 66 px behind him, in the corner he stood in.
    // The sides switch on tick 6, when the heave takes the collar over his head (the strips
    // throwBack and thrownBack are drawn in step from there).
    throwBack: throwMove({
      name: "Projection d'épaule",
      startup: 14,
      recovery: 27,
      damage: 90,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // A boxer's shuffle: not cancellable, a buffered move comes out on frame 18.
    dashForward: dash({ name: 'Pas chassé', duration: 18, frames: 14, distancePx: 56 }),
    // Grab-proof on frames 0-11 (the answer to the grab), but strikes still hit it.
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
