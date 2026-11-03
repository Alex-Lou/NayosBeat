import { BOOST_BAR } from '../../core/rules';
import {
  boostStep,
  box,
  kd,
  remix,
  strike,
  superMove,
  type BoostMoves,
  type PlainSpecials,
} from './shared';

/**
 * Watt's Boost moves (docs/watt.md §7), written from his plain specials: the Remixes
 * « survolté », the Rallumage (his Rewind) and Plein feu, his only reversal: three bars, and
 * everyone sees them coming on his bulb.
 */
export function wattBoost(plain: PlainSpecials): BoostMoves {
  return {
    // BOOST: the Coup de jus, safe once blocked (−2): the pressure goes on.
    specialBoost: remix(plain.special, {
      name: 'Coup de jus survolté',
      damage: 110,
      blockstun: 22,
      knockdown: kd(4, 4),
    }),
    // → + BOOST: the rush, invincible on f4-17: it goes through the Vinyle on its whole way.
    // Hittable on f0-3: not a reversal.
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Surcharge survoltée',
      damage: 100,
      invincible: { from: 4, to: 18 },
    }),
    // ↓ + BOOST: the catch from above stays a blow (the plain one is now a grab,
    // docs/watt-arsenal.md §4.4), the same timing (D18), invincible to attacks from the air on
    // f0-12, and it launches (2 points).
    specialAntiAirBoost: {
      ...strike({
        name: 'Plafonnier survolté',
        kind: 'special',
        frames: [6, 6, 26],
        damage: 115,
        stun: [0, 12],
        hitstop: 14,
        pushbackPx: 3,
        guard: 'mid',
        hitbox: box(-4, 50, 28, 40),
        invincible: { from: 0, to: 12, against: 'air' },
        knockdown: kd(6, 1, { juggle: 2 }),
      }),
      tier: 2,
      boostCost: BOOST_BAR,
    },
    // ← + BOOST, three bars: a left hook, a right hook, then both fists down to the floor. A
    // reversal, invincible from f0 against everything, short (every blow finds its victim up to
    // 58 px); he never steps, so every blow lands where the first one did (docs/watt.md §7).
    super: superMove(
      strike({
        name: 'Plein feu',
        kind: 'special',
        frames: [3, 16, 30],
        damage: 70,
        stun: [22, 16],
        hitstop: 10,
        pushbackPx: 1,
        guard: 'mid',
        hitbox: box(4, 0, 46, 92),
        invincible: { from: 0, to: 9 },
      }),
      [
        { frame: 9, damage: 80, stun: [22, 16], hitstop: 10, pushbackPx: 1 },
        { frame: 16, damage: 140, stun: [0, 16], hitstop: 22, pushbackPx: 3, knockdown: kd(6, 2) },
      ],
      { frame: 1, ticks: 20 },
    ),
    // DASH after the contact, one bar: a heavy step, 24 px in 14 ticks, cancelled from f4.
    boostCancel: boostStep({
      name: 'Rallumage',
      duration: 14,
      frames: 10,
      distancePx: 24,
      freeCancelFrom: 4,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
