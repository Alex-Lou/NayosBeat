import type { SheetSpec } from '../types';

/** Strips drawn for Feline, with their number of frames. Read by the game and by tools/sprites. */
export const FELINE_SHEETS = {
  idle: { frames: 8 },
  walkForward: { frames: 12 },
  walkBack: { frames: 12 },
  crouch: { frames: 7 },
  jump: { frames: 6 },
  jumpForward: { frames: 8 },
  block: { frames: 6 },
  hitCrouch: { frames: 3 },
  airHit: { frames: 4 },
  knockdown: { frames: 4 },
  ko: { frames: 8 },
  standLight: { frames: 6 },
  standHeavy: { frames: 9 },
  crouchLight: { frames: 6 },
  crouchHeavy: { frames: 9 },
  jumpLight: { frames: 5 },
  jumpHeavy: { frames: 6 },
  special: { frames: 8 },
  specialForward: { frames: 8 },
  specialAntiAir: { frames: 10 },
  intro: { frames: 10 },
  victory: { frames: 8 },
  timeOver: { frames: 4 },

  // Combat v2 (docs/combat-v2.md §11.1, §11.2).
  dashForward: { frames: 6 },
  dashBack: { frames: 6 },
  grab: { frames: 6 },
  hold: { frames: 2 },
  pummel: { frames: 4 },
  throwForward: { frames: 8 },
  throwBack: { frames: 9 },
  held: { frames: 2 },
  thrownBack: { frames: 4 },
  tech: { frames: 4 },
  chainLight: { frames: 6 },
  lightFinisher: { frames: 7 },
  forwardLight: { frames: 6 },
  forwardHeavy: { frames: 9 },
  backHeavy: { frames: 7 },
  hitHigh: { frames: 5 },
  hitMid: { frames: 5 },
  hitLow: { frames: 5 },
  trip: { frames: 4 },
  getup: { frames: 5 },

  // Combos v3: Frappe a genou, Elan chasse, Dechirure dimensionnelle.
  chainHeavy: { frames: 7 },
  chainLaunch: { frames: 7 },
  super: { frames: 10 },

  // The Remixes' own strips: their special's frames, in the Boost's light.
  specialRemix: { frames: 8 },
  specialForwardRemix: { frames: 8 },
  specialAntiAirRemix: { frames: 10 },
  // Moves in their own strips: Double griffe and Enclume astrale.
  jabRepeat: { frames: 5 },
  chainHigh: { frames: 7 },
} as const satisfies Record<string, SheetSpec>;

export type FelineSheet = keyof typeof FELINE_SHEETS;
