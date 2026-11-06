/**
 * The subject put on a sprite cell (docs/art/roto.md §3): scaled to the fighters' height and set
 * down with the soles on the game's anchor, so that what comes out of the tool is already in the
 * frame the game draws in — the one thing a generic pixel-art converter never does.
 *
 * Two rules come from the pipeline and are not options:
 *
 * - the last row of the feet sits on the anchor row (src/art/types.ts `ANCHOR`, row 248 of a
 *   256 px cell), and the centre of the feet on its column, in every frame;
 * - no half-transparent pixel (docs/art/aseprite.md): the resampling keeps the coverage to average
 *   the colours, then alpha is either on or off at half coverage.
 *
 * The resampling is by areas, in linear light, and only over the subject's pixels: an output pixel
 * is the exact average of the source it covers, with the background left out, so the silhouette's
 * edge never picks up the colour of the wall behind it. Where the source is smaller than the
 * target the areas fall under one pixel and it becomes a nearest copy, which is what pixel art
 * wants anyway — nothing is interpolated (D23).
 */

import { ANCHOR, CELL_SIZE } from '../../src/art/types.ts';
import type { Bitmap, Box } from './pixels.ts';
import { bitmap, byteOf, heightOf, linearOf } from './pixels.ts';
import type { Mask } from './silhouette.ts';
import { crownOf, soleOf } from './silhouette.ts';

/**
 * What the square is for. A fighter's cell stands the subject on the game's anchor; a portrait
 * frames its head and lets the shoulders run off the bottom, which is what a bust is.
 */
export type Frame = 'fighter' | 'portrait';

export interface Placement {
  readonly frame: Frame;
  /** The square's side in art pixels: `CELL_SIZE`, twice it for HD, or `PORTRAIT_SIZE`. */
  readonly cell: number;
  /** The subject's height on the square, in its pixels. */
  readonly height: number;
  /** The game's strips face right; a subject facing left is turned over. */
  readonly flip: boolean;
  readonly nudgeX: number;
  readonly nudgeY: number;
}

/**
 * The bust of the select screen (docs/art/aseprite.md): a square of 96 px, one frame, in the
 * fighter's palette slots, nothing owed to the anchor. `PORTRAIT_SIZE` in tools/sprites/drawn.ts
 * is where this number belongs, but that module reads the disk and cannot be loaded in a page;
 * a test holds the two together (tests/tools/roto.test.ts).
 */
export const PORTRAIT_SIZE = 96;

/**
 * Air left over the hair, as a share of the square. The game's own framing puts the head's middle
 * at 45 % of the square with the head filling about 58 % of it (tools/sprites/aseprite-template.ts
 * `portraitStart`), which leaves the crown near a sixth of the way down; a photographed head keeps
 * more hair than a drawn one, so a little less.
 */
const PORTRAIT_AIR = 0.06;

/**
 * The standing height of a fighter, measured on the one strip drawn by hand today
 * (art-src/feline/idle.png, frame 1: rows 92 to 248 of a 256 px cell). docs/art/prompt-sprites.md
 * §0 says 84 px of the world, which is 168 of art: that table is a target, this is the drawing.
 */
export const STANDING_HEIGHT = 157;

export const PLACEMENT_DEFAULTS: Placement = {
  frame: 'fighter',
  cell: CELL_SIZE * 2,
  height: STANDING_HEIGHT * 2,
  flip: false,
  nudgeX: 0,
  nudgeY: 0,
};

/** A bust fills its square and lets the shoulders go: the head is what the tile shows. */
export const PORTRAIT_DEFAULTS: Placement = {
  frame: 'portrait',
  cell: PORTRAIT_SIZE,
  height: PORTRAIT_SIZE,
  flip: false,
  nudgeX: 0,
  nudgeY: 0,
};

