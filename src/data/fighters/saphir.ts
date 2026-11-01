import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import type { FrameRange, RootMotion } from '../../core/move-data';
import { GRAB_HITSTOP } from '../../core/rules';
import { advance, box, dash, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike, throwMove } from './shared';
import { saphirBoost } from './saphir-boost';
import { SAPHIR_STRINGS } from './saphir-strings';

/**
 * A move that steps in, then back out (the Syncope): `there` forward, then `home` backward, each
 * spread as evenly as whole sub-pixels allow (`advance`).
 */
function inAndOut(
  frames: number,
  there: FrameRange & { readonly distancePx: number },
  home: FrameRange & { readonly distancePx: number },
): RootMotion {
  const forward = advance(frames, there).dx;
  const back = advance(frames, home).dx;
  return { dx: forward.map((step, frame) => step - (back[frame] ?? 0)) };
}

/**
 * Saphir, the counter-fighter at mid-range, « un pas, une touche, dehors » (docs/saphir.md): a
 * former record dealer who fights in savate. The longest reach without moving and the best walk
 * back of the cast, a Syncope that strikes and steps out again; no reversal, no projectile, and
 * slow up close (5 ticks). Her Boost moves are written from her plain specials (`SAPHIR`,
 * below). Hurtboxes are provisional until her drawing measures them (docs/combat-v2.md §9.2).
 */
const SAPHIR_PLAIN: FighterTemplate = {
  name: 'Saphir',
  maxHealth: 950,
  // She walks back as fast as forward: her way out of the contact.
  walkForwardSpeed: px(1.6),
  walkBackSpeed: px(1.6),
  // 29 ticks above the ground, 70.8 px high, 66 px forward.
  jumpVelocity: px(10),
  gravity: px(0.66),
  jumpForwardSpeed: px(2.2),
  jumpBackSpeed: px(2),
  preJumpFrames: 4,
  landingFrames: 3,
  knockdownFrames: 40,
  standingPushbox: { width: px(26), height: px(76) },
  crouchingPushbox: { width: px(30), height: px(48) },
  airPushbox: { width: px(22), height: px(42), lift: px(28) },
  lyingPushbox: { width: px(26), height: px(20) },
  // Provisional: the guard of the silhouette sheet (82 px, the hat on top), until
  // `npm run measure-boxes -- saphir` measures her drawing.
  standingHurtboxes: [box(-20, 0, 34, 81)],
  crouchingHurtboxes: [box(-18, 0, 32, 56)],
  airHurtboxes: [box(-20, 4, 40, 40), box(-12, 44, 28, 38)],
  moves: {
    ...SAPHIR_STRINGS,
    // → + H: the foot rises, then plunges over the guard onto the head. An overhead, 18 ticks.
    forwardHeavy: strike({
      name: 'Fouetté plongeant',
      frames: [18, 3, 15],
      damage: 65,
      stun: [18, 13],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(12, 36, 32, 34),
      motion: advance(36, { from: 6, to: 14, distancePx: 10 }),
    }),
    // ← + H: a front kick straight to the sky. An anti-air without invincibility, and the
    // launcher (4 juggle points); its box starts above a crouching body: it whiffs on it.
    backHeavy: strike({
      name: 'Chandelle',
      frames: [7, 4, 17],
      damage: 60,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 58, 28, 46),
      knockdown: kd(8, 0.5, { juggle: 4 }),
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Coup de pied bas',
      frames: [5, 2, 9],
      damage: 24,
      stun: [12, 8],
      hitstop: 7,
      pushbackPx: 2.5,
      guard: 'low',
      hitbox: box(10, 2, 30, 12),
      cancelInto: LIGHT_CANCELS,
      crouching: true,
    }),
    // A low hook at the ankles, a hand on the floor: it sweeps.
    crouchHeavy: strike({
      name: 'Fauche',
      frames: [9, 3, 20],
      damage: 70,
      stun: [0, 14],
      hitstop: 12,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(12, 2, 40, 12),
      knockdown: kd(2, 3.5, { trip: true }),
      crouching: true,
    }),
    jumpLight: strike({
      name: 'Pointe sautée',
      frames: [4, 6, 6],
      damage: 28,
      stun: [14, 10],
      hitstop: 7,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(4, 8, 28, 16),
    }),
    jumpHeavy: strike({
      name: 'Chassé sauté',
      frames: [7, 5, 10],
      damage: 68,
      stun: [18, 12],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(4, -2, 36, 20),
    }),
    // Her signature: a swing step in on the long beat (28 px), a fouetté that cracks on the short
    // one, and she steps back out (28 px) while she recovers. It touches from 99.5 px, and she is
    // out of reach before the answer: −10 once blocked on contact, much less from its tip.
    special: strike({
      name: 'Syncope',
      kind: 'special',
      frames: [12, 3, 22],
      damage: 70,
      stun: [24, 14],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(14, 34, 44, 14),
      motion: inAndOut(
        37,
        { from: 2, to: 10, distancePx: 28 },
        { from: 16, to: 30, distancePx: 28 },
      ),
    }),
    // → + S: she holds her weight back, then lunges 36 px and whips, late on purpose. The
    // farthest punish of the cast (103.5 px); a projectile catches her on her way in.
    specialForward: strike({
      name: 'Rubato',
      kind: 'special',
      frames: [16, 4, 18],
      damage: 80,
      stun: [0, 12],
      hitstop: 13,
      pushbackPx: 3.5,
      guard: 'mid',
      hitbox: box(12, 36, 42, 16),
      motion: advance(38, { from: 4, to: 16, distancePx: 36 }),
      knockdown: kd(3, 3),
    }),
    // ↓ + S: she leaps, the leg straight to the sky. The anti-air, without invincibility.
    specialAntiAir: strike({
      name: 'Contre-ut',
      kind: 'special',
      frames: [5, 6, 24],
      damage: 90,
      stun: [0, 12],
      hitstop: 14,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(2, 36, 26, 70),
      knockdown: kd(3, 3),
    }),
    // The grab, then what she does with the opponent she holds (docs/combat-v2.md §4.3).
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
      hitbox: box(6, 20, 24, 38),
    },
    pummel: throwMove({ name: 'Paume', startup: 5, recovery: 8, damage: 10, hitstop: 5 }),
    // A foot behind the ankle, a push: the opponent falls close by.
    throwForward: throwMove({
      name: 'Croc-en-jambe',
      startup: 10,
      recovery: 22,
      damage: 80,
      hitstop: 10,
      knockdown: kd(3, 2.5),
    }),
    // A waltz turn by the arm, then over her shoulder: a standing throw, on the victims' own
    // strips. The sides switch on tick 6, like Nayo's and Riff's.
    throwBack: throwMove({
      name: 'Valse',
      startup: 14,
      recovery: 26,
      damage: 85,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // The savate's lunge, 48 px.
    dashForward: dash({ name: 'Fente', duration: 18, frames: 13, distancePx: 48 }),
    // The longest backdash of the cast (52 px), grab-proof on frames 0-10.
    dashBack: dash({
      name: 'Esquive',
      duration: 18,
      frames: 14,
      distancePx: 52,
      back: true,
      throwInvincible: { from: 0, to: 11 },
    }),
  },
};

/** Saphir with her Boost moves (docs/saphir.md §6): the Remixes « forte », Reprise, Coda. */
export const SAPHIR: FighterTemplate = {
  ...SAPHIR_PLAIN,
  moves: { ...SAPHIR_PLAIN.moves, ...saphirBoost(SAPHIR_PLAIN.moves) },
};
