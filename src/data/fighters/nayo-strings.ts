import type { FighterMoves } from '../../core/config';
import { px } from '../../core/constants';
import { advance, box, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike } from './shared';

/**
 * Nayo's strings (docs/combos-v3.md §2.3, §2.4): the normals a button and a direction chain one
 * into the next once they have hit or been blocked. The beat, a Direct and a Cross, then the
 * bass on the third: the Crochet, the Marteau from above, the Balayage below, the Remontant
 * chassé that sends up. L in any direction after the Cross floors: a beginner mashing L always
 * ends on the ground.
 */
export const NAYO_STRINGS: Pick<
  FighterMoves,
  | 'standLight'
  | 'jabRepeat'
  | 'chainLight'
  | 'lightFinisher'
  | 'forwardLight'
  | 'chainHigh'
  | 'chainLaunch'
  | 'standHeavy'
  | 'chainHeavy'
> = {
  standLight: strike({
    name: 'Direct',
    frames: [4, 3, 7],
    damage: 30,
    stun: [14, 10],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 46, 30, 12),
    cancelInto: LIGHT_CANCELS,
    // L, L the Cross, back + L the Double direct, down + L the Coup bas (combos-v3 §2.4).
    branches: [
      { button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' },
      { button: 'light', dirs: ['back'], move: 'jabRepeat' },
      { button: 'light', dirs: ['down'], move: 'crouchLight' },
    ],
  }),
  // L, ← + L: the glove snaps out again from halfway back, the flicker. +2 on block, the most
  // a normal may leave (combos-v3 §1.12, rule 8); then L, whatever the direction, the Cross.
  jabRepeat: strike({
    name: 'Double direct',
    frames: [3, 2, 7],
    damage: 20,
    stun: [13, 10],
    hitstop: 7,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(10, 46, 30, 12),
    cancelInto: HEAVY_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' },
      { button: 'light', dirs: ['down'], move: 'crouchLight' },
      { button: 'heavy', dirs: ['neutral', 'forward'], move: 'standHeavy' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // L, L, L (§7.2): the boxer's "two", then a hook that floors. Each steps in (10, then 12 px)
  // and the cross barely pushes back, so the chain holds wherever the jab hit. After the Cross
  // the third beat is the bass: L in any direction still floors (the beginner's guard rail).
  chainLight: strike({
    name: 'Cross',
    frames: [6, 3, 12],
    damage: 40,
    stun: [18, 12],
    hitstop: 9,
    pushbackPx: 1.5,
    guard: 'mid',
    hitbox: box(10, 46, 36, 14),
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
  // The finishers freeze longer than the blows before them: the combo ends on a beat.
  lightFinisher: strike({
    name: 'Mise au tapis',
    frames: [8, 3, 18],
    damage: 50,
    stun: [0, 12],
    hitstop: 14,
    pushbackPx: 4,
    guard: 'mid',
    hitbox: box(10, 44, 38, 18),
    motion: advance(29, { from: 0, to: 8, distancePx: 12 }),
    knockdown: kd(3, 4),
  }),
  // → + L: a sliding step and a sharp jab, guard up (−1 on block): starts a combo from afar.
  forwardLight: strike({
    name: 'Jab chassé',
    frames: [7, 3, 10],
    damage: 35,
    stun: [15, 11],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 46, 32, 12),
    motion: advance(20, { from: 0, to: 7, distancePx: 14 }),
    cancelInto: HEAVY_CANCELS,
    // Once a phrase: a cancel enters it once (the phrase), so it no longer loops.
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  // L, L, → + H: the Overhand from its loaded fist, dropping on the head (an overhead in the
  // string, 2 ticks of gap after a Cross blocked: a reversal goes through). On a juggled body,
  // the Rebond: slammed onto the floor, it bounces back up, once a combo.
  chainHigh: strike({
    name: 'Marteau',
    frames: [14, 3, 15],
    damage: 60,
    stun: [19, 11],
    hitstop: 12,
    pushbackPx: 3,
    guard: 'overhead',
    hitbox: box(12, 36, 28, 36),
    motion: advance(32, { from: 0, to: 10, distancePx: 16 }),
    cancelInto: HEAVY_CANCELS,
    extender: 'rebond',
  }),
  // L, L, ← + H (or H, ← + H; L, ← + L, ← + H): the Remontant out of a call step, 12 px in, so
  // it still reaches what the Cross or the Crochet pushed away.
  chainLaunch: strike({
    name: 'Remontant chassé',
    frames: [7, 4, 17],
    damage: 60,
    stun: [0, 14],
    hitstop: 11,
    pushbackPx: 3,
    guard: 'mid',
    hitbox: box(4, 58, 26, 46),
    motion: advance(28, { from: 0, to: 7, distancePx: 12 }),
    knockdown: kd(8, 0.5, { juggle: 4 }),
    cancelInto: HEAVY_CANCELS,
  }),
  standHeavy: strike({
    name: 'Crochet',
    frames: [8, 4, 16],
    damage: 80,
    stun: [20, 14],
    hitstop: 12,
    pushbackPx: 3.5,
    guard: 'mid',
    hitbox: box(10, 44, 42, 18),
    cancelInto: HEAVY_CANCELS,
    // A heavy hits hard and seldom in a juggle. On a CONTRE it folds the opponent on the spot:
    // 36 ticks of hitstun, +17, a link of 18 ticks into the whole phrase.
    juggleCost: 2,
    counter: { hitstun: 16, pushback: px(0.5) },
    branches: [
      { button: 'heavy', dirs: ['neutral', 'forward'], move: 'chainHeavy' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  // H, H: knees bent, the lead fist sunk under the ribs, low enough to hit a crouching body.
  // It cancels into a special only: at +3, no link would loop it. The glide starts on tick 3,
  // with the strip's step (frames 1-2): frame 0 shifts the weight on planted feet, which any
  // carry would skate.
  chainHeavy: strike({
    name: 'Crochet au foie',
    frames: [8, 3, 17],
    damage: 60,
    stun: [22, 12],
    hitstop: 11,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(8, 24, 38, 20),
    motion: advance(28, { from: 3, to: 8, distancePx: 22 }),
    // The body goes down under the standing box (`npm run measure-boxes -- nayo --moves`): the
    // top follows the hair frame by frame, the back the rear foot of the lunge, so a blow over
    // his head passes over it.
    hurtboxes: [
      { frames: { from: 0, to: 3 }, boxes: [box(-27, 0, 40.5, 71)] },
      { frames: { from: 3, to: 6 }, boxes: [box(-30.5, 0, 44, 66.5)] },
      { frames: { from: 6, to: 17 }, boxes: [box(-31, 0, 44.5, 64)] },
      { frames: { from: 17, to: 23 }, boxes: [box(-28.5, 0, 42, 73.5)] },
    ],
    cancelInto: HEAVY_CANCELS,
    juggleCost: 2,
  }),
};
