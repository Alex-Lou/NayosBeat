import type { Clip, FighterClips } from '../types';
import type { RiffSheet } from './sheets';

interface RiffClip extends Clip {
  readonly sheet: RiffSheet;
}

/** Frames 0, 1 and 4 of a five-frame reaction: its quick version, for a short stun (§11.4). */
const QUICK = [0, 1, 4];

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: RiffSheet, ticks: readonly number[], loopFrom?: number): RiffClip {
  const frames = ticks.map((_, index) => index);
  return loopFrom === undefined ? { sheet, frames, ticks } : { sheet, frames, ticks, loopFrom };
}

/**
 * How Riff's strips are played (docs/combat-v2.md §11.3). Durations are in ticks (60 per
 * second); for attacks they add up to the move's startup + active + recovery, so the active pose
 * is on screen exactly while the move can hit (the move's active frame is marked in each
 * comment). The strips were drawn to these timings; the sprite generator reads them too, to make
 * her fringe and her belt's chain lag behind her (tools/sprites/riff/index.ts).
 */
export const RIFF_CLIPS: FighterClips<RiffClip> = {
  // One toprock rock a loop, 48 ticks: the rise eased, the top held, the snap down in 3 ticks.
  idle: play('idle', [7, 4, 5, 5, 7, 3, 9, 8], 0),
  // Two ticks a frame: 38 px a loop forward (1.9 px/tick), 28 px back (1.4), her stride.
  walkForward: play('walkForward', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  walkBack: play('walkBack', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 0),
  crouch: play('crouch', [2, 2, 2, 8, 8, 8], 3),
  preJump: { sheet: 'jump', frames: [0], ticks: [3] },
  // Her front flip loads its own way: the plié already tipping in.
  preJumpForward: { sheet: 'jumpForward', frames: [0], ticks: [3] },
  // 27 ticks above the ground: the last frame holds until the landing.
  jump: { sheet: 'jump', frames: [1, 2, 3, 4], ticks: [6, 7, 7, 8] },
  jumpForward: { sheet: 'jumpForward', frames: [1, 2, 3, 4, 5, 6], ticks: [4, 4, 4, 4, 4, 5] },
  landing: { sheet: 'jump', frames: [5], ticks: [2] },

  // Impact first (held through the hitstop), then the cover, its last frame held to the end of
  // the stun (`endFrames`); that last frame is her proximity guard too.
  blockStand: { sheet: 'block', frames: [0, 1, 2], ticks: [2, 3, 1], endFrames: 1 },
  blockCrouch: { sheet: 'block', frames: [3, 4, 5], ticks: [2, 3, 1], endFrames: 1 },
  // Hit standing (§9.4, §11.1): the back-bend, folded at the belly, a leg taken. A long stun
  // (18 ticks and more) plays the whole strip, a short one its quick version.
  hitHigh: { ...play('hitHigh', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitHighLight: { sheet: 'hitHigh', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitMid: { ...play('hitMid', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitMidLight: { sheet: 'hitMid', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitLow: { ...play('hitLow', [3, 3, 4, 4, 2]), endFrames: 1 },
  hitLowLight: { sheet: 'hitLow', frames: QUICK, ticks: [3, 4, 2], endFrames: 1 },
  hitCrouch: { ...play('hitCrouch', [3, 4, 1]), endFrames: 1 },
  airHit: play('airHit', [3, 5, 6, 1]),
  // Swept: the legs go, she falls back seat first, the last frame held through the flight.
  trip: play('trip', [2, 2, 2, 7]),
  // From the landing to standing up, the 40 ticks of the knockdown: the seat, the slam, the
  // « come on », the rock back and the prowl, then the spring up out of it on the last 10.
  knockdown: play('knockdown', [3, 3, 4, 6, 6, 8]),
  getup: play('getup', [2, 2, 2, 2, 2]),
  ko: play('ko', [4, 4, 4, 4, 4, 4, 6, 1]),
  // Out cold in the air: from the seat hitting the floor (frame 4) once she lands.
  koLanding: { sheet: 'ko', frames: [4, 5, 6, 7], ticks: [4, 4, 6, 1] },

  // The hold (§4, §11.3). The holder at the collar, between her moves.
  hold: play('hold', [6, 6], 0),
  // Held, fighting it: yanked in first, and again from the impact of every pummel (the game
  // starts the clip over on it), held through its hitstop.
  held: { sheet: 'held', frames: [1, 0], ticks: [4, 4], loopFrom: 0 },
  // Thrown backward, frame for frame with the thrower's throwBack up to the release (tick 14,
  // the sides switching on tick 6; both fighters' throws share these first frames).
  thrownBack: play('thrownBack', [3, 3, 4, 4]),
  // The end of that flight, at the body's real place: one tick per frame, then the knockdown.
  thrownFall: { sheet: 'airHit', frames: [2, 3], ticks: [1, 1] },
  // Broken free: the 14 ticks of the tech's stun.
  tech: play('tech', [3, 3, 4, 4]),

  standLight: play('standLight', [1, 2, 2, 3, 3]), // active: frame 2
  // L, L, L: the Revers, a flat spinning backfist, then the Swipe, a meia lua de compasso.
  chainLight: play('chainLight', [2, 3, 3, 3, 3, 4]), // active: frame 2
  lightFinisher: play('lightFinisher', [2, 2, 3, 3, 5, 6, 7]), // active: frame 3
  // Toprock: the dance step on frames 0-2.
  forwardLight: play('forwardLight', [2, 3, 3, 2, 5, 5]), // active: frame 3
  standHeavy: play('standHeavy', [2, 2, 2, 3, 4, 5, 5]), // active: frame 3
  // Coup de boule, active on frame 3: TEMPORARY, the Coude's strip played in the ticks of its
  // own until feat/combos-v3-art lands the chainHeavy strip (docs/combos-v3.md §4, §5).
  chainHeavy: { sheet: 'standHeavy', frames: [0, 1, 2, 3, 5, 6], ticks: [2, 2, 2, 2, 7, 7] },
  // Talon: the leg rises on frames 0-3, the axe comes down on frame 4.
  forwardHeavy: play('forwardHeavy', [4, 4, 4, 5, 3, 4, 5, 5]), // active: frame 4
  // Hache: the Talon from its leg already high (frames 2-7), the axe on frame 4, the active one
  // (docs/combos-v3.md §4).
  chainHigh: { sheet: 'forwardHeavy', frames: [2, 3, 4, 5, 6, 7], ticks: [6, 6, 3, 4, 5, 5] },
  // Retourné: the hopping scorpion, the boot hooked over her head.
  backHeavy: play('backHeavy', [2, 2, 2, 5, 5, 5, 5]), // active: frame 3
  // Retourné sauté: TEMPORARY, the Retourné's strip in its own ticks until feat/combos-v3-art
  // lands the chainLaunch strip (its call hop on frames 0-1).
  chainLaunch: play('backHeavy', [2, 2, 2, 5, 5, 5, 5]), // active: frame 3
  crouchLight: play('crouchLight', [1, 2, 2, 3, 4]), // active: frame 2
  crouchHeavy: play('crouchHeavy', [2, 2, 3, 3, 4, 4, 5, 5]), // active: frame 3
  jumpLight: play('jumpLight', [1, 2, 6, 2, 3]), // active: frame 2
  jumpHeavy: play('jumpHeavy', [3, 3, 5, 3, 3, 3]), // active: frame 2
  // Glissade: low from frame 1 to frame 5, exactly while her body is low (ticks 2-20), the
  // slide on frames 3-4. Drawn to 3, 3, 4, 4, 4, 5, 5, 6: the game's low body wins, the dive
  // comes a tick sooner and the rise two ticks later.
  special: play('special', [2, 4, 4, 4, 4, 3, 7, 6]), // active: frames 3-4
  // Saut de l'ange: the corkscrew, then the two-heel stomp.
  specialForward: play('specialForward', [3, 3, 3, 3, 4, 4, 4, 5, 5]), // active: frame 5
  specialAntiAir: play('specialAntiAir', [2, 2, 3, 3, 6, 6, 6, 6]), // active: frames 2-3
  grab: play('grab', [2, 3, 3, 6, 6, 7]), // active: frame 2; a miss closes on air
  pummel: play('pummel', [2, 2, 1, 7]), // the headbutt lands: frame 2
  throwForward: play('throwForward', [3, 3, 4, 1, 7, 7, 7]), // the release: frame 3
  throwBack: play('throwBack', [3, 3, 4, 4, 1, 8, 8, 9]), // the release: frame 4
  // Footwork and Retrait: the game moves her, the poses ride the floor (frame 4 of the
  // Footwork: the stance it cancels from).
  dashForward: play('dashForward', [1, 3, 3, 3, 3, 3]),
  dashBack: play('dashBack', [1, 4, 4, 3, 3, 5]),

  // Round poses, played on the round clock: the entrance fills the 90-tick intro.
  intro: play('intro', [10, 8, 8, 8, 10, 8, 8, 10, 10, 10]),
  victory: play('victory', [6, 6, 6, 6, 8, 8, 8, 8], 4),
  timeOver: play('timeOver', [10, 10, 10, 10], 0),
};
