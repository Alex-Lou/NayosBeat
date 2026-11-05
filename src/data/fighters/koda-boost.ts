import {
  boostStep,
  kd,
  remix,
  strike,
  superMove,
  type BoostMoves,
  type PlainSpecials,
} from './shared';
import { box } from './shared';

/**
 * Koda's Boost moves, written from his plain specials: the platine Remixes (white, one bar each),
 * the Tempo (his 11-tick Rewind) and the Octave (his three-bar super).
 * - Diapason platine buys super-armor on startup (f2-9) and a knockdown;
 * - Fente platine buys mid-lunge invincibility (f3-12) and a high juggle launch;
 * - Cymbale platine buys full wake-up reversal invincibility (f0-10 against all).
 */
export function kodaBoost(plain: PlainSpecials): BoostMoves {
  return {
    // BOOST: the silver-bracer clash absorbs one blow on f2-9 and sends the opponent flying.
    specialBoost: remix(plain.special, {
      name: 'Diapason platine',
      damage: 95,
      hitstun: 0,
      blockstun: 18,
      hitstop: 13,
      armor: { from: 2, to: 10 },
      knockdown: kd(3.5, 3.5),
    }),
    // → + BOOST: the spear-palm lunge goes through projectiles on f3-12 and launches for a juggle.
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Fente platine',
      damage: 90,
      invincible: { from: 3, to: 13 },
      knockdown: kd(8, 0, { juggle: 2 }),
    }),
    // ↓ + BOOST: his only meter-bought wake-up reversal outside the super, invincible on f0-10.
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Cymbale platine',
      damage: 125,
      invincible: { from: 0, to: 11 },
      knockdown: kd(3.5, 2),
    }),
    super: superMove(
      strike({
        name: 'Octave',
        kind: 'special',
        frames: [2, 15, 30],
        damage: 80,
        stun: [22, 16],
        hitstop: 10,
        pushbackPx: 1,
        guard: 'mid',
        hitbox: box(4, 0, 56, 90),
        invincible: { from: 0, to: 8 },
        hurtboxes: [
          { frames: { from: 0, to: 1 }, boxes: [box(-27, 0, 40.5, 81)] },
          { frames: { from: 1, to: 2 }, boxes: [box(-27, 0, 40.5, 74)] },
          { frames: { from: 2, to: 5 }, boxes: [box(-24, 0, 37.5, 52)] },
          { frames: { from: 5, to: 8 }, boxes: [box(-25, 0, 38.5, 54.5)] },
          { frames: { from: 8, to: 11 }, boxes: [box(-24, 0, 37.5, 52)] },
          { frames: { from: 11, to: 14 }, boxes: [box(-25, 0, 38.5, 54.5)] },
          { frames: { from: 14, to: 17 }, boxes: [box(-24, 0, 37.5, 49.5)] },
          { frames: { from: 17, to: 23 }, boxes: [box(-26, 0, 39.5, 69)] },
          { frames: { from: 23, to: 30 }, boxes: [box(-27, 0, 40.5, 89)] },
          { frames: { from: 30, to: 37 }, boxes: [box(-27, 0, 40.5, 80)] },
        ],
      }),
      [
        { frame: 8, damage: 80, stun: [22, 16], hitstop: 10, pushbackPx: 1 },
        { frame: 14, damage: 140, stun: [0, 16], hitstop: 22, pushbackPx: 3, knockdown: kd(6, 2) },
      ],
      { frame: 0, ticks: 20 },
    ),
    boostCancel: boostStep({
      name: 'Tempo',
      duration: 11,
      frames: 8,
      distancePx: 24,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
