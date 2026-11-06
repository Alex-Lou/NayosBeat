/**
 * The chain that turns the placed subject into pixels (docs/art/roto.md §4). It is the one the
 * stages already use (docs/art/manifeste-pixel-art.md §2, tools/stage/sahel/adapt.ts), kept in
 * the same order and cut down to what a character needs:
 *
 *   Kuwahara → netteté → saturation → contour → palette → orphelins
 *
 * What a character needs that a stage does not: the outline is drawn on the silhouette's edge
 * (that dark 1 px line is most of what makes a sprite read against any background), and every
 * step works on the subject's pixels alone, so nothing bleeds in from the empty part of the cell.
 *
 * What is deliberately left out of this first version, and why:
 *
 * - **no dithering.** On a stage it only runs on gradients, on a character it is noise that
 *   swarms when the camera moves (docs/art/proprete.md). A sprite wants flat masses.
 * - **no palette slots.** The output is truecolour. Mapping onto a fighter's seven tones a
 *   material (tools/sprites/palette.ts) means telling a jacket's outline from a trouser's, which
 *   is a segmentation problem this tool does not solve: the result is an under-layer to draw over,
 *   not a strip the game can load.
 * - **median cut rather than the superpixel method.** Gerstner et al., *Pixelated Image
 *   Abstraction* (NPAR 2012), optimise the segmentation and the palette together, which beats a
 *   downscale followed by a quantisation; the parameters are written down in docs/art/roto.md §6
 *   for the day this is worth doing. Median cut is already here and already tested
 *   (tools/sprites/quantize.ts).
 */

import type { Rgba } from '../sprites/png.ts';
import { quantizeRgba } from '../sprites/quantize.ts';
import { fromLab, toLab } from '../stage/kit/unify.ts';
import type { Bitmap } from './pixels.ts';
import { byteOf, copyOf, linearOf } from './pixels.ts';

export interface PixelizeOptions {
  /** Kuwahara's radius, in cell pixels; 0 leaves the brush strokes alone. */
  readonly kuwahara: number;
  /** How far a pixel moves away from the average of its neighbours; 0 is off. */
  readonly sharpen: number;
  /** Lab a and b multiplied by this; 1 is off. The paper's own value is 1.1. */
  readonly saturation: number;
  /** The share of its lightness an edge pixel keeps; 1 draws no outline. */
  readonly outline: number;
  /** Colours in the palette, the transparent one apart; 0 keeps every colour. */
  readonly colors: number;
  /** Passes that give a pixel alone of its colour the colour of its neighbours. */
  readonly orphans: number;
}

/**
 * Measured on a strip we already have, not guessed: art-src/feline/idle.png blown up on a wall and
 * put back through the chain, head to head with the drawing (docs/art/roto.md §5). Kuwahara is off
 * by default — on a stage it firms up brushwork, on a character at this size it swallows the eye
 * and the ear, which are two pixels each. It stays a slider, for a grainy photo, where it earns
 * its place. One pass of orphans is enough; two start eating lone highlights too.
 */
export const PIXELIZE_DEFAULTS: PixelizeOptions = {
  kuwahara: 0,
  sharpen: 0.7,
  saturation: 1.1,
  outline: 0.7,
  colors: 32,
  orphans: 1,
};

export interface Pixelized {
  readonly cell: Bitmap;
  readonly palette: readonly Rgba[];
  /** Colours actually used, which can be under the palette's size on a small subject. */
  readonly colors: number;
}

export function pixelize(placed: Bitmap, on: Uint8Array, options: PixelizeOptions): Pixelized {
  let cell = copyOf(placed);
  if (options.kuwahara > 0) cell = kuwahara(cell, on, options.kuwahara);
  if (options.sharpen > 0) cell = sharpen(cell, on, options.sharpen);
  if (options.saturation !== 1) saturate(cell, on, options.saturation);
  const edge = edgesOf(cell, on);
  if (options.outline < 1) outline(cell, edge, options.outline);
  if (options.colors <= 0) return { cell, palette: [], colors: countColors(cell, on) };
  const { palette, slots } = quantizeRgba(cell.data, options.colors);
  for (let pass = 0; pass < options.orphans; pass++)
    dropOrphans(cell.width, cell.height, slots, on, edge);
  paint(cell, on, slots, palette);
  return { cell, palette, colors: countColors(cell, on) };
}

