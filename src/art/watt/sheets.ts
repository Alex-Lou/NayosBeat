import type { SheetSpec } from '../types';

/**
 * Strips drawn for Watt, with their number of frames: the same set as Saphir's (docs/watt.md),
 * cut to his own moves' timings (clips.ts). Read by the game and by tools/sprites.
 */
export const WATT_SHEETS = {
  // Movement.
  idle: { frames: 8 },
  walkForward: { frames: 10 },
  walkBack: { frames: 10 },
  crouch: { frames: 6 },
  jump: { frames: 6 },
  jumpForward: { frames: 7 },
  dashForward: { frames: 6 },
  dashBack: { frames: 6 },
  // Guard and reactions.
  block: { frames: 6 },
  hitHigh: { frames: 5 },
  hitMid: { frames: 5 },
  hitLow: { frames: 5 },
  hitCrouch: { frames: 3 },
  trip: { frames: 4 },
  airHit: { frames: 4 },
  knockdown: { frames: 6 },
  getup: { frames: 5 },
  ko: { frames: 8 },
  held: { frames: 2 },
  thrownBack: { frames: 4 },
  tech: { frames: 4 },
  // Normals.
  standLight: { frames: 6 },
  backLight: { frames: 5 },
  jabRepeat: { frames: 5 },
  chainLight: { frames: 7 },
  chainLow: { frames: 6 },
  lightFinisher: { frames: 7 },
  forwardLight: { frames: 6 },
  standHeavy: { frames: 7 },
  forwardHeavy: { frames: 8 },
  downForwardHeavy: { frames: 7 },
  backHeavy: { frames: 8 },
  crouchLight: { frames: 6 },
  crouchHeavy: { frames: 8 },
  jumpLight: { frames: 6 },
  jumpHeavy: { frames: 7 },
  jumpDownHeavy: { frames: 7 },
  // Specials.
  special: { frames: 10 },
  specialForward: { frames: 10 },
  specialAntiAir: { frames: 8 },
  // The Remixes' own strips: their special's frames, in the Boost's light.
  specialRemix: { frames: 10 },
  specialForwardRemix: { frames: 10 },
  specialAntiAirRemix: { frames: 8 },
  // His own arsenal (docs/watt-arsenal.md §4, §7).
  chainHigh: { frames: 7 },
  specialBack: { frames: 10 },
  specialClose: { frames: 6 },
  throwClose: { frames: 7 },
  jumpSpecial: { frames: 6 },
  throwDive: { frames: 7 },
  throwCatch: { frames: 7 },
  // The Hold.
  grab: { frames: 7 },
  hold: { frames: 2 },
  pummel: { frames: 4 },
  throwForward: { frames: 8 },
  throwBack: { frames: 9 },
  // Round poses.
  intro: { frames: 10 },
  victory: { frames: 8 },
  timeOver: { frames: 4 },
  // Combos v3: the Double marteau (8 frames, 2 hits), the Soulevé, Plein feu.
  chainHeavy: { frames: 8 },
  chainLaunch: { frames: 8 },
  super: { frames: 9 },
} as const satisfies Record<string, SheetSpec>;

export type WattSheet = keyof typeof WATT_SHEETS;
