import type { Clip, ClipId } from '../types';
import type { NayoSheet } from './sheets';

interface NayoClip extends Clip {
  readonly sheet: NayoSheet;
}

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: NayoSheet, ticks: readonly number[], loopFrom?: number): NayoClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

/**
 * How Nayo's strips are played. Durations are in ticks (60 per second); for attacks they add
 * up to the move's startup + active + recovery, so the active pose is on screen exactly while
 * the move can hit (the move's active frame is marked in each comment).
 */
export const NAYO_CLIPS: Readonly<Record<ClipId, NayoClip>> = {
  idle: play('idle', [8, 8, 8, 8, 8, 8], 0),
  walkForward: play('walkForward', [3, 3, 3, 3, 3, 3, 3, 3], 0),
  walkBack: play('walkBack', [3, 3, 3, 3, 3, 3, 3, 3], 0),
  crouch: play('crouch', [2, 2, 12, 12], 2),
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  jump: { sheet: 'jump', frames: [1, 2, 3], ticks: [13, 12, 13] },
  jumpForward: play('jumpForward', [5, 6, 6, 6, 6, 9]),
  landing: { sheet: 'jump', frames: [4], ticks: [3] },

  // Impact first, then the guard or the reaction is held as long as the stun lasts.
  blockStand: { sheet: 'block', frames: [1, 0], ticks: [4, 1] },
  blockCrouch: { sheet: 'block', frames: [3, 2], ticks: [4, 1] },
  hitStand: { sheet: 'hit', frames: [0, 1, 2], ticks: [4, 6, 1] },
  hitCrouch: { sheet: 'hit', frames: [3, 4], ticks: [5, 1] },
  airHit: play('airHit', [4, 8, 1]),
  // From the landing to standing up: 40 ticks, the knockdown time.
  knockdown: play('knockdown', [3, 3, 16, 6, 6, 6]),
  ko: play('ko', [5, 7, 4, 6, 1]),

  standLight: play('standLight', [2, 2, 3, 4, 3]), // active: frame 2
  standHeavy: play('standHeavy', [3, 3, 2, 4, 5, 5, 6]), // active: frame 3
  crouchLight: play('crouchLight', [2, 2, 2, 4, 4]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [3, 3, 3, 3, 6, 7, 7]), // active: frame 3
  jumpLight: play('jumpLight', [2, 2, 6, 6]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 4, 5, 5, 5]), // active: frame 2
  special: play('special', [4, 4, 4, 8, 7, 7, 7]), // the wave leaves on frame 3
  specialForward: play('specialForward', [3, 4, 4, 4, 6, 6, 6]), // active: frame 3
  specialAntiAir: play('specialAntiAir', [3, 3, 5, 7, 7, 7, 7]), // active: frames 1-2
  throw: play('throw', [3, 2, 6, 8, 8]), // grab: frame 1

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [15, 12, 12, 15, 16, 20]),
  victory: play('victory', [8, 8, 8, 10, 10, 10], 3),
  timeOver: play('timeOver', [20, 20], 0),
};

/** The sound wave in flight, looping on the match clock. */
export const NAYO_PROJECTILE: NayoClip = play('projectile', [3, 3, 3, 3], 0);
