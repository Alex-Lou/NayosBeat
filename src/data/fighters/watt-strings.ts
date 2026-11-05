import type { FighterMoves } from '../../core/config';
import { px } from '../../core/constants';
import { advance, box, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike } from './shared';

/**
 * Watt's strings (docs/watt.md §6): the same grammar as the others', his weightlifter's words.
 * The Paume, the Crochet court, then the Jeté, the Marteau, the Coup de masse from above, the
 * Ratissage below or the Soulevé that sends up; the Marteau into the Double marteau. Short phrases
 * that end on the floor, near him: « lentement, puis dans les bras ».
 */
export const WATT_STRINGS: Pick<
  FighterMoves,
  | 'standLight'
  | 'backLight'
  | 'jabRepeat'
  | 'chainLight'
  | 'chainLow'
  | 'chainHigh'
  | 'chainLaunch'
  | 'lightFinisher'
  | 'forwardLight'
  | 'standHeavy'
  | 'chainHeavy'
> = {
  // The front clamp opens and pushes, palm flat: his quickest blow (4 ticks), up close (45.5 px).
  standLight: strike({
    name: 'Paume',
    frames: [4, 2, 9],
    damage: 30,
    stun: [13, 10],
    hitstop: 8,
    pushbackPx: 2,
    guard: 'mid',
    hitbox: box(8, 40, 24, 14),
    cancelInto: LIGHT_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' },
      { button: 'light', dirs: ['back'], move: 'jabRepeat' },
      { button: 'light', dirs: ['down'], move: 'crouchLight' },
      { button: 'heavy', dirs: ['forward'], move: 'downForwardHeavy' },
    ],
  }),
  // ← + L: a quick electric backhand snap of the lead clamp (+2 on block), advancing 6 px and
  // opening his strings and launchers.
  backLight: strike({
    name: 'Court-circuit',
    frames: [4, 2, 7],
    damage: 26,
    stun: [14, 9],
    hitstop: 7,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(8, 42, 30, 14),
    motion: advance(13, { from: 0, to: 4, distancePx: 6 }),
    cancelInto: LIGHT_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' },
      { button: 'light', dirs: ['back'], move: 'jabRepeat' },
      { button: 'light', dirs: ['down'], move: 'crouchLight' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, ← + L: the lead clamp snaps back out with a short electric jolt (+2 on block), opening
  // every string.
  jabRepeat: strike({
    name: 'Secousse',
    frames: [3, 2, 7],
    damage: 20,
    stun: [13, 10],
    hitstop: 7,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(8, 40, 26, 14),
    cancelInto: HEAVY_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' },
      { button: 'light', dirs: ['down'], move: 'chainLow' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, L: a short hook of the rear clamp, an 8 px step; then the end of the phrase.
  chainLight: strike({
    name: 'Crochet court',
    frames: [6, 3, 12],
    damage: 38,
    stun: [17, 12],
    hitstop: 8,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(8, 42, 28, 16),
    motion: advance(21, { from: 0, to: 6, distancePx: 8 }),
    cancelInto: HEAVY_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'lightFinisher' },
      { button: 'light', dirs: ['down'], move: 'chainLow' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, L, ↓ + L (or H, ↓ + L): a heavy low boot-and-clamp stomp that keeps the opponent standing
  // so any special, Remix, Rallumage or Plein feu connects off a low mixup.
  chainLow: strike({
    name: 'Prise de terre',
    frames: [8, 3, 13],
    damage: 40,
    stun: [19, 11],
    hitstop: 9,
    pushbackPx: 2,
    guard: 'low',
    hitbox: box(10, 2, 30, 12),
    motion: advance(24, { from: 0, to: 7, distancePx: 10 }),
    cancelInto: HEAVY_CANCELS,
  }),
  // L, L, → + H: the fist over the guard, in the string. On a juggled body it slams it down to
  // bounce back up (the Rebond, once a combo).
  chainHigh: strike({
    name: 'Coup de masse',
    frames: [13, 3, 16],
    damage: 56,
    stun: [19, 12],
    hitstop: 10,
    pushbackPx: 3,
    guard: 'overhead',
    hitbox: box(10, 36, 32, 40),
    motion: advance(32, { from: 0, to: 8, distancePx: 12 }),
    cancelInto: HEAVY_CANCELS,
    extender: 'rebond',
  }),
  // L, L, ← + H: he scoops the opponent up onto his shoulders after a 10 px step. The launcher
  // of the string (4 juggle points); its box starts above a crouching body.
  chainLaunch: strike({
    name: 'Soulevé',
    frames: [8, 4, 18],
    damage: 55,
    stun: [0, 14],
    hitstop: 10,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(4, 58, 30, 46),
    motion: advance(30, { from: 0, to: 6, distancePx: 10 }),
    knockdown: kd(8, 0.5, { juggle: 4 }),
    cancelInto: HEAVY_CANCELS,
  }),
  // L, L, L: both arms push, the way a bar is thrown overhead; it floors.
  lightFinisher: strike({
    name: 'Jeté',
    frames: [9, 3, 18],
    damage: 55,
    stun: [0, 12],
    hitstop: 10,
    pushbackPx: 4,
    guard: 'mid',
    hitbox: box(8, 34, 32, 28),
    motion: advance(30, { from: 0, to: 9, distancePx: 10 }),
    knockdown: kd(3, 4),
  }),
  // → + L: a quick 16 px step (7 ticks startup), then the Paume; chains into Crochet court,
  // Marteau or Coup de masse.
  forwardLight: strike({
    name: 'Pas lourd',
    frames: [7, 3, 10],
    damage: 32,
    stun: [15, 11],
    hitstop: 8,
    pushbackPx: 2,
    guard: 'mid',
    hitbox: box(8, 40, 26, 14),
    motion: advance(20, { from: 0, to: 7, distancePx: 16 }),
    cancelInto: LIGHT_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' },
      { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
    ],
  }),
  // H: the front fist falls from high, at the chest (67.5 px, under Saphir's Chassé). Its
  // CONTRE folds the opponent on the spot: who presses up close gets flattened.
  standHeavy: strike({
    name: 'Marteau',
    frames: [12, 3, 20],
    damage: 85,
    stun: [21, 15],
    hitstop: 13,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(14, 40, 40, 18),
    cancelInto: HEAVY_CANCELS,
    // A heavy hits hard and seldom in a juggle.
    juggleCost: 2,
    counter: { hitstun: 20, pushback: px(0.5) },
    branches: [
      { button: 'light', dirs: ['down'], move: 'chainLow' },
      { button: 'heavy', dirs: ['neutral'], move: 'chainHeavy' },
      { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'backHeavy' },
    ],
  }),
  // H, H: a two-hit piston combination (left upper-smash on f11, twin-clamp shockwave on f13),
  // advancing 14 px and holding the opponent standing so any special, Câble or Plein feu connects.
  chainHeavy: {
    ...strike({
      name: 'Double marteau',
      frames: [11, 4, 19],
      damage: 20,
      stun: [16, 12],
      hitstop: 7,
      pushbackPx: 0.5,
      guard: 'mid',
      hitbox: box(12, 30, 36, 34),
      motion: advance(34, { from: 0, to: 10, distancePx: 14 }),
      cancelInto: HEAVY_CANCELS,
      juggleCost: 1,
    }),
    pulses: [
      {
        frame: 13,
        hit: strike({
          name: 'Double marteau',
          frames: [11, 4, 19],
          damage: 30,
          stun: [20, 14],
          hitstop: 8,
          pushbackPx: 2,
          guard: 'mid',
          hitbox: box(12, 30, 36, 34),
          juggleCost: 1,
        }),
      },
    ],
  },
};
