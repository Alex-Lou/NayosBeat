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
  idle: play('idle', [6, 6, 6, 6, 6, 6, 6, 6, 6, 6], 0),
  walkForward: play('walkForward', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  walkBack: play('walkBack', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [7, 9, 10, 12] },
  jumpForward: play('jumpForward', [4, 5, 5, 5, 5, 5, 5, 4]),
  landing: { sheet: 'jump', frames: [5], ticks: [3] },

  // Impact first, then the guard or the reaction is held as long as the stun lasts.
  blockStand: { sheet: 'block', frames: [0, 1, 2], ticks: [2, 3, 1] },
  blockCrouch: { sheet: 'block', frames: [3, 4, 5], ticks: [2, 3, 1] },
  hitStand: { sheet: 'hit', frames: [0, 1, 2, 3], ticks: [3, 4, 4, 1] },
  hitCrouch: { sheet: 'hit', frames: [4, 5, 6], ticks: [3, 4, 1] },
  airHit: play('airHit', [3, 5, 6, 1]),
  // From the landing to standing up: 40 ticks, the knockdown time.
  knockdown: play('knockdown', [3, 3, 4, 10, 4, 4, 4, 4, 4]),
  ko: play('ko', [4, 4, 4, 4, 4, 4, 6, 1]),

  standLight: play('standLight', [2, 2, 3, 2, 2, 3]), // active: frame 2
  standHeavy: play('standHeavy', [3, 3, 2, 4, 3, 3, 3, 3, 4]), // active: frame 3
  crouchLight: play('crouchLight', [2, 2, 2, 2, 3, 3]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [3, 3, 3, 3, 4, 4, 4, 4, 4]), // active: frame 3
  jumpLight: play('jumpLight', [2, 2, 6, 3, 3]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 4, 5, 3, 3, 4]), // active: frame 2
  special: play('special', [3, 3, 3, 3, 8, 6, 5, 5, 5]), // the wave leaves on frame 4
  specialForward: play('specialForward', [3, 3, 3, 2, 4, 4, 5, 5, 4]), // active: frame 4
  specialAntiAir: play('specialAntiAir', [3, 3, 5, 4, 4, 4, 4, 4, 4, 4]), // active: frames 1-2
  throw: play('throw', [3, 2, 4, 4, 5, 5, 4]), // grab: frame 1

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [10, 8, 8, 8, 10, 8, 8, 10, 10, 10]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};

/** The sound wave in flight, looping on the match clock. */
export const NAYO_PROJECTILE: NayoClip = play('projectile', [2, 2, 2, 2, 2, 2], 0);
