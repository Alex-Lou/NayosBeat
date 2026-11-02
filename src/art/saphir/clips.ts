import type { Clip, FighterClips } from '../types';
import type { SaphirSheet } from './sheets';

interface SaphirClip extends Clip {
  readonly sheet: SaphirSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun. */
const QUICK = [0, 1, 4];

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: SaphirSheet, ticks: readonly number[], loopFrom?: number): SaphirClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

// The specials, which their Remixes « forte » play too (D18): the same strip at the same timing,
// their effects redrawn in platine under the Remix's name.
// Syncope: the swing step in on frames 1-3, the fouetté on frame 4, the step back out after.
const SYNCOPE = play('special', [3, 3, 3, 3, 3, 6, 8, 8]); // active: frame 4
// Rubato: the weight held back, the lunge, the late whip on frame 4.
const RUBATO = play('specialForward', [4, 4, 4, 4, 4, 4, 4, 5, 5]); // active: frame 4
// Contre-ut: the crouch, the leap, the leg straight up on frames 2-3.
const CONTRE_UT = play('specialAntiAir', [2, 3, 3, 3, 6, 6, 6, 6]); // active: frames 2-3

/**
 * How Saphir's strips are played (docs/saphir.md §4). Durations are in ticks (60 per second);
 * for attacks they add up to the move's startup + active + recovery, so the active pose is on
 * screen exactly while the move can hit (the move's active frame is marked in each comment).
 */
export const SAPHIR_CLIPS: FighterClips<SaphirClip> = {
  // The guard on a slow swing, 48 ticks: the long beat, then the short one.
  idle: play('idle', [8, 4, 8, 4, 8, 4, 8, 4], 0),
  // Two ticks a frame: 32 px a loop, forward or back (1.6 px/tick both ways).
  walkForward: play('walkForward', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  walkBack: play('walkBack', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  preJumpForward: { sheet: 'jumpForward', frames: [0], ticks: [4] },
  // 29 ticks above the ground: the last frame holds until the landing.
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [6, 7, 8, 8] },
  jumpForward: { sheet: 'jumpForward', frames: [1, 2, 3, 4, 5, 6], ticks: [4, 4, 5, 5, 5, 6] },
  landing: { sheet: 'jump', frames: [5], ticks: [3] },

  blockStand: { sheet: 'block', frames: [0, 1, 2], ticks: [2, 3, 1], endFrames: 1 },
  blockCrouch: { sheet: 'block', frames: [3, 4, 5], ticks: [2, 3, 1], endFrames: 1 },
  hitHigh: { ...play('hitHigh', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitHighLight: { sheet: 'hitHigh', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitMid: { ...play('hitMid', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitMidLight: { sheet: 'hitMid', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitLow: { ...play('hitLow', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitLowLight: { sheet: 'hitLow', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitCrouch: { ...play('hitCrouch', [3, 4, 1]), endFrames: 1 },
  airHit: play('airHit', [3, 5, 6, 1]),
  trip: play('trip', [2, 2, 2, 7]),
  // From the landing to standing up, the 40 ticks of the knockdown.
  knockdown: play('knockdown', [3, 3, 4, 6, 6, 8]),
  getup: play('getup', [2, 2, 2, 2, 2]),
  ko: play('ko', [4, 4, 4, 4, 4, 4, 6, 1]),
  koLanding: { sheet: 'ko', frames: [4, 5, 6, 7], ticks: [4, 4, 6, 1] },

  // The hold.
  hold: play('hold', [6, 6], 0),
  held: { sheet: 'held', frames: [1, 0], ticks: [4, 4], loopFrom: 0 },
  // Thrown backward, frame for frame with the thrower's throwBack up to the release (tick 14).
  thrownBack: play('thrownBack', [3, 3, 4, 4]),
  thrownFall: { sheet: 'airHit', frames: [2, 3], ticks: [1, 1] },
  tech: play('tech', [3, 3, 4, 4]),

  standLight: play('standLight', [2, 3, 2, 4, 5]), // active: frame 2
  chainLight: play('chainLight', [3, 3, 3, 4, 4, 4]), // active: frame 2
  lightFinisher: play('lightFinisher', [2, 3, 3, 3, 5, 6, 7]), // active: frame 3
  forwardLight: play('forwardLight', [3, 3, 2, 2, 5, 5]), // active: frame 3
  // Chassé: the chamber on frames 0-3, the thrust on frame 4.
  standHeavy: play('standHeavy', [2, 3, 3, 2, 3, 7, 9]), // active: frame 4
  chainHeavy: play('chainHeavy', [2, 2, 2, 3, 3, 8, 9]), // active: frame 4
  forwardHeavy: play('forwardHeavy', [4, 4, 4, 6, 3, 5, 5, 5]), // active: frame 4
  // Plongé: the Fouetté plongeant from its leg already high (frames 2-7), the kick on frame 4.
  chainHigh: { sheet: 'forwardHeavy', frames: [2, 3, 4, 5, 6, 7], ticks: [6, 7, 3, 5, 5, 5] },
  backHeavy: play('backHeavy', [2, 2, 3, 4, 5, 6, 6]), // active: frame 3
  chainLaunch: play('chainLaunch', [2, 2, 3, 4, 5, 6, 6]), // active: frame 3
  crouchLight: play('crouchLight', [2, 3, 2, 4, 5]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [2, 3, 4, 3, 5, 5, 5, 5]), // active: frame 3
  jumpLight: play('jumpLight', [2, 2, 6, 3, 3]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 4, 5, 3, 3, 4]), // active: frame 2
  special: SYNCOPE,
  specialForward: RUBATO,
  specialAntiAir: CONTRE_UT,
  specialBoost: { ...SYNCOPE, fx: 'specialBoost' },
  specialForwardBoost: { ...RUBATO, fx: 'specialForwardBoost' },
  specialAntiAirBoost: { ...CONTRE_UT, fx: 'specialAntiAirBoost' },
  // Coda: the step in (frames 0-3, the flash on tick 8), then a blow a frame: the low kick on
  // frame 4 (tick 10), the fouetté on 5 (tick 16), the Revers tournant on 6 (tick 22), which
  // floors; then back into her guard.
  super: play('super', [2, 3, 3, 2, 6, 6, 6, 10, 10]), // active: frames 4-6
  grab: play('grab', [2, 3, 3, 6, 7, 7]), // active: frame 2
  pummel: play('pummel', [2, 3, 1, 8]), // the palm lands: frame 2
  throwForward: play('throwForward', [3, 3, 4, 1, 7, 7, 8]), // the release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 8, 9, 9]), // the release: frame 4
  // Fente and Esquive: the game moves her, the poses ride the floor.
  dashForward: play('dashForward', [1, 3, 3, 4, 4, 3]),
  dashBack: play('dashBack', [1, 3, 3, 4, 4, 3]),
  // Reprise, her Rewind: the Fente cut short, a swing step of 24 px in 12 ticks.
  boostCancel: { sheet: 'dashForward', frames: [0, 1, 2, 4, 5], ticks: [1, 2, 3, 3, 3] },

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [9, 9, 9, 9, 9, 9, 9, 9, 9, 9]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};
