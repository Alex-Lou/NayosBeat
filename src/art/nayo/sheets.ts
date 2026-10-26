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
  throw: { frames: 7 },
  intro: { frames: 10 },
  victory: { frames: 8 },
  timeOver: { frames: 4 },
  projectile: { frames: 6 },
} as const satisfies Record<string, SheetSpec>;

export type NayoSheet = keyof typeof NAYO_SHEETS;
