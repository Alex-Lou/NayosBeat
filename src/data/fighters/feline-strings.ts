import type { FighterMoves } from '../../core/config';
import { px } from '../../core/constants';
import { advance, box, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike } from './shared';

/**
 * Feline's strings (issue #155 comment 6660565057: Pack_01 & Pack_02):
 * Agile feline strikes and high kicks — Griffe vive (standLight), Direct felin (chainLight),
 * Fouet lunaire (lightFinisher), Chasse haute (standHeavy), Frappe a genou (chainHeavy),
 * Plongeon astral (chainHigh, Rebond), Elan chasse (chainLaunch).
 */
export const FELINE_STRINGS: Pick<
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
    name: 'Griffe vive',
    frames: [4, 3, 7],
    damage: 30,
    stun: [14, 10],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 46, 30, 12),
    cancelInto: LIGHT_CANCELS,
    branches: [
      { button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' },
      { button: 'light', dirs: ['back'], move: 'jabRepeat' },
      { button: 'light', dirs: ['down'], move: 'crouchLight' },
    ],
  }),
  jabRepeat: strike({
    name: 'Double griffe',
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
  chainLight: strike({
    name: 'Direct felin',
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
  lightFinisher: strike({
    name: 'Fouet lunaire',
    frames: [8, 3, 18],
    damage: 50,
    stun: [0, 12],
    hitstop: 10,
    pushbackPx: 4,
    guard: 'mid',
    hitbox: box(10, 44, 38, 18),
    motion: advance(29, { from: 0, to: 8, distancePx: 12 }),
    knockdown: kd(3, 4),
  }),
  forwardLight: strike({
    name: 'Pas de velours',
    frames: [7, 3, 10],
    damage: 35,
    stun: [15, 11],
    hitstop: 8,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(10, 46, 32, 12),
    motion: advance(20, { from: 0, to: 7, distancePx: 14 }),
    cancelInto: HEAVY_CANCELS,
    branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }],
  }),
  chainHigh: strike({
    name: 'Enclume astrale',
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
  chainLaunch: strike({
    name: 'Elan chasse',
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
    name: 'Chasse haute',
    frames: [8, 4, 16],
    damage: 80,
    stun: [20, 14],
    hitstop: 12,
    pushbackPx: 3.5,
    guard: 'mid',
    hitbox: box(10, 44, 42, 18),
    cancelInto: HEAVY_CANCELS,
    juggleCost: 2,
    counter: { hitstun: 16, pushback: px(0.5) },
    branches: [
      { button: 'heavy', dirs: ['neutral', 'forward'], move: 'chainHeavy' },
      { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
      { button: 'heavy', dirs: ['back'], move: 'chainLaunch' },
    ],
  }),
  chainHeavy: strike({
    name: 'Frappe a genou',
    frames: [8, 3, 17],
    damage: 60,
    stun: [22, 12],
    hitstop: 11,
    pushbackPx: 2.5,
    guard: 'mid',
    hitbox: box(8, 24, 38, 20),
    motion: advance(28, { from: 3, to: 8, distancePx: 22 }),
    hurtboxes: [
      { frames: { from: 0, to: 3 }, boxes: [box(-27, 0, 40.5, 71)] },
      { frames: { from: 3, to: 6 }, boxes: [box(-30.5, 0, 44, 66.5)] },
      { frames: { from: 6, to: 8 }, boxes: [box(-31, 0, 44.5, 65)] },
      { frames: { from: 8, to: 17 }, boxes: [box(-31, 0, 44.5, 63.5)] },
      { frames: { from: 17, to: 23 }, boxes: [box(-28.5, 0, 42, 74)] },
      { frames: { from: 23, to: 28 }, boxes: [box(-27, 0, 40.5, 77)] },
    ],
    cancelInto: HEAVY_CANCELS,
    juggleCost: 2,
  }),
};
