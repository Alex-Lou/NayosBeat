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
 * Feline's Boost moves (issue #155 comment 6660565057: Pack_Feline_Portails_Coups_Speciaux):
 * - Lame astrale (BOOST): twin orbital portal blades that floor the opponent;
 * - Rush astral (→ + BOOST): dimensional portal rush, invincible on f3-12, launching high for a
 *   juggle (`juggle: 2`);
 * - Vortex astral (↓ + BOOST): full wake-up reversal invincibility on f0-10;
 * - Dechirure (← + BOOST, 3 bars): three-portal dimensional rift explosion (`07_Ultime_Dechirure_Dimensionnelle`).
 */
export function felineBoost(plain: PlainSpecials): BoostMoves {
  return {
    specialBoost: remix(plain.special, {
      name: 'Lame astrale',
      damage: 95,
      hitstun: 0,
      blockstun: 18,
      hitstop: 13,
      knockdown: kd(3.5, 3.5),
    }),
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Rush astral',
      damage: 90,
      invincible: { from: 3, to: 13 },
      knockdown: kd(8, 0, { juggle: 2 }),
    }),
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Vortex astral',
      damage: 125,
      invincible: { from: 0, to: 11 },
      knockdown: kd(3.5, 2),
    }),
    super: superMove(
      strike({
        name: 'Dechirure',
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
          { frames: { from: 23, to: 30 }, boxes: [box(-27, 0, 40.5, 87)] },
          { frames: { from: 30, to: 37 }, boxes: [box(-27, 0, 40.5, 80)] },
          { frames: { from: 37, to: 42 }, boxes: [box(-27, 0, 40.5, 78)] },
          { frames: { from: 42, to: 47 }, boxes: [box(-27, 0, 40.5, 79)] },
        ],
      }),
      [
        { frame: 8, damage: 80, stun: [22, 16], hitstop: 10, pushbackPx: 1 },
        { frame: 14, damage: 140, stun: [0, 16], hitstop: 22, pushbackPx: 3, knockdown: kd(6, 2) },
      ],
      { frame: 0, ticks: 20 },
    ),
    boostCancel: boostStep({
      name: 'Eclipse',
      duration: 11,
      frames: 8,
      distancePx: 26,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
