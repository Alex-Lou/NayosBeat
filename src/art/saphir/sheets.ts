import type { SheetSpec } from '../types';

/**
 * Strips drawn for Saphir, with their number of frames: the same set as Riff's (docs/saphir.md),
 * a few lengths set to her own moves. Read by the game and by tools/sprites.
 */
export const SAPHIR_SHEETS = {
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
  standLight: { frames: 5 },
  chainLight: { frames: 6 },
  lightFinisher: { frames: 7 },
  forwardLight: { frames: 6 },
  standHeavy: { frames: 7 },
  forwardHeavy: { frames: 8 },
  backHeavy: { frames: 7 },
  crouchLight: { frames: 5 },
  crouchHeavy: { frames: 8 },
  jumpLight: { frames: 5 },
  jumpHeavy: { frames: 6 },
  // Specials.
  special: { frames: 8 },
  specialForward: { frames: 9 },
  specialAntiAir: { frames: 8 },
  // The Hold.
  grab: { frames: 6 },
  hold: { frames: 2 },
  pummel: { frames: 4 },
  throwForward: { frames: 7 },
  throwBack: { frames: 8 },
  // Round poses.
  intro: { frames: 10 },
  victory: { frames: 8 },
  timeOver: { frames: 4 },
  // Combos v3: the Chassé arrière, the Chandelle glissée, the Coda.
  chainHeavy: { frames: 7 },
  chainLaunch: { frames: 7 },
  super: { frames: 9 },
} as const satisfies Record<string, SheetSpec>;

export type SaphirSheet = keyof typeof SAPHIR_SHEETS;
