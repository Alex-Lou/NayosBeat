/**
 * The street in front of L'Entrepôt, at night (docs/art/decor-rue.md): the code's drawing of the
 * stage's three layers and of the animations laid on them. `npm run sprites` installs it
 * (tools/sprites/stage-drawn.ts), each layer replaced by one drawn by hand in Aseprite when there
 * is one. Every pixel comes from fixed seeds: the same street on every run.
 */

import { STAGE_LAYERS, STAGE_SCALE, type StageLayer } from '../../../src/art/stage-layers.ts';
import type { IndexedImage } from '../../sprites/png.ts';
import type { Canvas } from './canvas.ts';
import type { Rect } from './facade.ts';
import { drawFar } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { PALETTE } from './palette.ts';

/** The street's seed. Another draws another street (other towers, other tags, other stains). */
const SEED = 1;

/** An animation as the code draws it: each frame whole over its rectangle of its layer. */
export interface CodeProp {
  readonly name: string;
  readonly layer: StageLayer;
  /** Image pixels of its layer. */
  readonly rect: Rect;
  readonly timeline: readonly (readonly [frame: number, steps: number])[];
  /** Each frame, `rect` wide and high, frame 0 the still layer's own pixels there. */
  readonly frames: readonly IndexedImage[];
}

export interface CodeStage {
  readonly layers: Readonly<Record<StageLayer, IndexedImage>>;
  readonly props: readonly CodeProp[];
}

/** A canvas as an image in the street's palette. */
function imageOf(canvas: Canvas): IndexedImage {
  return {
    width: canvas.width,
    height: canvas.height,
    pixels: canvas.pixels,
    colors: PALETTE.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: PALETTE.map(({ a }) => a),
  };
}

function sizeOf(layer: StageLayer): { width: number; height: number } {
  const { width, height } = STAGE_LAYERS[layer];
  return { width: width * STAGE_SCALE, height: height * STAGE_SCALE };
}

let drawn: CodeStage | undefined;

/** The street as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawRue(): CodeStage {
  if (drawn) return drawn;
  const far = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    frames: Array.from({ length: frames }, (_, frame) => {
      const canvas = drawMid(mid.width, mid.height, (other) => (other === name ? frame : 0), rect);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height));
    }),
  }));
  drawn = {
    layers: {
      far: imageOf(drawFar(far.width, far.height, SEED)),
      mid: imageOf(drawMid(mid.width, mid.height)),
      floor: imageOf(drawFloor(floor.width, floor.height, SEED)),
    },
    props,
  };
  return drawn;
}