/** How far the subject went past each side of the cell, in cell pixels; 0 when it fits. */
export interface Overflow {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface Placed {
  readonly cell: Bitmap;
  /** 1 where the subject landed, so the next steps never read the empty corners. */
  readonly on: Uint8Array;
  /** Source pixels per cell pixel: under 1 the source is being reduced. */
  readonly scale: number;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly overflow: Overflow;
}

export function placeOnCell(image: Bitmap, mask: Mask, placement: Placement): Placed {
  const [source, silhouette] = placement.flip ? turnedOver(image, mask) : [image, mask];
  const side = placement.cell;
  const scale = placement.height / heightOf(silhouette.box);
  const unit = side / CELL_SIZE;
  // Where the subject is pinned, and onto what. A fighter stands the last row of its feet on the
  // row just under the anchor row, its feet centred on the anchor column; a bust hangs the top of
  // its head under the air, centred on the square.
  const held = placement.frame === 'fighter' ? soleOf(silhouette) : crownOf(silhouette);
  const heldX = held.x + 0.5;
  const heldY = placement.frame === 'fighter' ? silhouette.box.bottom + 1 : silhouette.box.top;
  const pinX = placement.frame === 'fighter' ? (ANCHOR.x + 0.5) * unit : side / 2;
  const pinY = placement.frame === 'fighter' ? (ANCHOR.y + 1) * unit : side * PORTRAIT_AIR;
  const sourceX = (cellEdge: number) => (cellEdge - pinX - placement.nudgeX) / scale + heldX;
  const sourceY = (cellEdge: number) => (cellEdge - pinY - placement.nudgeY) / scale + heldY;

  const cell = bitmap(side, side);
  const on = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) {
    const top = sourceY(y);
    const bottom = sourceY(y + 1);
    for (let x = 0; x < side; x++) {
      const left = sourceX(x);
      const right = sourceX(x + 1);
      let cover = 0;
      let covered = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy++) {
        const weightY = Math.min(sy + 1, bottom) - Math.max(sy, top);
        if (weightY <= 0 || sy < 0 || sy >= source.height) continue;
        for (let sx = Math.floor(left); sx < Math.ceil(right); sx++) {
          const weightX = Math.min(sx + 1, right) - Math.max(sx, left);
          if (weightX <= 0 || sx < 0 || sx >= source.width) continue;
          const weight = weightX * weightY;
          cover += weight;
          const pixel = sy * source.width + sx;
          if ((silhouette.on[pixel] ?? 0) === 0) continue;
          covered += weight;
          red += linearOf(source.data[pixel * 4] ?? 0) * weight;
          green += linearOf(source.data[pixel * 4 + 1] ?? 0) * weight;
          blue += linearOf(source.data[pixel * 4 + 2] ?? 0) * weight;
        }
      }
      // Half the pixel covered by the subject or more: it belongs to the sprite, fully opaque.
      if (cover <= 0 || covered * 2 < cover) continue;
      const at = (y * side + x) * 4;
      cell.data[at] = byteOf(red / covered);
      cell.data[at + 1] = byteOf(green / covered);
      cell.data[at + 2] = byteOf(blue / covered);
      cell.data[at + 3] = 255;
      on[y * side + x] = 1;
    }
  }
  return {
    cell,
    on,
    scale,
    anchor: { x: ANCHOR.x * unit, y: ANCHOR.y * unit },
    overflow: overflowOf(silhouette.box, { sourceX, sourceY, side }),
  };
}

function overflowOf(
  box: Box,
  frame: { sourceX: (edge: number) => number; sourceY: (edge: number) => number; side: number },
): Overflow {
  // The cell edges the subject's own box falls on, found by walking the mapping backwards.
  const cellX = (source: number) => invert(frame.sourceX, source, frame.side);
  const cellY = (source: number) => invert(frame.sourceY, source, frame.side);
  const left = cellX(box.left);
  const right = cellX(box.right + 1);
  const top = cellY(box.top);
  const bottom = cellY(box.bottom + 1);
  return {
    left: Math.max(0, Math.ceil(-left)),
    top: Math.max(0, Math.ceil(-top)),
    right: Math.max(0, Math.ceil(right - frame.side)),
    bottom: Math.max(0, Math.ceil(bottom - frame.side)),
  };
}

/** The cell edge a source edge lands on: the mapping is affine, so two probes give it. */
function invert(sourceAt: (edge: number) => number, source: number, side: number): number {
  const zero = sourceAt(0);
  const one = sourceAt(side);
  if (one === zero) return 0;
  return ((source - zero) / (one - zero)) * side;
}

/** The image and its mask mirrored, so a subject facing left faces right like every strip. */
function turnedOver(image: Bitmap, mask: Mask): [Bitmap, Mask] {
  const turned = bitmap(image.width, image.height);
  const on = new Uint8Array(image.width * image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const from = y * image.width + x;
      const to = y * image.width + (image.width - 1 - x);
      turned.data[to * 4] = image.data[from * 4] ?? 0;
      turned.data[to * 4 + 1] = image.data[from * 4 + 1] ?? 0;
      turned.data[to * 4 + 2] = image.data[from * 4 + 2] ?? 0;
      turned.data[to * 4 + 3] = image.data[from * 4 + 3] ?? 0;
      on[to] = mask.on[from] ?? 0;
    }
  }
  return [
    turned,
    {
      ...mask,
      on,
      box: {
        left: image.width - 1 - mask.box.right,
        right: image.width - 1 - mask.box.left,
        top: mask.box.top,
        bottom: mask.box.bottom,
      },
    },
  ];
}
