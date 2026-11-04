/**
 * A stage as the code draws it (tools/stage/<stage>/): its three layers, the animations laid on
 * them, and its atmospheres, each a palette slot for slot with its own. `npm run stages` installs
 * each one in src/art/<stage>/ (tools/sprites/stage-drawn.ts).
 */

import {
  STAGE_LAYERS,
  STAGE_SCALE,
  type Atmosphere,
  type StageDrift,
  type StageLayer,
  type Weather,
} from '../../../src/art/stage-layers.ts';
import type { IndexedImage, Rgba } from '../../sprites/png.ts';
import type { Canvas } from './canvas.ts';

/** A rectangle, in image pixels. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** An animation as the code draws it: each frame whole over its rectangle of its layer. */
export interface CodeProp {
  readonly name: string;
  readonly layer: StageLayer;
  /** Image pixels of its layer. */
  readonly rect: Rect;
  readonly timeline: readonly (readonly [frame: number, steps: number])[];
  /** Each frame, `rect` wide and high, frame 0 the still layer's own pixels there. */
  readonly frames: readonly IndexedImage[];
  /** It glides along its layer (src/art/stage-layers.ts `StageDrift`). */
  readonly drift?: StageDrift;
  /**
   * It lies over its layer, whatever the layer draws: a petal over a scene drawn by hand, its
   * still frame clear everywhere (the layer shows through). The usual props are cut from the
   * code's layer and kept only where a hand-drawn layer still draws them (stage-props.ts).
   */
  readonly overlay?: boolean;
  /** It is there only in this weather (src/art/stage-layers.ts `StageProp`). */
  readonly weather?: Weather;
}

export interface CodeStage {
  readonly layers: Readonly<Record<StageLayer, IndexedImage>>;
  readonly props: readonly CodeProp[];
}

/** An atmosphere of a stage and its palette, slot for slot with the base one's. */
export interface StageAtmosphere {
  readonly atmosphere: Atmosphere;
  readonly palette: readonly Rgba[];
}

/** A stage the code draws: its folder's name, its drawing, its atmospheres (the base one first). */
export interface CodeMap {
  readonly name: string;
  readonly draw: () => CodeStage;
  readonly atmospheres: readonly StageAtmosphere[];
  /**
   * Its layers are truecolor PNGs under art-src/<name>/ (not an indexed palette): the stage keeps
   * every color of the illustration, and `npm run stages` copies them as they are; its large
   * colors are measured on a coarse palette (tools/sprites/stage-drawn.ts `writeRgbaStage`).
   */
  readonly rgba?: boolean;
}

/** A canvas as an image in `palette`. */
export function imageOf(canvas: Canvas, palette: readonly Rgba[]): IndexedImage {
  return {
    width: canvas.width,
    height: canvas.height,
    pixels: canvas.pixels,
    colors: palette.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: palette.map(({ a }) => a),
  };
}

/** A layer's image size: STAGE_SCALE image pixels a world pixel. */
export function sizeOf(layer: StageLayer): { width: number; height: number } {
  const { width, height } = STAGE_LAYERS[layer];
  return { width: width * STAGE_SCALE, height: height * STAGE_SCALE };
}
