import type { Clip, ClipId } from '../types';
import type { NayoSheet } from './sheets';

interface NayoClip extends Clip {
  readonly sheet: NayoSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun (§11.4). */
const QUICK = [0, 1, 4];

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
  // The walk poses were drawn for the v1 speeds: a planted foot slides back 2.4 px a frame in
  // the forward walk (1.2 px/tick over 2 ticks), 2 px in the backward one (1 px/tick). At the
  // v2 speeds (1.5 and 1.2 px/tick) a frame lasts 1.6 and 1.67 ticks on average: the ticks
  // alternate so that each planted foot drifts at most 0.9 px (forward walk) and 0.4 px (back)
  // on the stage. Art track: redraw both strides for the new speeds (SLIDE 3 and 2.4 px), and
  // the loops go back to 2 ticks a frame (36 and 28.8 px a loop).
  walkForward: play('walkForward', [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1], 0),
  walkBack: play('walkBack', [2, 1, 2, 1, 2, 2, 2, 1, 2, 1, 2, 2], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [4] },
  // 31 ticks above the ground: the last frame holds until the landing.
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [6, 8, 8, 10] },
  jumpForward: play('jumpForward', [3, 4, 4, 4, 4, 5, 4, 4]),
  landing: { sheet: 'jump', frames: [5], ticks: [3] },

  // Impact first (held through the hitstop), then the guard or the reaction, its last frame
  // held to the end of the stun (`endFrames`).
  blockStand: { sheet: 'block', frames: [0, 1, 2], ticks: [2, 3, 1], endFrames: 1 },
  blockCrouch: { sheet: 'block', frames: [3, 4, 5], ticks: [2, 3, 1], endFrames: 1 },
  // Hit standing (docs/combat-v2.md §9.4, §11.1): the head snapped back, folded at the belly,
  // a leg buckling. A long stun (18 ticks and more) plays the whole strip, a short one its
  // quick version.
  hitHigh: { ...play('hitHigh', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitHighLight: { sheet: 'hitHigh', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitMid: { ...play('hitMid', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitMidLight: { sheet: 'hitMid', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitLow: { ...play('hitLow', [3, 3, 4, 4, 1]), endFrames: 1 },
  hitLowLight: { sheet: 'hitLow', frames: QUICK, ticks: [3, 4, 1], endFrames: 1 },
  hitCrouch: { ...play('hitCrouch', [3, 4, 1]), endFrames: 1 },
  airHit: play('airHit', [3, 5, 6, 1]),
  // Swept (a sweep, the Glissade): the legs go, he falls on his back, the last frame held
  // through the 7-tick flight.
  trip: play('trip', [2, 2, 2, 7]),
  // From the landing to standing up, 40 ticks, the knockdown time: the fall and lying on the
  // floor, then the kip-up on the last 10 ticks.
  knockdown: play('knockdown', [3, 3, 4, 20]),
  getup: play('getup', [2, 2, 2, 2, 2]),
  ko: play('ko', [4, 4, 4, 4, 4, 4, 6, 1]),

  // The hold (docs/combat-v2.md §4, §11.1). The holder at the collar, between his moves.
  hold: play('hold', [6, 6], 0),
  // Held, struggling: yanked in first, and again from the impact of every knee (the game
  // starts the clip over on it), held through the knee's hitstop.
  held: { sheet: 'held', frames: [1, 0], ticks: [4, 4], loopFrom: 0 },
  // Thrown backward, frame for frame with the thrower's throwBack up to the release (tick 14,
  // the sides switching on tick 6); the last frame stays where he was let go during the flight.
  thrownBack: play('thrownBack', [3, 3, 4, 4]),
  // The end of that flight, at the body's real place: one tick per frame, then the knockdown.
  thrownFall: { sheet: 'airHit', frames: [2, 3], ticks: [1, 1] },
  // Broken free: the 14 ticks of the tech's stun.
  tech: play('tech', [3, 3, 4, 4]),

  standLight: play('standLight', [2, 2, 3, 2, 2, 3]), // active: frame 2
  // L, L, L: the Cross (a step in on frames 0-2), then the Mise au tapis, a wide hook.
  chainLight: play('chainLight', [2, 2, 2, 3, 6, 6]), // active: frame 3
  lightFinisher: play('lightFinisher', [2, 3, 3, 3, 5, 6, 7]), // active: frame 3
  // Jab chassé: the slide forward on frames 0-2.
  forwardLight: play('forwardLight', [2, 2, 3, 3, 4, 6]), // active: frame 3
  standHeavy: play('standHeavy', [3, 3, 2, 4, 3, 3, 3, 3, 4]), // active: frame 3
  // Overhand: up on his toes on frames 3-4, the cyan arc from frame 2.
  forwardHeavy: play('forwardHeavy', [4, 4, 4, 4, 3, 3, 5, 5, 5]), // active: frame 5
  // Remontant: the fist nearly vertical, the head tucked.
  backHeavy: play('backHeavy', [2, 2, 3, 4, 5, 6, 6]), // active: frame 3
  crouchLight: play('crouchLight', [2, 2, 2, 2, 3, 3]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [3, 3, 3, 3, 4, 4, 4, 4, 4]), // active: frame 3
  jumpLight: play('jumpLight', [2, 2, 6, 3, 3]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 4, 5, 3, 3, 4]), // active: frame 2
  special: play('special', [3, 3, 3, 3, 8, 6, 5, 5, 5]), // the Vinyle leaves on frame 4
  specialForward: play('specialForward', [3, 3, 3, 2, 4, 4, 5, 5, 4]), // active: frame 4
  specialAntiAir: play('specialAntiAir', [3, 3, 5, 4, 4, 4, 4, 4, 4, 4]), // active: frames 1-2
  grab: play('grab', [2, 3, 3, 6, 7, 7]), // active: frame 2; a miss closes on nothing
  pummel: play('pummel', [3, 3, 1, 9]), // the knee lands: frame 2
  throwForward: play('throwForward', [3, 3, 4, 1, 6, 6, 6, 7]), // the release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 6, 7, 7, 7]), // the release: frame 4
  // Pas chassé and Retrait: set off, glide, landing (the game moves him, the poses stay put).
  dashForward: play('dashForward', [1, 4, 4, 3, 3, 3]),
  dashBack: play('dashBack', [1, 4, 4, 4, 4, 5]),

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [10, 8, 8, 8, 10, 8, 8, 10, 10, 10]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};

/** The Vinyle in flight, looping on the match clock: a turn of the record every 16 ticks. */
export const NAYO_PROJECTILE: NayoClip = play('projectile', [2, 2, 2, 2, 2, 2, 2, 2], 0);
