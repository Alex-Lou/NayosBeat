import { px } from '../../core/constants';
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
 * Koda's Boost moves, written from his plain specials: the platine Remixes (white, one bar each),
 * the Tempo (his Rewind) and the Octave (his three-bar super).
 */
export function kodaBoost(plain: PlainSpecials): BoostMoves {
  return {
    specialBoost: remix(plain.special, {
      name: 'Diapason platine',
      damage: 80,
      hitstun: 0,
      blockstun: 18,
      hitstop: 10,
      projectile: { speed: px(5), spawnX: px(24), hitbox: box(-10, 32, 20, 20) },
      knockdown: kd(2.5, 3),
    }),
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Fente platine',
      damage: 85,
      knockdown: kd(8, 0, { juggle: 2 }),
    }),
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Cymbale platine',
      damage: 130,
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
      duration: 12,
      frames: 8,
      distancePx: 24,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
