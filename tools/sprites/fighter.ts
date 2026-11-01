/**
 * What the shared pipeline (sheet.ts, generate.ts, preview.ts) needs to know of a fighter: their
 * strips and poses, their body, how a frame is drawn, how long each frame lasts, their colors.
 * Each character's generator (tools/sprites/<name>/) exports one.
 */

import type { Played, SheetSpec } from '../../src/art/types.ts';
import type { Planned } from './inbetweens.ts';
import type { Colorway } from './palette.ts';
import type { Rgba } from './png.ts';
import type { PixelCanvas, Point } from './raster.ts';
import type { Body, Effect, Pose, Skeleton } from './skeleton.ts';
import type { EffectStyle } from './vfx.ts';

/** Body motion at a frame, in world pixels per tick (x toward the opponent, y up). */
export interface Motion {
  readonly vx: number;
  readonly vy: number;
  /**
   * Where each of the fighter's hanging springs (`Fighter.springs`) has swung to, relative to
   * where it hangs at rest, in world pixels: a braid's tip lagging behind the body.
   */
  readonly hang?: readonly Point[];
}

export const STILL: Motion = { vx: 0, vy: 0 };

/**
 * A part hanging from the neck (a braid), simulated tick by tick as a damped spring: it lags
 * behind the body, overshoots and settles. `stiffness` and `damping` are per tick.
 */
export interface Spring {
  readonly stiffness: number;
  readonly damping: number;
}

/** A strike's hitbox in world pixels (x toward the opponent, y up), and the frames it is on. */
export interface Strike {
  readonly frames: readonly number[];
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface Fighter {
  /** Folder of the assets (src/art/<name>/) and prefix of the generated names. */
  readonly name: string;
  /** Every strip, with its frames: its keys, then its in-betweens (inbetweens.ts). */
  readonly sheets: Readonly<Record<string, SheetSpec>>;
  readonly body: Body;
  /**
   * The key poses of a strip, as its poses/ draw them; undefined for a strip of effects only (a
   * projectile).
   */
  readonly keys: (sheet: string) => readonly Pose[] | undefined;
  /** Poses of a strip, one per frame: its keys, then its in-betweens. */
  readonly poses: (sheet: string) => readonly Pose[] | undefined;
  /** The in-betweens of a strip, drawn after its keys in this order (none: just the keys). */
  readonly inbetweens: (sheet: string) => readonly Planned[];
  /** The clips played with the in-betweens, as src/art/<name>/played.ts holds them. */
  readonly played: Played;
  /** Effects of a strip drawn without a body (a projectile), those of each frame. */
  readonly effectsOnly?: (sheet: string) => readonly (readonly Effect[])[] | undefined;
  /** Ticks of every key of a strip (the clips of the keys), and whether it loops. */
  readonly timing: (sheet: string) => {
    readonly ticks: readonly number[];
    readonly loops: boolean;
  };
  /** Hanging parts simulated over a strip (see Motion.hang). */
  readonly springs?: readonly Spring[];
  /** Draws the fighter in the cell whose left edge is `cellX`. */
  readonly draw: (canvas: PixelCanvas, skeleton: Skeleton, cellX: number, motion: Motion) => void;
  readonly fx: EffectStyle;
  /**
   * The effects its clips name (`Clip.fx`, a Remix's), by that name: the strip whose front
   * effects they redraw in platine.
   */
  readonly platine: Readonly<Record<string, string>>;
  /**
   * The colors of every palette slot in `colorway`; given the pixels of an image, only the
   * slots it may need (see Palette.paletteOf in palette.ts: the Boost's platine is left out of
   * an image that does not draw in it).
   */
  readonly paletteOf: (colorway: Colorway, drawn?: Uint8Array) => readonly Rgba[];
}
