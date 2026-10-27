import type { SheetSpec } from '../types';

/** Strips drawn for Nayo, with their number of frames. Read by the game and by tools/sprites. */
export const NAYO_SHEETS = {
  idle: { frames: 10 },
  walkForward: { frames: 12 },
  walkBack: { frames: 12 },
  crouch: { frames: 7 },
  jump: { frames: 6 },
  jumpForward: { frames: 8 },
  block: { frames: 6 },
  hit: { frames: 7 },
  airHit: { frames: 4 },
  knockdown: { frames: 9 },
  ko: { frames: 8 },
  standLight: { frames: 6 },
  standHeavy: { frames: 9 },
  crouchLight: { frames: 6 },
  crouchHeavy: { frames: 9 },
  jumpLight: { frames: 5 },
  jumpHeavy: { frames: 6 },
  special: { frames: 9 },
  specialForward: { frames: 9 },
  specialAntiAir: { frames: 10 },
  intro: { frames: 10 },
  victory: { frames: 8 },
  timeOver: { frames: 4 },
  projectile: { frames: 8 },

  // Combat v2 (docs/combat-v2.md §11.1, §11.2): the dashes and the hold are played.
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
  // Drawn ahead of their gameplay (phase 3): no clip plays these strips yet, so a fight does not
  // load them.
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
} as const satisfies Record<string, SheetSpec>;

export type NayoSheet = keyof typeof NAYO_SHEETS;
