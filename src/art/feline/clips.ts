import type { Clip, FighterArt, FighterClips, WorldEffect } from '../types';
import type { FelineSheet } from './sheets';

interface FelineClip extends Clip {
  readonly sheet: FelineSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun (§11.4). */
const QUICK = [0, 1, 4];

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: FelineSheet, ticks: readonly number[], loopFrom?: number): FelineClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

// Feline's dimensional portal specials:
// - Lame de portail (special, active frame 3);
// - Rush dimensionnel (specialForward, active frame 4);
// - Portail ascendant (specialAntiAir, active frames 1-2).
const LAME_PORTAIL = play('special', [3, 3, 4, 4, 5, 5, 5, 5]); // 34 ticks (10/4/20), active: frame 3
const RUSH_PORTAIL = play('specialForward', [3, 3, 3, 3, 4, 6, 6, 6]); // 34 ticks (12/4/18), active: frame 4
const PORTAIL_ASCENDANT = play('specialAntiAir', [3, 3, 5, 4, 4, 4, 4, 4, 4, 4]); // 39 ticks (3/8/28), active: frames 1-2

export const FELINE_CLIPS: FighterClips<FelineClip> = {
  idle: play('idle', [7, 6, 6, 7, 7, 6, 6, 7], 0),
  walkForward: play('walkForward', [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1], 0),
  walkBack: play('walkBack', [2, 1, 2, 1, 2, 2, 2, 1, 2, 1, 2, 2], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  preJumpForward: { sheet: 'jump', frames: [0], ticks: [4] },
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [6, 8, 8, 10] },
  jumpForward: play('jumpForward', [3, 4, 4, 4, 4, 5, 4, 4]),
  landing: { sheet: 'jump', frames: [5], ticks: [3] },

  blockStand: { sheet: 'block', frames: [0, 1, 2], ticks: [2, 3, 1], endFrames: 1 },
  blockCrouch: { sheet: 'block', frames: [3, 4, 5], ticks: [2, 3, 1], endFrames: 1 },
  hitHigh: { ...play('hitHigh', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitHighLight: { sheet: 'hitHigh', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitMid: { ...play('hitMid', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitMidLight: { sheet: 'hitMid', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitLow: { ...play('hitLow', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitLowLight: { sheet: 'hitLow', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitCrouch: { ...play('hitCrouch', [3, 4, 1]), endFrames: 1 },
  airHit: play('airHit', [3, 5, 6, 1]),
  trip: play('trip', [2, 2, 2, 7]),
  knockdown: play('knockdown', [3, 3, 4, 20]),
  getup: play('getup', [2, 2, 2, 2, 2]),
  ko: play('ko', [4, 4, 4, 4, 4, 4, 6, 1]),
  koLanding: { sheet: 'ko', frames: [3, 4, 5, 6, 7], ticks: [4, 4, 4, 6, 1] },

  hold: play('hold', [6, 6], 0),
  held: { sheet: 'held', frames: [1, 0], ticks: [4, 4], loopFrom: 0 },
  thrownBack: play('thrownBack', [3, 3, 4, 4]),
  thrownFall: { sheet: 'airHit', frames: [2, 3], ticks: [1, 1] },
  tech: play('tech', [3, 3, 4, 4]),

  standLight: play('standLight', [2, 2, 3, 2, 2, 3]), // active: frame 2
  jabRepeat: play('jabRepeat', [3, 2, 2, 2, 3]), // active: frame 1
  chainLight: play('chainLight', [2, 2, 2, 3, 6, 6]), // active: frame 3
  lightFinisher: play('lightFinisher', [2, 3, 3, 3, 5, 6, 7]), // active: frame 3
  forwardLight: play('forwardLight', [2, 2, 3, 3, 4, 6]), // active: frame 3
  standHeavy: play('standHeavy', [3, 3, 2, 4, 3, 3, 3, 3, 4]), // active: frame 3
  chainHeavy: play('chainHeavy', [3, 3, 2, 3, 6, 6, 5]), // active: frame 3
  forwardHeavy: play('forwardHeavy', [4, 4, 4, 4, 3, 3, 5, 5, 5]), // active: frame 5
  chainHigh: play('chainHigh', [5, 5, 4, 3, 5, 5, 5]), // active: frame 3
  backHeavy: play('backHeavy', [2, 2, 3, 4, 5, 6, 6]), // active: frame 3
  chainLaunch: play('chainLaunch', [2, 3, 2, 4, 5, 6, 6]), // active: frame 3
  crouchLight: play('crouchLight', [2, 2, 2, 2, 3, 3]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [3, 3, 3, 3, 4, 4, 4, 4, 4]), // active: frame 3
  jumpLight: play('jumpLight', [2, 2, 6, 3, 3]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 4, 5, 3, 3, 4]), // active: frame 2
  special: LAME_PORTAIL,
  specialForward: RUSH_PORTAIL,
  specialAntiAir: PORTAIL_ASCENDANT,
  specialBoost: { ...LAME_PORTAIL, sheet: 'specialRemix', fx: 'specialBoost' },
  specialForwardBoost: { ...RUSH_PORTAIL, sheet: 'specialForwardRemix', fx: 'specialForwardBoost' },
  specialAntiAirBoost: {
    ...PORTAIL_ASCENDANT,
    sheet: 'specialAntiAirRemix',
    fx: 'specialAntiAirBoost',
  },
  super: {
    sheet: 'super',
    frames: [0, 1, 2, 3, 2, 3, 4, 5, 6, 7, 8, 9],
    ticks: [1, 1, 3, 3, 3, 3, 3, 6, 7, 7, 5, 5],
  },
  grab: play('grab', [2, 3, 3, 6, 7, 7]), // active: frame 2
  pummel: play('pummel', [3, 3, 1, 9]), // active: frame 2
  throwForward: play('throwForward', [3, 3, 4, 1, 6, 6, 6, 7]), // release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 6, 7, 7, 7]), // release: frame 4
  dashForward: play('dashForward', [1, 3, 3, 3, 3, 3]),
  dashBack: play('dashBack', [1, 4, 4, 4, 4, 5]),
  boostCancel: { sheet: 'dashForward', frames: [0, 1, 2, 3, 5], ticks: [1, 3, 2, 3, 2] },

  intro: play('intro', [10, 8, 8, 8, 10, 8, 8, 10, 10, 10]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};

/**
 * The Rush's portals, fixed in the world (art-src/feline/portal.png: opening 0-2, swirl 3-6,
 * closing 7-9). The entry opens at her hands as the move starts and closes once she is in (she is
 * unseen from tick 9, jumping); the exit opens 50 px ahead, where she lands 42 px on (its centre
 * at her chest), as she bursts out on tick 12, and swirls through her blow.
 */
const ENTRY: WorldEffect = {
  frame: 0,
  reach: 21,
  clip: {
    sheet: 'portal',
    frames: [0, 1, 2, 3, 4, 5, 7, 8, 9],
    ticks: [1, 1, 1, 2, 2, 2, 2, 2, 2],
  },
};
const EXIT: WorldEffect = {
  frame: 8,
  reach: 50,
  clip: {
    sheet: 'portal',
    frames: [0, 1, 2, 3, 4, 5, 6, 3, 4, 5, 6, 7, 8, 9],
    ticks: [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  },
};

export const FELINE_WORLD_FX: NonNullable<FighterArt['worldFx']> = {
  specialForward: [ENTRY, EXIT],
  specialForwardBoost: [ENTRY, EXIT],
};
