import {
  advance,
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
 * Saphir's Boost moves (docs/saphir.md §6), written from her plain specials: the Remixes
 * « forte », the Reprise (her Rewind) and the Coda. Her gauge buys her a way through the Vinyle
 * (the Rubato forte), never a reversal: "no reversal" stays who she is.
 */
export function saphirBoost(plain: PlainSpecials): BoostMoves {
  return {
    // BOOST: the Syncope that floors (about −6 on contact).
    specialBoost: remix(plain.special, {
      name: 'Syncope forte',
      damage: 85,
      hitstun: 0,
      blockstun: 18,
      knockdown: kd(2.5, 3),
    }),
    // → + BOOST: the Rubato, invincible on f3-12: it goes through a projectile or a poke on its
    // way in. Hittable on f0-2: not a reversal.
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Rubato forte',
      damage: 95,
      invincible: { from: 3, to: 13 },
    }),
    // ↓ + BOOST: the high kick, invincible to attacks from the air on f0-8, that launches (2
    // points).
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Contre-ut forte',
      damage: 115,
      invincible: { from: 0, to: 9, against: 'air' },
      knockdown: kd(5, 1, { juggle: 2 }),
    }),
    // ← + BOOST, three bars: a low kick, a fouetté, then the Revers tournant that floors, the
    // band playing again. A combo's end without invincibility, not a reversal (−23 once
    // blocked). She steps 24 px in on ticks 2-11 and never back: every blow finds its victim up
    // to 86 px (docs/saphir.md §6).
    super: superMove(
      strike({
        name: 'Coda',
        kind: 'special',
        frames: [10, 14, 24],
        damage: 70,
        stun: [22, 14],
        hitstop: 10,
        pushbackPx: 1,
        guard: 'mid',
        hitbox: box(10, 4, 44, 60),
        motion: advance(48, { from: 2, to: 12, distancePx: 24 }),
      }),
      [
        { frame: 16, damage: 80, stun: [22, 14], hitstop: 10, pushbackPx: 1 },
        {
          frame: 22,
          damage: 130,
          stun: [0, 14],
          hitstop: 21,
          pushbackPx: 3,
          knockdown: kd(5, 2.5),
        },
      ],
      { frame: 8, ticks: 20 },
    ),
    // DASH after the contact, one bar: a swing step, 24 px in 12 ticks, cancelled from f3.
    boostCancel: boostStep({
      name: 'Reprise',
      duration: 12,
      frames: 8,
      distancePx: 24,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
