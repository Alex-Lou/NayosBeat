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
 * Nayo's Boost moves (docs/combos-v3.md §2.2, §2.4), written from his plain specials: the
 * platine Remixes (white, one bar each), the Rewind and the Mégabasse. He mixes: he rewinds his
 * phrase, drops a Remix, or lets the bass go.
 */
export function nayoBoost(plain: PlainSpecials): BoostMoves {
  return {
    // BOOST: the same throw, a white disc with a double ring, twice as fast, that floors:
    // harder to jump.
    specialBoost: remix(plain.special, {
      name: 'Vinyle platine',
      damage: 80,
      hitstun: 0,
      blockstun: 18,
      hitstop: 10,
      projectile: { speed: px(5), spawnX: px(24), hitbox: box(-10, 32, 20, 20) },
      knockdown: kd(2.5, 3),
    }),
    // → + BOOST: the same kick, a white trail; the opponent flies very high instead of falling,
    // with 2 juggle points: let it come down, then L and ↓ + S.
    specialForwardBoost: remix(plain.specialForward, {
      name: 'Pied fendu platine',
      damage: 85,
      knockdown: kd(8, 0, { juggle: 2 }),
    }),
    // ↓ + BOOST: the Uppercut, stronger and invincible longer (f0-10), a higher white column.
    // The wake-up that does not forgive, still punished if blocked (−23).
    specialAntiAirBoost: remix(plain.specialAntiAir, {
      name: 'Montée platine',
      damage: 130,
      invincible: { from: 0, to: 11 },
      knockdown: kd(3.5, 2),
    }),
    // ← + BOOST, three bars: he presses his headphones (the cue), the game freezes 20 ticks,
    // then he punches the floor three times; the speaker rings drawn in his effects roll from
    // the floor to above a jump (the box), BOOM, BOOM, BOOOOM. Invincible on f0-7: a reversal,
    // −16 once blocked.
    super: superMove(
      strike({
        name: 'Mégabasse',
        kind: 'special',
        frames: [2, 15, 30],
        damage: 80,
        stun: [22, 16],
        hitstop: 10,
        pushbackPx: 1,
        guard: 'mid',
        hitbox: box(4, 0, 56, 90),
        invincible: { from: 0, to: 8 },
        // The body follows the drawing (`npm run measure-boxes -- nayo --moves`): down to the
        // floor with each blow, up to the fist in the sky; the front at the guard's.
        hurtboxes: [
          { frames: { from: 0, to: 1 }, boxes: [box(-27, 0, 40.5, 81)] },
          { frames: { from: 1, to: 2 }, boxes: [box(-27, 0, 40.5, 74)] },
          { frames: { from: 2, to: 5 }, boxes: [box(-24, 0, 37.5, 52)] },
          { frames: { from: 5, to: 8 }, boxes: [box(-25, 0, 38.5, 54.5)] },
          { frames: { from: 8, to: 11 }, boxes: [box(-24, 0, 37.5, 52)] },
          { frames: { from: 11, to: 14 }, boxes: [box(-25, 0, 38.5, 54.5)] },
          { frames: { from: 14, to: 17 }, boxes: [box(-24, 0, 37.5, 55.5)] },
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
    // DASH after the contact, one bar: he dives head low, the blow cut short into a 24 px step;
    // the opponent it hit stops sliding, and his phrase starts over.
    boostCancel: boostStep({
      name: 'Rewind',
      duration: 12,
      frames: 8,
      distancePx: 24,
      freeCancelFrom: 3,
      flash: { frame: 0, ticks: 6 },
    }),
  };
}
