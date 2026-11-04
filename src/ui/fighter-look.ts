/** How a fighter looks on a menu: its standing pose, from its idle strip. */
export interface FighterLook {
  /** URL of the idle strip's image: its frames cut and packed (an atlas), or side by side. */
  readonly strip: string;
  /** That image's size, in art pixels. */
  readonly image: { readonly width: number; readonly height: number };
  /** One frame, its whole cell, in art pixels. */
  readonly width: number;
  readonly height: number;
  /** Where each frame of the strip is in the image. */
  readonly cuts: readonly FrameCut[];
  /** The bust on its tile: a square of the first frame, in art pixels. */
  readonly portrait: { readonly x: number; readonly y: number; readonly size: number };
  /** The bust drawn for the tile (its URL), shown whole in place of `portrait`. */
  readonly portraitImage?: string;
  /** Its idle at the game's pace: the frames of the strip it plays in turn, round and round. */
  readonly idle: readonly IdleFrame[];
}

/**
 * A frame of the strip as its image holds it: the rectangle of its cell it shows (around it, the
 * cell is empty), in art pixels, and where that rectangle's top left corner is in the image.
 */
export interface FrameCut {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

/** One step of an idle: a frame of the strip, and how long it stays on screen. */
export interface IdleFrame {
  readonly frame: number;
  readonly seconds: number;
}
