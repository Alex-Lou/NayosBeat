/**
 * Description of a fighter's sprites: which strips exist and how the game plays them.
 * No engine or bundler import here: the sprite generator (tools/sprites) reads it too.
 */

import type { CoreMoveId, MoveId, OptionalMoveId } from '../core/move-data';

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
  /**
   * A stun's clip (docs/combat-v2.md §11.4): its last `endFrames` frames end with the stun
   * (`stunTotal`), so the guard comes back exactly when the player can act again. The frames
   * before keep their pace, unless the stun is too short for them (then the whole clip is
   * squeezed into it).
   */
  readonly endFrames?: number;
  /**
   * The front effects played with it, when they are not its strip's own: a Remix plays its
   * special's strip with that strip's effects redrawn in platine (docs/combos-v3.md §1.8.7),
   * named after the Remix.
   */
  readonly fx?: string;
}

/** Clips for the states that are not attacks. Attacks use the clip named after their move. */
export const STATE_CLIP_IDS = [
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'preJump',
  // The pre-jump of a jump forward, forward held: a fighter may load it its own way.
  'preJumpForward',
  'jump',
  'jumpForward',
  'landing',
  'blockStand',
  'blockCrouch',
  // Hit standing, by where the blow landed (docs/combat-v2.md §9.4): the whole reaction for a
  // long stun, its quick version (`Light`) otherwise.
  'hitHigh',
  'hitHighLight',
  'hitMid',
  'hitMidLight',
  'hitLow',
  'hitLowLight',
  'hitCrouch',
  'airHit',
  // Swept off the legs, falling onto the back, then the knockdown.
  'trip',
  'knockdown',
  // The last ticks of the knockdown: standing up.
  'getup',
  'ko',
  // Knocked out in the air (a launcher, a sweep, a throw, a blow in the air): the airHit until
  // the body lands, then the ko from the frame it meets the floor.
  'koLanding',
  // The hold: holder and held between the moves, the backward throw's victim, the tech.
  'hold',
  'held',
  'thrownBack',
  'thrownFall',
  'tech',
  // Round poses: entrance, winner, loser on time.
  'intro',
  'victory',
  'timeOver',
] as const;

export type StateClipId = (typeof STATE_CLIP_IDS)[number];
export type ClipId = StateClipId | MoveId;

/**
 * A clip for every state and core move, and for the optional moves the fighter has (validation
 * checks each one defined has its clip). `C`: the fighter's own clips, which name its strips.
 */
export type FighterClips<C extends Clip = Clip> = Readonly<Record<StateClipId | CoreMoveId, C>> &
  Readonly<Partial<Record<OptionalMoveId, C>>>;

export interface FighterArt {
  /** Prefix of the texture keys, unique per fighter. */
  readonly key: string;
  readonly sheets: Readonly<Record<string, SheetSpec>>;
  readonly clips: FighterClips;
  /** Image URL of every strip, by sheet name. */
  readonly urls: Readonly<Record<string, string>>;
  /**
   * The flying projectiles of a fighter that has some, by the move that fires each (the Vinyle,
   * its platine Remix), played on the match clock.
   */
  readonly projectiles?: Readonly<Partial<Record<MoveId, Clip>>>;
  /**
   * Front effects of some strips (energy, flashes, speed lines), drawn over both fighters:
   * image URL by strip name, frame i going with frame i of that strip; or by the name a clip
   * gives its effects (`Clip.fx`).
   */
  readonly fx?: Readonly<Record<string, string>>;
  /** Cropped cells by strip ('idle') and by strip effects ('fx/idle'); FULL_CELL otherwise. */
  readonly cells?: Readonly<Record<string, Cell>>;
}

/**
 * The clip `id` of a fighter. A fighter plays only the moves it has, and validation gives each
 * one a clip (`validateArt`): a missing one is a bug.
 */
export function clipOf(art: FighterArt, id: ClipId): Clip {
  const clip = art.clips[id];
  if (!clip) throw new Error(`${art.key} has no clip ${id}`);
  return clip;
}

/** The cells of a strip, `fx/` prefixed for its front effects. */
export function cellOf(art: FighterArt, strip: string): Cell {
  return art.cells?.[strip] ?? FULL_CELL;
}

/**
 * The strips that a clip (or a projectile) plays: all a fight needs. The others are drawn
 * ahead of their gameplay and stay unloaded until a clip plays them.
 */
export function playedSheets(art: FighterArt): ReadonlySet<string> {
  const sheets = new Set(Object.values<Clip>(art.clips).map((clip) => clip.sheet));
  for (const clip of Object.values<Clip | undefined>(art.projectiles ?? {})) {
    if (clip) sheets.add(clip.sheet);
  }
  return sheets;
}

/** The front effects a clip plays: its own (`Clip.fx`), else its strip's. */
export function effectsOf(clip: Clip): string {
  return clip.fx ?? clip.sheet;
}

/** The front effects that a clip (or a projectile) plays, by the name of their images. */
export function playedEffects(art: FighterArt): ReadonlySet<string> {
  const effects = new Set(playedSheets(art));
  for (const clip of Object.values<Clip>(art.clips)) effects.add(effectsOf(clip));
  return effects;
}
