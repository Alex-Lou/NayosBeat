/**
 * Description of a fighter's sprites: which strips exist and how the game plays them.
 * No engine or bundler import here: the sprite generator (tools/sprites) reads it too.
 */

import type { MoveId } from '../core/config';

/** Every frame is a square cell; strips are one row of cells, facing right. */
export const CELL_SIZE = 128;
/** Pixel of the cell where the center of the feet stands, in every frame. */
export const ANCHOR = { x: 64, y: 124 } as const;

/** One horizontal strip of `frames` cells. */
export interface SheetSpec {
  readonly frames: number;
}

/** A sequence of frames taken from one strip, each shown for a number of simulation ticks. */
export interface Clip {
  readonly sheet: string;
  /** Indices into the strip. */
  readonly frames: readonly number[];
  /** Ticks each frame stays on screen, same length as `frames`. */
  readonly ticks: readonly number[];
  /** Index into `frames` where the clip starts again once over; without it the last frame holds. */
  readonly loopFrom?: number;
}

/** Clips for the states that are not attacks. Attacks use the clip named after their move. */
export const STATE_CLIP_IDS = [
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'preJump',
  'jump',
  'jumpForward',
  'landing',
  'blockStand',
  'blockCrouch',
  'hitStand',
  'hitCrouch',
  'airHit',
  'knockdown',
  'ko',
  // Round poses: entrance, winner, loser on time.
  'intro',
  'victory',
  'timeOver',
] as const;

export type StateClipId = (typeof STATE_CLIP_IDS)[number];
export type ClipId = StateClipId | MoveId;

export interface FighterArt {
  /** Prefix of the texture keys, unique per fighter. */
  readonly key: string;
  readonly sheets: Readonly<Record<string, SheetSpec>>;
  readonly clips: Readonly<Record<ClipId, Clip>>;
  /** Image URL of every strip, by sheet name. */
  readonly urls: Readonly<Record<string, string>>;
  /** The flying projectile of a fighter that has one, played on the match clock. */
  readonly projectile?: Clip;
}