/**
 * Each pixel takes the average of its calmest quadrant: masses become firm and the brush strokes
 * go, where a blur would only soften them. The radius is the stages' lesson — at 1 the contours
 * crumble (docs/art/manifeste-pixel-art.md §2).
 */
function kuwahara(cell: Bitmap, on: Uint8Array, radius: number): Bitmap {
  const out = copyOf(cell);
  const { width, height } = cell;
  const quadrants: readonly (readonly [number, number])[] = [
    [-radius, -radius],
    [0, -radius],
    [-radius, 0],
    [0, 0],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((on[y * width + x] ?? 0) === 0) continue;
      let bestVariance = Infinity;
      let best: readonly [number, number, number] | undefined;
      for (const [offsetX, offsetY] of quadrants) {
        let count = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        let light = 0;
        let lightSquared = 0;
        for (let dy = 0; dy <= radius; dy++) {
          const sy = y + offsetY + dy;
          if (sy < 0 || sy >= height) continue;
          for (let dx = 0; dx <= radius; dx++) {
            const sx = x + offsetX + dx;
            if (sx < 0 || sx >= width) continue;
            const pixel = sy * width + sx;
            if ((on[pixel] ?? 0) === 0) continue;
            const r = linearOf(cell.data[pixel * 4] ?? 0);
            const g = linearOf(cell.data[pixel * 4 + 1] ?? 0);
            const b = linearOf(cell.data[pixel * 4 + 2] ?? 0);
            const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            count++;
            red += r;
            green += g;
            blue += b;
            light += value;
            lightSquared += value * value;
          }
        }
        if (count === 0) continue;
        const variance = lightSquared / count - (light / count) ** 2;
        if (variance >= bestVariance) continue;
        bestVariance = variance;
        best = [red / count, green / count, blue / count];
      }
      if (!best) continue;
      const at = (y * width + x) * 4;
      out.data[at] = byteOf(best[0]);
      out.data[at + 1] = byteOf(best[1]);
      out.data[at + 2] = byteOf(best[2]);
    }
  }
  return out;
}

/** The edges hardened again, as the stages do after Kuwahara: ×0.7 there, and here by default. */
function sharpen(cell: Bitmap, on: Uint8Array, amount: number): Bitmap {
  const out = copyOf(cell);
  const { width, height } = cell;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((on[y * width + x] ?? 0) === 0) continue;
      const channels = [0, 0, 0];
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sx = x + dx;
          const sy = y + dy;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          const pixel = sy * width + sx;
          if ((on[pixel] ?? 0) === 0) continue;
          count++;
          for (let channel = 0; channel < 3; channel++) {
            channels[channel] =
              (channels[channel] ?? 0) + linearOf(cell.data[pixel * 4 + channel] ?? 0);
          }
        }
      }
      if (count === 0) continue;
      const at = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const own = linearOf(cell.data[at + channel] ?? 0);
        const mean = (channels[channel] ?? 0) / count;
        out.data[at + channel] = byteOf(Math.max(0, Math.min(1, own + amount * (own - mean))));
      }
    }
  }
  return out;
}

/** Lab a and b pushed out: the saturation step pixel artists do by hand (Gerstner et al. §4.4). */
function saturate(cell: Bitmap, on: Uint8Array, beta: number): void {
  for (let pixel = 0; pixel < on.length; pixel++) {
    if ((on[pixel] ?? 0) === 0) continue;
    const at = pixel * 4;
    const [light, a, b] = toLab(cell.data[at] ?? 0, cell.data[at + 1] ?? 0, cell.data[at + 2] ?? 0);
    const [red, green, blue] = fromLab(light, a * beta, b * beta);
    cell.data[at] = red;
    cell.data[at + 1] = green;
    cell.data[at + 2] = blue;
  }
}

