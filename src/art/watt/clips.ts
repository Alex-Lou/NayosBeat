import type { Clip, FighterClips } from '../types';
import type { WattSheet } from './sheets';

interface WattClip extends Clip {
  readonly sheet: WattSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun. */
const QUICK = [0, 1, 4];

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: WattSheet, ticks: readonly number[], loopFrom?: number): WattClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

// The specials, which their Remixes « survolté » play too (D18): the same strip at the same
// timing, their effects redrawn in platine under the Remix's name.
// Coup de jus: the step in on frames 0-3, both clamps out and the discharge on frame 4.
const COUP_DE_JUS = play('special', [2, 2, 3, 3, 3, 6, 8, 8]); // active: frame 4
// Surcharge: the shoulder down (frames 0-3), the rush, the impact on frame 4.
const SURCHARGE = play('specialForward', [3, 3, 4, 4, 4, 4, 4, 6, 6]); // active: frame 4
// Plafonnier: the arms up, the catch above the bulb on frames 2-3, the slam down after.
const PLAFONNIER = play('specialAntiAir', [3, 3, 3, 3, 6, 6, 7, 7]); // active: frames 2-3

/**
 * How Watt's strips are played (docs/watt.md §5). Durations are in ticks (60 per second); for
 * attacks they add up to the move's startup + active + recovery, so the active pose is on screen
 * exactly while the move can hit (the move's active frame is marked in each comment).
 */
export const WATT_CLIPS: FighterClips<WattClip> = {
  // The guard breathing on the « one » of each bar: a bar at 120 BPM, 60 ticks.
  idle: play('idle', [8, 8, 8, 6, 8, 8, 8, 6], 0),
  // Three ticks a frame: 36 px a loop forward (1.2 px/tick), 30 back (1.0).
  walkForward: play('walkForward', [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 0),
  walkBack: play('walkBack', [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [5] },
  preJumpForward: { sheet: 'jumpForward', frames: [0], ticks: [5] },
  // 33 ticks above the ground: the last frame holds until the landing.
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [7, 8, 9, 9] },
  jumpForward: { sheet: 'jumpForward', frames: [1, 2, 3, 4, 5, 6], ticks: [5, 5, 5, 6, 6, 6] },
  landing: { sheet: 'jump', frames: [5], ticks: [4] },

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

  standLight: play('standLight', [1, 3, 2, 4, 5]), // active: frame 2
  chainLight: play('chainLight', [3, 3, 3, 4, 4, 4]), // active: frame 2
  lightFinisher: play('lightFinisher', [3, 3, 3, 3, 5, 6, 7]), // active: frame 3
  forwardLight: play('forwardLight', [3, 3, 3, 2, 5, 6]), // active: frame 3
  // Marteau: the fist raised high on frames 0-3, the fall on frame 4.
  standHeavy: play('standHeavy', [3, 3, 3, 3, 3, 9, 11]), // active: frame 4
  chainHeavy: play('chainHeavy', [2, 3, 3, 3, 3, 9, 11]), // active: frame 4
  forwardHeavy: play('forwardHeavy', [4, 6, 6, 6, 3, 5, 5, 6]), // active: frame 4
  // Coup de masse: the Coup de pilon from its fist already high (frames 2-7), the blow on 4.
  chainHigh: { sheet: 'forwardHeavy', frames: [2, 3, 4, 5, 6, 7], ticks: [7, 8, 3, 5, 5, 6] },
  backHeavy: play('backHeavy', [2, 3, 3, 4, 5, 6, 7]), // active: frame 3
  chainLaunch: play('chainLaunch', [2, 3, 3, 4, 5, 6, 7]), // active: frame 3
  crouchLight: play('crouchLight', [2, 3, 2, 4, 5]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [3, 4, 4, 3, 5, 5, 6, 6]), // active: frame 3
  jumpLight: play('jumpLight', [2, 3, 6, 4, 4]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [4, 4, 6, 4, 4, 4]), // active: frame 2
  special: COUP_DE_JUS,
  specialForward: SURCHARGE,
  specialAntiAir: PLAFONNIER,
  // Branchement: the clamps out on frame 1, the catch on 2, held high until the plant.
  specialClose: { sheet: 'grab', frames: [0, 1, 2, 3, 4, 5], ticks: [3, 2, 6, 8, 14, 14] }, // active: frames 1-2
  // The throw it plays on the catch: lifted, spun, planted (the release: frame 3).
  throwClose: {
    sheet: 'throwForward',
    frames: [0, 1, 2, 3, 4, 5, 6],
    ticks: [4, 4, 2, 1, 8, 8, 8],
  },
  // Câble: the clamps out, the line across, the reel in (the discharge on frame 3).
  specialBack: {
    sheet: 'special',
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    ticks: [4, 4, 6, 6, 6, 6, 7, 7],
  }, // active: frames 3-4
  // Plongeon: the fall from the air, the catch in the Plaquage's dive (frame 2).
  jumpSpecial: { sheet: 'jumpHeavy', frames: [0, 1, 2, 3, 4, 5], ticks: [4, 4, 4, 6, 8, 8] }, // active: frame 2
  throwDive: { sheet: 'throwForward', frames: [0, 1, 2, 3, 4, 5, 6], ticks: [4, 4, 2, 1, 8, 7, 7] },
  throwCatch: {
    sheet: 'throwForward',
    frames: [0, 1, 2, 3, 4, 5, 6],
    ticks: [4, 4, 2, 1, 6, 7, 7],
  },
  specialBoost: { ...COUP_DE_JUS, fx: 'specialBoost' },
  specialForwardBoost: { ...SURCHARGE, fx: 'specialForwardBoost' },
  specialAntiAirBoost: { ...PLAFONNIER, fx: 'specialAntiAirBoost' },
  // Plein feu: invincible from the first frame (the flash on tick 1); a blow a frame: the left
  // hook on frame 2 (tick 3), the right on 3 (tick 9), both fists down on 4 (tick 16), which
  // floors; then back into his guard.
  super: play('super', [1, 2, 6, 7, 3, 6, 8, 8, 8]), // active: frames 2-4
  grab: play('grab', [3, 3, 3, 6, 8, 8]), // active: frame 2
  pummel: play('pummel', [3, 4, 1, 10]), // the clamps squeeze: frame 2
  throwForward: play('throwForward', [4, 4, 4, 1, 7, 8, 9]), // the release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 8, 9, 9]), // the release: frame 4
  // Pas blindé and Recul: the game moves him, the poses ride the floor.
  dashForward: play('dashForward', [2, 3, 4, 4, 4, 3]),
  dashBack: play('dashBack', [2, 4, 4, 5, 5, 4]),
  // Rallumage, his Rewind: the Pas blindé cut short, a heavy step of 24 px in 14 ticks.
  boostCancel: { sheet: 'dashForward', frames: [0, 1, 2, 4, 5], ticks: [1, 3, 3, 4, 3] },

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [9, 9, 9, 9, 9, 9, 9, 9, 9, 9]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};
