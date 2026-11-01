import type { FighterMoves } from '../../core/config';
import { advance, box, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike } from './shared';

/**
 * Saphir's strings (docs/saphir.md §5): the same grammar as Nayo's and Riff's, her savate kicks.
 * The Pointe, the Fouetté, then the Revers tournant, the Chassé, the Plongé from above, the Fauche
 * below or the Chandelle glissée that sends up; the Chassé into the Chassé arrière. Few blows,
 * from far: « un pas, une touche, dehors ».
 */
export const SAPHIR_STRINGS: Pick<
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
  // A quick toe kick from the front foot: her quickest blow (5 ticks), from 54.5 px.
  standLight: strike({
    name: 'Pointe',
    frames: [5, 2, 9],
    damage: 28,
    stun: [14, 10],
    hitstop: 7,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 44, 31, 12),
    cancelInto: LIGHT_CANCELS,
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  // L, L: the rear leg whips round with a 10 px step; then the end of the phrase.
  chainLight: strike({
    name: 'Fouetté',
    frames: [6, 3, 12],
    damage: 35,
    stun: [17, 12],
    hitstop: 8,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(10, 46, 34, 14),
    motion: advance(21, { from: 0, to: 6, distancePx: 10 }),
    cancelInto: HEAVY_CANCELS,
    branches: [
      { button: 'light', move: 'lightFinisher' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, L, → + H: the plunging kick in the string, over the guard. On a juggled body it slams it
  // down to bounce back up (the Rebond, once a combo).
  chainHigh: strike({
    name: 'Plongé',
    frames: [13, 3, 15],
    damage: 55,
    stun: [18, 11],
    hitstop: 10,
    pushbackPx: 3,
    guard: 'overhead',
    hitbox: box(12, 36, 30, 34),
    motion: advance(31, { from: 0, to: 8, distancePx: 12 }),
    cancelInto: HEAVY_CANCELS,
    extender: 'rebond',
  }),
  // L, L, ← + H: the Chandelle after a 12 px step, so it still reaches after the Fouetté.
  chainLaunch: strike({
    name: 'Chandelle glissée',
    frames: [7, 4, 17],
    damage: 55,
    stun: [0, 14],
    hitstop: 10,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(4, 58, 28, 46),
    motion: advance(28, { from: 0, to: 6, distancePx: 12 }),
    knockdown: kd(8, 0.5, { juggle: 4 }),
    cancelInto: HEAVY_CANCELS,
  }),
  // L, L, L: she turns on her standing leg, the heel sweeps at the ribs and floors.
  lightFinisher: strike({
    name: 'Revers tournant',
    frames: [8, 3, 18],
    damage: 50,
    stun: [0, 12],
    hitstop: 10,
    pushbackPx: 4,
    guard: 'mid',
    hitbox: box(8, 36, 36, 24),
    motion: advance(29, { from: 0, to: 8, distancePx: 12 }),
    knockdown: kd(3, 4),
  }),
  // → + L: a 16 px glide, then a toe kick; even on block.
  forwardLight: strike({
    name: 'Pas glissé',
    frames: [8, 2, 10],
    damage: 30,
    stun: [15, 11],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 44, 30, 12),
    motion: advance(20, { from: 0, to: 8, distancePx: 16 }),
    cancelInto: HEAVY_CANCELS,
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  // H: the side thrust kick, sole first, leg straight at the hip. The longest reach of the cast
  // without moving (71.5 px): she wins the exchanges of feet.
  standHeavy: strike({
    name: 'Chassé',
    frames: [10, 3, 16],
    damage: 75,
    stun: [20, 14],
    hitstop: 12,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(14, 34, 44, 14),
    cancelInto: HEAVY_CANCELS,
    // A heavy hits hard and seldom in a juggle.
    juggleCost: 2,
    branches: [
      { button: 'heavy', dirs: ['neutral', 'forward'], move: 'chainHeavy' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'backHeavy' },
    ],
  }),
  // H, H: she pivots and pushes with the rear heel, 12 px forward.
  chainHeavy: strike({
    name: 'Chassé arrière',
    frames: [9, 3, 17],
    damage: 55,
    stun: [19, 13],
    hitstop: 10,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(12, 36, 40, 14),
    motion: advance(29, { from: 0, to: 8, distancePx: 12 }),
    cancelInto: HEAVY_CANCELS,
  }),
};
