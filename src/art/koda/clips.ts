import type { MoveId } from '../../core/move-data';
import type { Clip, FighterClips } from '../types';
import type { KodaSheet } from './sheets';

interface KodaClip extends Clip {
  readonly sheet: KodaSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun (§11.4). */
const QUICK = [0, 1, 4];

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: KodaSheet, ticks: readonly number[], loopFrom?: number): KodaClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

const DIAPASON = play('special', [3, 3, 3, 3, 8, 6, 5, 5, 5]); // the Diapason wave leaves on frame 4
const FENTE_ACIER = play('specialForward', [3, 3, 3, 2, 4, 4, 5, 5, 4]); // active: frame 4
const CYMBALE = play('specialAntiAir', [3, 3, 5, 4, 4, 4, 4, 4, 4, 4]); // active: frames 1-2

/**
 * How Koda's strips are played. Durations are in ticks (60 per second); for attacks they add up to
 * the move's startup + active + recovery, so the active pose is on screen exactly while the move
 * can hit.
 */
export const KODA_CLIPS: FighterClips<KodaClip> = {
  idle: play('idle', [6, 6, 6, 6, 6, 6, 6, 6, 6, 6], 0),
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
  special: DIAPASON,
  specialForward: FENTE_ACIER,
  specialAntiAir: CYMBALE,
  specialBoost: { ...DIAPASON, sheet: 'specialRemix', fx: 'specialBoost' },
  specialForwardBoost: { ...FENTE_ACIER, sheet: 'specialForwardRemix', fx: 'specialForwardBoost' },
  specialAntiAirBoost: { ...CYMBALE, sheet: 'specialAntiAirRemix', fx: 'specialAntiAirBoost' },
  super: {
    sheet: 'super',
    frames: [0, 1, 2, 3, 2, 3, 4, 5, 6, 7, 8, 9],
    ticks: [1, 1, 3, 3, 3, 3, 3, 6, 7, 7, 5, 5],
  },
  grab: play('grab', [2, 3, 3, 6, 7, 7]), // active: frame 2
  pummel: play('pummel', [3, 3, 1, 9]), // active: frame 2
  throwForward: play('throwForward', [3, 3, 4, 1, 6, 6, 6, 7]), // release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 6, 7, 7, 7]), // release: frame 4
  dashForward: play('dashForward', [1, 4, 4, 3, 3, 3]),
  dashBack: play('dashBack', [1, 4, 4, 4, 4, 5]),
  boostCancel: { sheet: 'dashForward', frames: [0, 1, 2, 3, 5], ticks: [1, 3, 3, 3, 2] },

  intro: play('intro', [10, 8, 8, 8, 10, 8, 8, 10, 10, 10]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};

/**
 * The Diapason resonator disc in flight, looping on the match clock: a turn every 16 ticks; the
 * platine one, white with a double ring, twice as fast.
 */
export const KODA_PROJECTILES: Readonly<Partial<Record<MoveId, KodaClip>>> = {
  special: play('projectile', [2, 2, 2, 2, 2, 2, 2, 2], 0),
  specialBoost: play('projectileBoost', [1, 1, 1, 1, 1, 1, 1, 1], 0),
};
