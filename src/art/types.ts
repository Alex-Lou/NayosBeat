/**
 * Description of a fighter's sprites: which strips exist and how the game plays them.
 * No engine or bundler import here: the sprite generator (tools/sprites) reads it too.
 */

import type { MoveId } from '../core/move-data';

/** Sprite pixels per world pixel: fighters are drawn twice as finely as the stage. */
export const ART_SCALE = 2;
/** Every frame is a square cell (in sprite pixels); strips are one row of cells, facing right. */
export const CELL_SIZE = 256;
/** Pixel of the cell where the center of the feet stands, in every frame. */
export const ANCHOR = { x: 128, y: 248 } as const;

/** One horizontal strip of `frames` cells. */
export interface SheetSpec {
  readonly frames: number;
}

/**
 * The cells of a strip as saved: cropped to what its frames draw (to spare video memory), with
 * the pixel that goes on the fighter's position (the feet anchor).
 */
export interface Cell {
  readonly width: number;
  readonly height: number;
  readonly anchor: { readonly x: number; readonly y: number };
}

/** A full, uncropped cell anchored at the feet. */
export const FULL_CELL: Cell = { width: CELL_SIZE, height: CELL_SIZE, anchor: ANCHOR };

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
  /**
   * Front effects of some strips (energy, flashes, speed lines), drawn over both fighters:
   * image URL by strip name, frame i going with frame i of that strip.
   */
  readonly fx?: Readonly<Record<string, string>>;
  /** Cropped cells by strip ('idle') and by strip effects ('fx/idle'); FULL_CELL otherwise. */
  readonly cells?: Readonly<Record<string, Cell>>;
}

/** The cells of a strip, `fx/` prefixed for its front effects. */
export function cellOf(art: FighterArt, strip: string): Cell {
  return art.cells?.[strip] ?? FULL_CELL;
}
