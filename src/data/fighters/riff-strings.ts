import type { FighterMoves } from '../../core/config';
import { advance, box, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike } from './shared';

/**
 * Riff's strings (docs/combos-v3.md §4): the same grammar as Nayo's, her own blows, quicker and
 * lighter. The Jab, the Revers, then the Swipe, the Coude, the Hache from above, the Windmill
 * below or the Retourné sauté that sends up; the Coude into the Coup de boule.
 */
export const RIFF_STRINGS: Pick<
  FighterMoves,
  | 'standLight'
  | 'chainLight'
  | 'chainHigh'
  | 'chainLaunch'
  | 'lightFinisher'
  | 'forwardLight'
  | 'standHeavy'
  | 'chainHeavy'
> = {
  standLight: strike({
    name: 'Jab',
    frames: [3, 2, 6],
    damage: 25,
    stun: [13, 9],
    hitstop: 7,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(9, 42, 24, 12),
    cancelInto: LIGHT_CANCELS,
    // L the Revers, whatever the side held but down: the Coup bas and the Toprock come
    // through `cancelInto`, once a phrase (combos-v3 §4).
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  // L, L, L (§7.2): a spinning backhand, then a circular kick that sweeps the opponent away.
  // Each steps in 10 px and the backhand barely pushes back: the chain holds wherever the
  // jab hit.
  chainLight: strike({
    name: 'Revers',
    frames: [5, 3, 10],
    damage: 30,
    stun: [16, 11],
    hitstop: 8,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(8, 44, 30, 14),
    motion: advance(18, { from: 0, to: 5, distancePx: 10 }),
    cancelInto: HEAVY_CANCELS,
    branches: [
      { button: 'light', move: 'lightFinisher' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, L, → + H: the Talon from its raised leg, an overhead in the string.
  chainHigh: strike({
    name: 'Hache',
    frames: [12, 3, 14],
    damage: 50,
    stun: [17, 11],
    hitstop: 10,
    pushbackPx: 2.5,
    guard: 'overhead',
    hitbox: box(8, 34, 26, 36),
    motion: advance(29, { from: 0, to: 8, distancePx: 12 }),
    cancelInto: HEAVY_CANCELS,
  }),
  // L, L, ← + H: the Retourné out of a 14 px call hop, so it still reaches after the Revers.
  // The game carries her only while the hop shows (ticks 0-1, both boots in the air): she lands
  // where the Retourné takes off, and no planted foot slides.
  chainLaunch: strike({
    name: 'Retourné sauté',
    frames: [6, 5, 15],
    damage: 50,
    stun: [0, 13],
    hitstop: 10,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(-12, 58, 34, 42),
    hurtboxes: [{ frames: { from: 6, to: 11 }, boxes: [box(-15, 16, 30, 80)] }],
    motion: advance(26, { from: 0, to: 2, distancePx: 14 }),
    knockdown: kd(8, 0.5, { juggle: 4 }),
    cancelInto: HEAVY_CANCELS,
  }),
  lightFinisher: strike({
    name: 'Swipe',
    frames: [7, 3, 18],
    damage: 45,
    stun: [0, 11],
    hitstop: 10,
    pushbackPx: 4,
    guard: 'mid',
    hitbox: box(8, 30, 34, 26),
    motion: advance(28, { from: 0, to: 7, distancePx: 10 }),
    knockdown: kd(2.5, 4),
    // On a juggled body, the circular kick spins it up and away instead (the Vrille, once a
    // combo): she chases it and picks the phrase up again (combos-v3 §1.5).
    extender: 'vrille',
  }),
  // → + L: a dance step forward (20 px), then a jab. +1 on block and cancellable into a
  // normal: her pressure and her traps.
  forwardLight: strike({
    name: 'Toprock',
    frames: [8, 2, 10],
    damage: 30,
    stun: [15, 12],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(8, 44, 24, 14),
    motion: advance(20, { from: 0, to: 8, distancePx: 20 }),
    cancelInto: LIGHT_CANCELS,
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  standHeavy: strike({
    name: 'Coup de coude',
    frames: [6, 3, 14],
    damage: 70,
    stun: [19, 13],
    hitstop: 11,
    // A short push: the Genou montant (28 px of reach) still catches what it hit (§7.8).
    pushbackPx: 2,
    guard: 'mid',
    hitbox: box(9, 40, 34, 18),
    cancelInto: HEAVY_CANCELS,
    // A heavy hits hard and seldom in a juggle.
    juggleCost: 2,
    branches: [
      { button: 'heavy', dirs: ['neutral', 'forward'], move: 'chainHeavy' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'backHeavy' },
    ],
  }),
  // H, H: the street punk's headbutt, the fringe whipping forward.
  chainHeavy: strike({
    name: 'Coup de boule',
    frames: [6, 2, 14],
    damage: 50,
    stun: [18, 12],
    hitstop: 10,
    pushbackPx: 2,
    guard: 'mid',
    hitbox: box(8, 50, 26, 16),
    motion: advance(22, { from: 0, to: 6, distancePx: 12 }),
    cancelInto: HEAVY_CANCELS,
  }),
};
