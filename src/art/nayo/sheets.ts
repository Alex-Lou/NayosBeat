import type { SheetSpec } from '../types';

/** Strips drawn for Nayo, with their number of frames. Read by the game and by tools/sprites. */
export const NAYO_SHEETS = {
  idle: { frames: 6 },
  walkForward: { frames: 8 },
  walkBack: { frames: 8 },
  crouch: { frames: 4 },
  jump: { frames: 5 },
  jumpForward: { frames: 6 },
} as const satisfies Record<string, SheetSpec>;

export type NayoSheet = keyof typeof NAYO_SHEETS;
