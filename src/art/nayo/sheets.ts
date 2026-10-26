import type { SheetSpec } from '../types';

/** Strips drawn for Nayo, with their number of frames. Read by the game and by tools/sprites. */
export const NAYO_SHEETS = {
  idle: { frames: 6 },
  walkForward: { frames: 8 },
  walkBack: { frames: 8 },
  crouch: { frames: 4 },
  jump: { frames: 5 },
  jumpForward: { frames: 6 },
  block: { frames: 4 },
  hit: { frames: 5 },
  airHit: { frames: 3 },
  knockdown: { frames: 6 },
  ko: { frames: 5 },
  standLight: { frames: 5 },
  standHeavy: { frames: 7 },
  crouchLight: { frames: 5 },
  crouchHeavy: { frames: 7 },
  jumpLight: { frames: 4 },
  jumpHeavy: { frames: 5 },
  special: { frames: 7 },
  specialForward: { frames: 7 },
  specialAntiAir: { frames: 7 },
  throw: { frames: 5 },
  intro: { frames: 6 },
  victory: { frames: 6 },
  timeOver: { frames: 2 },
  projectile: { frames: 4 },
} as const satisfies Record<string, SheetSpec>;

export type NayoSheet = keyof typeof NAYO_SHEETS;