/** The subject's pixels that touch the empty part of the cell, or its border. */
function edgesOf(cell: Bitmap, on: Uint8Array): Uint8Array {
  const { width, height } = cell;
  const edge = new Uint8Array(on.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if ((on[pixel] ?? 0) === 0) continue;
      // Only where the subject meets the empty cell. The square's own border is a crop, not a
      // silhouette: a bust that runs off the bottom must bleed off it, not be underlined.
      const open =
        (x > 0 && (on[pixel - 1] ?? 0) === 0) ||
        (x < width - 1 && (on[pixel + 1] ?? 0) === 0) ||
        (y > 0 && (on[pixel - width] ?? 0) === 0) ||
        (y < height - 1 && (on[pixel + width] ?? 0) === 0);
      if (open) edge[pixel] = 1;
    }
  }
  return edge;
}

/**
 * The dark 1 px line on the silhouette, in the colour it surrounds: the lightness cut, the hue
 * kept, as the stages draw theirs (docs/art/manifeste-pixel-art.md §2, 65 % to 75 %). Drawn before
 * the palette is chosen, so median cut spends a slot on it instead of rounding it away.
 */
function outline(cell: Bitmap, edge: Uint8Array, keep: number): void {
  for (let pixel = 0; pixel < edge.length; pixel++) {
    if ((edge[pixel] ?? 0) === 0) continue;
    const at = pixel * 4;
    const [light, a, b] = toLab(cell.data[at] ?? 0, cell.data[at + 1] ?? 0, cell.data[at + 2] ?? 0);
    const [red, green, blue] = fromLab(light * keep, a, b);
    cell.data[at] = red;
    cell.data[at + 1] = green;
    cell.data[at + 2] = blue;
  }
}

/**
 * A pixel alone of its colour among its four neighbours takes the one they agree on: firm masses,
 * like the sprites (the stages run two passes of this, hence the default).
 */
function dropOrphans(
  width: number,
  height: number,
  slots: Uint8Array,
  on: Uint8Array,
  edge: Uint8Array,
): void {
  const before = new Uint8Array(slots);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if ((on[pixel] ?? 0) === 0 || (edge[pixel] ?? 0) === 1) continue;
      const own = before[pixel] ?? 0;
      const neighbours: number[] = [];
      if (x > 0) neighbours.push(before[pixel - 1] ?? 0);
      if (x < width - 1) neighbours.push(before[pixel + 1] ?? 0);
      if (y > 0) neighbours.push(before[pixel - width] ?? 0);
      if (y < height - 1) neighbours.push(before[pixel + width] ?? 0);
      const kin = neighbours.filter((slot) => slot === own).length;
      if (kin > 0) continue;
      const counts = new Map<number, number>();
      for (const slot of neighbours) {
        if (slot === 0) continue;
        counts.set(slot, (counts.get(slot) ?? 0) + 1);
      }
      let best = own;
      let most = 0;
      for (const [slot, count] of counts) {
        if (count <= most) continue;
        most = count;
        best = slot;
      }
      slots[pixel] = best;
    }
  }
}

/** The palette written back into the cell, so the page shows what the slots mean. */
function paint(cell: Bitmap, on: Uint8Array, slots: Uint8Array, palette: readonly Rgba[]): void {
  for (let pixel = 0; pixel < on.length; pixel++) {
    if ((on[pixel] ?? 0) === 0) continue;
    const color = palette[slots[pixel] ?? 0];
    if (!color) continue;
    cell.data[pixel * 4] = color.r;
    cell.data[pixel * 4 + 1] = color.g;
    cell.data[pixel * 4 + 2] = color.b;
  }
}

function countColors(cell: Bitmap, on: Uint8Array): number {
  const seen = new Set<number>();
  for (let pixel = 0; pixel < on.length; pixel++) {
    if ((on[pixel] ?? 0) === 0) continue;
    seen.add(
      ((cell.data[pixel * 4] ?? 0) << 16) |
        ((cell.data[pixel * 4 + 1] ?? 0) << 8) |
        (cell.data[pixel * 4 + 2] ?? 0),
    );
  }
  return seen.size;
}
