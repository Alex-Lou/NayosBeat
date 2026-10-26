import type { Clip, ClipId } from '../types';
import type { NayoSheet } from './sheets';

interface NayoClip extends Clip {
  readonly sheet: NayoSheet;
}

/** The same frame for each duration: keeps a move's real timing until its strip is drawn. */
function standIn(ticks: readonly number[]): NayoClip {
  return { sheet: 'idle', frames: ticks.map(() => 0), ticks };
}

/**
 * How Nayo's strips are played. Durations are in ticks (60 per second); for attacks they add
 * up to the move's startup + active + recovery, so the active pose is on screen exactly while
 * the move can hit.
 */
export const NAYO_CLIPS: Readonly<Record<ClipId, NayoClip>> = {
  idle: { sheet: 'idle', frames: [0, 1, 2, 3, 4, 5], ticks: [8, 8, 8, 8, 8, 8], loopFrom: 0 },
  walkForward: {
    sheet: 'walkForward',
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    ticks: [3, 3, 3, 3, 3, 3, 3, 3],
    loopFrom: 0,
  },
  walkBack: {
    sheet: 'walkBack',
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    ticks: [3, 3, 3, 3, 3, 3, 3, 3],
    loopFrom: 0,
  },
  crouch: { sheet: 'crouch', frames: [0, 1, 2, 3], ticks: [2, 2, 12, 12], loopFrom: 2 },
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  jump: { sheet: 'jump', frames: [1, 2, 3], ticks: [13, 12, 13] },
  jumpForward: { sheet: 'jumpForward', frames: [0, 1, 2, 3, 4, 5], ticks: [5, 6, 6, 6, 6, 9] },
  landing: { sheet: 'jump', frames: [4], ticks: [3] },

  // Stand-ins until their strips are drawn (next step).
  blockStand: standIn([4, 1]),
  blockCrouch: standIn([4, 1]),
  hitStand: standIn([4, 6, 1]),
  hitCrouch: standIn([4, 1]),
  airHit: standIn([4, 8, 1]),
  knockdown: standIn([3, 3, 16, 6, 6, 6]),
  ko: standIn([6, 6, 8, 6, 1]),
  standLight: standIn([2, 2, 3, 4, 3]),
  standHeavy: standIn([3, 3, 2, 4, 5, 5, 6]),
  crouchLight: standIn([2, 2, 2, 4, 4]),
  crouchHeavy: standIn([3, 3, 3, 3, 6, 7, 7]),
  jumpLight: standIn([2, 2, 6, 6]),
  jumpHeavy: standIn([3, 4, 5, 5, 5]),
  special: standIn([4, 4, 4, 8, 7, 7, 7]),
  specialForward: standIn([3, 4, 4, 4, 6, 6, 6]),
  specialAntiAir: standIn([3, 3, 5, 7, 7, 7, 7]),
  throw: standIn([3, 2, 6, 8, 8]),
};
