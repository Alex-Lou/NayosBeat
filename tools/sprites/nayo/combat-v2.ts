/**
 * Nayo's combat v2 strips (docs/combat-v2.md §11.1, §11.2), drawn ahead of their gameplay: no
 * clip plays them yet. Their timing and, for the strikes, their frame data and hitbox (§10.1,
 * §10.3) live here until the combat v2 phases move them into src/data/fighters.ts and
 * src/art/nayo/clips.ts. The generator times the hanging parts with these ticks, the preview
 * draws these hitboxes, tests/tools/nayo-v2-sprites.test.ts checks the poses against them.
 */

import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';

export const V2_SHEETS = [
  'dashForward',
  'dashBack',
  'chainLight',
  'lightFinisher',
  'forwardLight',
  'forwardHeavy',
  'backHeavy',
  'grab',
  'hold',
  'pummel',
  'throwForward',
  'throwBack',
  'held',
  'thrownBack',
  'tech',
  'hitHigh',
  'hitMid',
  'hitLow',
  'trip',
  'getup',
] as const satisfies readonly NayoSheet[];

export type V2Sheet = (typeof V2_SHEETS)[number];

export function isV2Sheet(sheet: string): sheet is V2Sheet {
  return (V2_SHEETS as readonly string[]).includes(sheet);
}

/** From, to: world pixels from the feet anchor, x toward the opponent, y up. */
export type Span = readonly [from: number, to: number];

export interface Strike {
  /** Ticks before the first active one, then active ticks. */
  readonly startup: number;
  readonly active: number;
  readonly x: Span;
  readonly y: Span;
  /** An anti-air: the drawing must also reach the top of the hitbox. */
  readonly up?: true;
}

export interface V2Strip {
  readonly frames: number;
  /** Ticks of each frame where the spec fixes them (a held last frame counts its usual time). */
  readonly ticks?: readonly number[];
  readonly loops?: true;
  readonly strike?: Strike;
}

export const NAYO_V2_STRIPS: Readonly<Record<V2Sheet, V2Strip>> = {
  // Pas chassé: the game moves him 56 px over ticks 1-14.
  dashForward: { frames: 6, ticks: [1, 4, 4, 3, 3, 3] },
  // Retrait: 44 px back over ticks 1-16.
  dashBack: { frames: 6, ticks: [1, 4, 4, 4, 4, 5] },
  // Cross, Mise au tapis, Jab chassé: active frame 3.
  chainLight: {
    frames: 6,
    ticks: [2, 2, 2, 3, 6, 6],
    strike: { startup: 6, active: 3, x: [10, 46], y: [46, 60] },
  },
  lightFinisher: {
    frames: 7,
    ticks: [2, 3, 3, 3, 5, 6, 7],
    strike: { startup: 8, active: 3, x: [10, 48], y: [44, 62] },
  },
  forwardLight: {
    frames: 6,
    ticks: [2, 2, 3, 3, 4, 6],
    strike: { startup: 7, active: 3, x: [10, 42], y: [46, 58] },
  },
  // Overhand: active frame 5.
  forwardHeavy: {
    frames: 9,
    ticks: [4, 4, 4, 4, 3, 3, 5, 5, 5],
    strike: { startup: 19, active: 3, x: [12, 40], y: [36, 72] },
  },
  // Remontant: active frame 3, an anti-air.
  backHeavy: {
    frames: 7,
    ticks: [2, 2, 3, 4, 5, 6, 6],
    strike: { startup: 7, active: 4, x: [4, 30], y: [56, 104], up: true },
  },
  // The grab: active frame 2; frames 3-5 close on nothing (a missed grab).
  grab: {
    frames: 6,
    ticks: [2, 3, 3, 6, 7, 7],
    strike: { startup: 5, active: 3, x: [6, 30], y: [20, 60] },
  },
  hold: { frames: 2, ticks: [6, 6], loops: true },
  // Knee: impact on frame 2 (tick 6).
  pummel: { frames: 4, ticks: [3, 3, 1, 9] },
  // Renvoi: the release on frame 3 (tick 10).
  throwForward: { frames: 8, ticks: [3, 3, 4, 1, 6, 6, 6, 7] },
  // Projection d'épaule: the sides switch on tick 8, the release on frame 4 (tick 14).
  throwBack: { frames: 9, ticks: [3, 3, 4, 4, 1, 6, 7, 7, 7] },
  // Frame 1 plays again on every knee.
  held: { frames: 2, ticks: [4, 4], loops: true },
  // In step with the throw: frame = floor(attacker tick * 4 / 14) up to the release.
  thrownBack: { frames: 4, ticks: [4, 3, 4, 3] },
  tech: { frames: 4, ticks: [3, 3, 4, 4] },
  // The reactions last as long as the stun: light hits play frames 0, 1 and 4.
  hitHigh: { frames: 5 },
  hitMid: { frames: 5 },
  hitLow: { frames: 5 },
  // The last frame holds through the 7-tick flight, then the knockdown takes over.
  trip: { frames: 4, ticks: [2, 2, 2, 7] },
  // The last 10 ticks of the knockdown.
  getup: { frames: 5, ticks: [2, 2, 2, 2, 2] },
};

/** Frames of a strip that show while a strike can hit. */
export function activeFrames(ticks: readonly number[], strike: Strike): number[] {
  const frames: number[] = [];
  let tick = 0;
  ticks.forEach((duration, frame) => {
    if (tick < strike.startup + strike.active && tick + duration > strike.startup) {
      frames.push(frame);
    }
    tick += duration;
  });
  return frames;
}
