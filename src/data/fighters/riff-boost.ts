import {
  advance,
  boostStep,
  box,
  kd,
  leapArc,
  remix,
  strike,
  superMove,
  type BoostMoves,
  type PlainSpecials,
} from './shared';

/**
 * Riff's Boost moves (docs/combos-v3.md §4), written from her plain specials: the Remixes « à
 * fond », the Pogo (her Rewind) and the Slam. Her gauge buys her, at last, a reversal on the
 * ground for a bar (the Genou à fond): "no free reversal" stays who she is.
 */
export function riffBoost(plain: PlainSpecials): BoostMoves {
  return {
    // BOOST: the slide flat out, harder and longer to block (about −3 on contact).
    specialBoost: remix(plain.special, { name: 'Glissade à fond', damage: 80, blockstun: 20 }),
    // → + BOOST: the spin, an overhead that floors.
    specialForwardBoost: remix(plain.specialForward, {
      name: "Saut de l'ange à fond",
      damage: 80,
      hitstun: 0,
      knockdown: kd(3, 3),
    }),
    // ↓ + BOOST: the knee, invincible to everything on f0-6, that launches (2 points).
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Genou à fond',
      damage: 115,
      invincible: { from: 0, to: 7 },
      knockdown: kd(5, 1, { juggle: 2 }),
    }),
    // ← + BOOST, three bars: she leaps into the crowd and comes down boots first, the game frozen
    // at the top of her dive, a magenta and platine shockwave on the floor. An overhead without
    // invincibility: a combo's end, not a reversal (−15 once blocked). The game lifts her: 40 px
    // high, carried 30 px on ticks 2-11, back on the floor on tick 16, the last blow.
    super: superMove(
      strike({
        name: 'Slam',
        kind: 'special',
        frames: [12, 8, 26],
        damage: 120,
        stun: [24, 14],
        hitstop: 12,
        pushbackPx: 1,
        guard: 'overhead',
        hitbox: box(0, 0, 44, 60),
        motion: {
          ...advance(46, { from: 2, to: 12, distancePx: 30 }),
          y: leapArc(46, { from: 2, to: 16, apexPx: 40 }),
        },
      }),
      [
        {
          frame: 16,
          damage: 170,
          stun: [0, 14],
          hitstop: 22,
          pushbackPx: 3,
          knockdown: kd(5, 2.5),
        },
      ],
      { frame: 10, ticks: 20 },
    ),
    // DASH after the contact, one bar: a hop forward, 24 px in 10 ticks, cancelled from f3.
    boostCancel: boostStep({
      name: 'Pogo',
      duration: 10,
      frames: 6,
      distancePx: 24,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
