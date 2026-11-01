/**
 * The dissolve of a big effect as it goes (docs/art/dissolution.md): instead of vanishing from
 * one frame to the next, what an effect stops showing breaks up, one world pixel at a time,
 * each in its turn, a rim of the fighter's energy on the edge that eats it, the pieces drifting
 * off (Nayo's sound rising away, Riff's shockwave scattering along the floor). Pure: pixels in,
 * pixels out; the engine side is FxDissolve.
 */

/** How the pieces go: up and away (Nayo's sound), out along the floor (Riff's shockwave). */
export type DissolveStyle = 'rise' | 'scatter';

/** A fighter's way to dissolve, by the shape of its effects: Nayo's slashes rise, Riff's claws scatter. */
export function dissolveStyleOf(shape: 'slash' | 'claw'): DissolveStyle {
  return shape === 'claw' ? 'scatter' : 'rise';
}

/** RGBA pixels of a rectangle, row by row (an ImageData's shape). */
export interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Pixels cut out of a cell (a frame's, in an atlas): where their top left corner is in it. */
export interface Cut {
  readonly pixels: Pixels;
  readonly x: number;
  readonly y: number;
}

/** A whole cell, as a cut. */
export function wholeCell(pixels: Pixels): Cut {
  return { pixels, x: 0, y: 0 };
}

/** Whether `cut` shows a pixel at `x`, `y` of its cell. */
function shows(cut: Cut, x: number, y: number): boolean {
  const column = x - cut.x;
  const row = y - cut.y;
  const { width, height, data } = cut.pixels;
  if (column < 0 || row < 0 || column >= width || row >= height) return false;
  return (data[(row * width + column) * 4 + 3] ?? 0) > 0;
}

/** The pixels a ghost dissolves: where each is in its cell, its color, the moment it goes. */
export interface Ghost {
  readonly count: number;
  readonly xs: Int16Array;
  readonly ys: Int16Array;
  /** 0xRRGGBBAA. */
  readonly colors: Uint32Array;
  /** When it is gone, 0 (at once) to 1 (last). */
  readonly ends: Float32Array;
}

/** Display frames a ghost takes to go. */
export const DISSOLVE_FRAMES = 20;
/** A pixel this close to its end burns in the energy color: the dissolve's rim. */
export const RIM = 0.12;
/** Fewer pixels than this going away is not worth a ghost. */
export const MIN_GHOST_PIXELS = 48;
/**
 * A frame of the same effects that keeps less than this share of the last one's pixels makes
 * what went dissolve: the effect fades out. A frame about as full (the Mégabasse's rings rolling
 * on) is animation, not a disappearance: no ghost, no smear.
 */
export const SHRINK = 0.5;

/** The pixels a frame shows. */
export function opaqueCount(pixels: Pixels): number {
  let count = 0;
  for (let i = 3; i < pixels.data.length; i += 4) if ((pixels.data[i] ?? 0) > 0) count++;
  return count;
}
/** Cell pixels per world pixel: a world pixel dissolves as one. */
const GRAIN = 2;
/** How far the pieces drift by the end, in cell pixels. */
const RISE = 16;
const SCATTER = 22;

/** 0 to 1, the same for the same world pixel. */
export function noiseAt(x: number, y: number): number {
  let h =
    Math.imul(Math.floor(x / GRAIN), 0x27d4eb2d) ^ Math.imul(Math.floor(y / GRAIN), 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The pixels of `from` that `to` no longer shows at the same place of the same cell (`to`
 * null: all of them), and when each goes: the top first as the sound rises away, the far ends
 * first as the shockwave scatters, the grain of the noise in between. Both are cut out of a
 * cell of `cell`'s size; the ghost's pixels are placed in the cell.
 */
export function vanishing(
  from: Cut,
  to: Cut | null,
  cell: { readonly width: number; readonly height: number },
  style: DissolveStyle,
  anchorX: number,
): Ghost {
  const { data } = from.pixels;
  const { width, height } = cell;
  const columns = from.pixels.width;
  // Where pixel `i` of the cut is in the cell.
  const xOf = (i: number): number => from.x + (i % columns);
  const yOf = (i: number): number => from.y + Math.floor(i / columns);
  // The pixels of the cut that go, row by row.
  const indices: number[] = [];
  for (let i = 0; i < columns * from.pixels.height; i++) {
    if ((data[i * 4 + 3] ?? 0) === 0) continue;
    if (to && shows(to, xOf(i), yOf(i))) continue;
    indices.push(i);
  }
  const count = indices.length;
  const ghost: Ghost = {
    count,
    xs: new Int16Array(count),
    ys: new Int16Array(count),
    colors: new Uint32Array(count),
    ends: new Float32Array(count),
  };
  const reach = Math.max(1, Math.max(anchorX, width - anchorX));
  indices.forEach((i, k) => {
    const x = xOf(i);
    const y = yOf(i);
    const p = i * 4;
    ghost.xs[k] = x;
    ghost.ys[k] = y;
    ghost.colors[k] =
      (((data[p] ?? 0) << 24) |
        ((data[p + 1] ?? 0) << 16) |
        ((data[p + 2] ?? 0) << 8) |
        (data[p + 3] ?? 0)) >>>
      0;
    // Measured on the world pixel (its first sprite pixel), so its 2 by 2 sprite pixels go together.
    const bx = x - (x % GRAIN);
    const by = y - (y % GRAIN);
    const order =
      style === 'rise' ? 1 - by / Math.max(1, height - 1) : Math.abs(bx - anchorX) / reach;
    ghost.ends[k] = 0.15 + 0.55 * noiseAt(x, y) + 0.3 * (1 - order);
  });
  return ghost;
}

/**
 * Paints `ghost` at `progress` (0: whole, 1: gone) into `out`, its cell at (`left`, `top`):
 * a pixel past its end is gone, one close to it burns in `rim` (never lighter than what it
 * takes over: no flash), the others drift `style`'s way (not if `still`). Returns the pixels
 * painted. `out` is cleared by the caller.
 */
export function paintGhost(
  ghost: Ghost,
  progress: number,
  style: DissolveStyle,
  rim: number,
  still: boolean,
  out: Pixels,
  left: number,
  top: number,
  anchorX: number,
): number {
  let painted = 0;
  const rimR = (rim >> 16) & 0xff;
  const rimG = (rim >> 8) & 0xff;
  const rimB = rim & 0xff;
  for (let k = 0; k < ghost.count; k++) {
    const end = ghost.ends[k] ?? 0;
    if (progress >= end) continue;
    const x = ghost.xs[k] ?? 0;
    const y = ghost.ys[k] ?? 0;
    // Even offsets: the grain's world pixels are the ends' (noiseAt groups 2 by 2 cell pixels).
    const grain = noiseAt(x + 102, y + 38);
    let dx = 0;
    let dy = 0;
    if (!still) {
      // Each world pixel drifts as one, the faster the nearer its end.
      const drift = progress * progress * (0.4 + grain);
      if (style === 'rise') {
        dy = -Math.round(RISE * drift);
        dx = Math.round(Math.sin(grain * 12.9) * 3 * progress);
      } else {
        dx = Math.round(Math.sign(x - anchorX) * SCATTER * drift);
        dy = -Math.round(6 * progress * grain);
      }
    }
    const ox = left + x + dx;
    const oy = top + y + dy;
    if (ox < 0 || oy < 0 || ox >= out.width || oy >= out.height) continue;
    const color = ghost.colors[k] ?? 0;
    let r = color >>> 24;
    let g = (color >>> 16) & 0xff;
    let b = (color >>> 8) & 0xff;
    const a = color & 0xff;
    if (end - progress < RIM) {
      // The rim: the energy, but never lighter than the pixel it burns.
      r = Math.min(r, rimR);
      g = Math.min(g, rimG);
      b = Math.min(b, rimB);
    }
    const p = (oy * out.width + ox) * 4;
    out.data[p] = r;
    out.data[p + 1] = g;
    out.data[p + 2] = b;
    out.data[p + 3] = a;
    painted++;
  }
  return painted;
}
