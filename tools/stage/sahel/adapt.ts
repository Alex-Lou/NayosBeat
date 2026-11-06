/**
 * Turns the Sahel Sunset illustration (art-src/sahel/source/sahel.png) into pixel art at the
 * fighters' own grain, in three real planes (docs/art/decor-sahel.md §2):
 *
 * - `mid`, the street (buildings, crowd, vehicles, wires), cut out of its sky, at the scale the
 *   middle layer scrolls at;
 * - `far`, the sky and the sun alone, the street painted out behind them so the parallax never
 *   uncovers a hole;
 * - `floor`, the dirt road under the fighters, a seamless strip taken from the illustration's
 *   foreground.
 *
 * Each plane goes through the same pixel-art pass: an area resample (no aliasing), an
 * edge-preserving flattening (Kuwahara), a k-means palette in Lab, no dither where the planes are
 * flat, the orphan pixels removed, and a 1 px contour where the street meets the sky, as the
 * fighters have theirs.
 */

import { writeFile } from 'node:fs/promises';
import { readTruecolor } from '../../sprites/truecolor.ts';
import { encodeIndexedPng, type Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import { unifyPalette } from '../kit/unify.ts';
import { FLOOR_PALETTE, paintEarth } from './floor.ts';

const SOURCE = new URL('../../../art-src/sahel/source/sahel.png', import.meta.url);
const OUT = (name: string) => new URL(`../../../art-src/sahel/${name}.png`, import.meta.url);

/** Image pixels of each layer (src/art/stage-layers.ts, × STAGE_SCALE). */
const FAR = { width: 1200, height: 540 } as const;
const MID = { width: 1440, height: 540 } as const;

/** The middle layer's scale, source pixels to image pixels: the illustration's width fills it. */
const MID_SCALE = MID.width / 1672;
/** The source row the fighters' feet stand on (the floor's top edge, image row 460). */
const GROUND_SOURCE = 600;
const MID_TOP_SOURCE = GROUND_SOURCE - 460 / MID_SCALE;
/** The far layer's scale: the whole illustration's width over it. */
const FAR_SCALE = FAR.width / 1672;

/** Colours per plane: the fighters use about 70, the stage stays below and calmer. */
const COLORS = { far: 18, mid: 32 } as const;
/** How hard the painting's softened edges are pushed back (`sharpen`). */
const SHARP = 1.6;
/** The lightness step (Lab L) over which the darker side of an edge gets its contour. */
const EDGE = 13;
/** The street's earth is drawn, not painted, from this row down (behind the fighters' feet). */
const EARTH_FROM = 404;
/** The largest crumb of painting left inside the drawn earth that the earth swallows. */
const CRUMB = 120;

interface Image {
  readonly width: number;
  readonly height: number;
  /** RGBA. */
  readonly data: Float32Array;
}

function imageOf(width: number, height: number): Image {
  return { width, height, data: new Float32Array(width * height * 4) };
}

// ── Colour ──────────────────────────────────────────────────────────────────────────────────

function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function gamma(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

type Lab = [number, number, number];

function toLab(r: number, g: number, b: number): Lab {
  const R = linear(r);
  const G = linear(g);
  const B = linear(b);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function fromLab([L, A, B]: Lab): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + A / 500;
  const fz = fy - B / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  return [
    gamma(3.2406 * x - 1.5372 * y - 0.4986 * z),
    gamma(-0.9689 * x + 1.8758 * y + 0.0415 * z),
    gamma(0.0557 * x - 0.204 * y + 1.057 * z),
  ];
}

function distance(a: Lab, b: Lab): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

// ── Sampling ────────────────────────────────────────────────────────────────────────────────

/** The source's rectangle `sx, sy, sw × sh` averaged into `width × height` (area resample). */
function resample(
  source: { width: number; height: number; data: Uint8ClampedArray },
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  width: number,
  height: number,
): Image {
  const out = imageOf(width, height);
  const fx = sw / width;
  const fy = sh / height;
  for (let y = 0; y < height; y++) {
    const y0 = sy + y * fy;
    const y1 = y0 + fy;
    for (let x = 0; x < width; x++) {
      const x0 = sx + x * fx;
      const x1 = x0 + fx;
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        const wy = Math.min(py + 1, y1) - Math.max(py, y0);
        const cy = Math.max(0, Math.min(source.height - 1, py));
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          const wx = Math.min(px + 1, x1) - Math.max(px, x0);
          const cx = ((px % source.width) + source.width) % source.width;
          const at = (cy * source.width + cx) * 4;
          const w = wx * wy;
          r += linear(source.data[at] ?? 0) * w;
          g += linear(source.data[at + 1] ?? 0) * w;
          b += linear(source.data[at + 2] ?? 0) * w;
          weight += w;
        }
      }
      const at = (y * width + x) * 4;
      out.data[at] = gamma(r / weight);
      out.data[at + 1] = gamma(g / weight);
      out.data[at + 2] = gamma(b / weight);
      out.data[at + 3] = 255;
    }
  }
  return out;
}

/** Kuwahara: each pixel takes the mean of its calmest quadrant, so planes flatten, edges stay. */
function kuwahara(image: Image, radius: number): Image {
  const { width, height, data } = image;
  const out = imageOf(width, height);
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    lum[i] =
      0.299 * (data[i * 4] ?? 0) + 0.587 * (data[i * 4 + 1] ?? 0) + 0.114 * (data[i * 4 + 2] ?? 0);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = Infinity;
      let mean: [number, number, number] = [0, 0, 0];
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        let n = 0;
        let s = 0;
        let s2 = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let j = 0; j <= radius; j++) {
          const py = Math.max(0, Math.min(height - 1, y + dy * j));
          for (let i = 0; i <= radius; i++) {
            const px = Math.max(0, Math.min(width - 1, x + dx * i));
            const k = py * width + px;
            const l = lum[k] ?? 0;
            s += l;
            s2 += l * l;
            r += data[k * 4] ?? 0;
            g += data[k * 4 + 1] ?? 0;
            b += data[k * 4 + 2] ?? 0;
            n++;
          }
        }
        const variance = s2 / n - (s / n) ** 2;
        if (variance < best) {
          best = variance;
          mean = [r / n, g / n, b / n];
        }
      }
      const at = (y * width + x) * 4;
      out.data[at] = mean[0];
      out.data[at + 1] = mean[1];
      out.data[at + 2] = mean[2];
      out.data[at + 3] = data[at + 3] ?? 255;
    }
  }
  return out;
}

/**
 * An unsharp mask: each pixel pushed away from its 3 × 3 neighbourhood's mean by `amount`, so
 * the edges the painting softened come back as hard as the fighters' own.
 */
function sharpen(image: Image, amount: number): Image {
  const { width, height, data } = image;
  const out = imageOf(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const py = Math.max(0, Math.min(height - 1, y + dy));
          for (let dx = -1; dx <= 1; dx++) {
            const px = Math.max(0, Math.min(width - 1, x + dx));
            sum += data[(py * width + px) * 4 + c] ?? 0;
          }
        }
        const here = data[at + c] ?? 0;
        out.data[at + c] = Math.max(0, Math.min(255, here + (here - sum / 9) * amount));
      }
      out.data[at + 3] = data[at + 3] ?? 255;
    }
  }
  return out;
}

/** Saturation and contrast around a pivot, per plane, so the stage sits under the fighters. */
function grade(image: Image, saturation: number, contrast: number, shade: number): void {
  const { data } = image;
  for (let at = 0; at < data.length; at += 4) {
    const [L, A, B] = toLab(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0);
    const [r, g, b] = fromLab([(L - 50) * contrast + 50 * shade, A * saturation, B * saturation]);
    data[at] = r;
    data[at + 1] = g;
    data[at + 2] = b;
  }
}

// ── The sky ─────────────────────────────────────────────────────────────────────────────────

/**
 * The sky's pixels: flooded from the top edge across small colour steps only, so it stops at
 * the roofs, the wires and the leaves. Then the specks it left are cleaned.
 */
function skyMask(image: Image): Uint8Array {
  const { width, height, data } = image;
  const lab: Lab[] = [];
  for (let i = 0; i < width * height; i++) {
    lab.push(toLab(data[i * 4] ?? 0, data[i * 4 + 1] ?? 0, data[i * 4 + 2] ?? 0));
  }
  const reference = lab[Math.floor(width * 0.55)] ?? [60, 20, 10];
  /** The dusk sky's colours: never as dark as a roof, never as grey as a whitewashed wall. */
  const skyLike = (there: Lab): boolean => there[0] >= 34 && Math.hypot(there[1], there[2]) >= 15;
  const sky = new Uint8Array(width * height);
  const queue: number[] = [];
  // Seeds along the top edge, between the left building's roof and the right lamp post: the
  // whitewashed wall that reaches the top-left corner is not sky.
  for (let x = Math.floor(width * 0.25); x < Math.floor(width * 0.9); x++) {
    const here = lab[x] ?? reference;
    if (distance(here, reference) < 22 ** 2 && Math.hypot(here[1], here[2]) >= 15) {
      sky[x] = 1;
      queue.push(x);
    }
  }
  /** Sky-like at n, seen from `here`: a calm step, nothing as dark as a roof. */
  const calm = (here: Lab, n: number): boolean => {
    const there = lab[n] ?? reference;
    return distance(here, there) <= 3.2 ** 2 && skyLike(there);
  };
  while (queue.length > 0) {
    const k = queue.pop() ?? 0;
    const x = k % width;
    const y = Math.floor(k / width);
    const here = lab[k] ?? reference;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      // The next pixel, or the sky past a wire or a twig up to 4 px thick: the line stays
      // opaque (it belongs to the street), the sky beyond is still sky.
      for (let jump = 1; jump <= 5; jump++) {
        const nx = x + dx * jump;
        const ny = y + dy * jump;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) break;
        const n = ny * width + nx;
        if (sky[n]) break;
        const there = lab[n] ?? reference;
        const ok = jump === 1 ? calm(here, n) : distance(here, there) <= 7 ** 2 && there[0] >= 34;
        if (ok) {
          sky[n] = 1;
          queue.push(n);
          break;
        }
      }
    }
  }
  // Specks: a lone opaque pixel in the sky joins it; a lone sky pixel in the street leaves it.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const k = y * width + x;
        let around = 0;
        for (const n of [k - 1, k + 1, k - width, k + width]) around += sky[n] ?? 0;
        if (!sky[k] && around >= 3) sky[k] = 1;
        else if (sky[k] && around <= 1) sky[k] = 0;
      }
    }
  }
  // Islands: a patch of street smaller than `ISLAND` pixels, alone in the sky (a cloud's dark
  // edge, a bird), goes back to the sky; the wires stay, joined to their poles.
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (sky[start] || seen[start]) continue;
    const island: number[] = [start];
    seen[start] = 1;
    for (let i = 0; i < island.length; i++) {
      const k = island[i] ?? 0;
      const x = k % width;
      for (const n of [x > 0 ? k - 1 : -1, x < width - 1 ? k + 1 : -1, k - width, k + width]) {
        if (n < 0 || n >= width * height || sky[n] || seen[n]) continue;
        seen[n] = 1;
        island.push(n);
      }
      if (island.length > ISLAND) break;
    }
    if (island.length <= ISLAND) for (const k of island) sky[k] = 1;
  }
  // Pockets: the jumps over the wires leave a pixel of « sky » here and there inside the
  // street; any patch of sky smaller than `POCKET` pixels is street again.
  const visited = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (!sky[start] || visited[start]) continue;
    const pocket: number[] = [start];
    visited[start] = 1;
    for (let i = 0; i < pocket.length; i++) {
      const k = pocket[i] ?? 0;
      const x = k % width;
      for (const n of [x > 0 ? k - 1 : -1, x < width - 1 ? k + 1 : -1, k - width, k + width]) {
        if (n < 0 || n >= width * height || !sky[n] || visited[n]) continue;
        visited[n] = 1;
        pocket.push(n);
      }
    }
    if (pocket.length < POCKET) for (const k of pocket) sky[k] = 0;
  }
  return sky;
}

/** The smallest patch of sky kept as sky (tools/stage/sahel/adapt.ts `skyMask`). */
const POCKET = 400;

/** The largest patch of street the sky swallows back (tools/stage/sahel/adapt.ts `skyMask`). */
const ISLAND = 60;

/**
 * Paints the street out of the far layer (a pull-push fill): the sky's own colours are averaged
 * down a pyramid and pulled back up into every hidden pixel, so the parallax only ever uncovers
 * sky, never a hole or a streak.
 */
function paintOut(image: Image, sky: Uint8Array): void {
  interface Level {
    readonly width: number;
    readonly height: number;
    readonly rgb: Float32Array;
    readonly weight: Float32Array;
  }
  const { width, height, data } = image;
  const base: Level = {
    width,
    height,
    rgb: new Float32Array(width * height * 3),
    weight: new Float32Array(width * height),
  };
  for (let k = 0; k < width * height; k++) {
    if (!sky[k]) continue;
    base.weight[k] = 1;
    for (let c = 0; c < 3; c++) base.rgb[k * 3 + c] = data[k * 4 + c] ?? 0;
  }
  const levels: Level[] = [base];
  while ((levels.at(-1)?.width ?? 1) > 2) {
    const up = levels.at(-1) ?? base;
    const w = Math.ceil(up.width / 2);
    const h = Math.ceil(up.height / 2);
    const level: Level = {
      width: w,
      height: h,
      rgb: new Float32Array(w * h * 3),
      weight: new Float32Array(w * h),
    };
    for (let y = 0; y < up.height; y++) {
      for (let x = 0; x < up.width; x++) {
        const from = y * up.width + x;
        const to = Math.floor(y / 2) * w + Math.floor(x / 2);
        const weight = up.weight[from] ?? 0;
        level.weight[to] = (level.weight[to] ?? 0) + weight;
        for (let c = 0; c < 3; c++) {
          level.rgb[to * 3 + c] =
            (level.rgb[to * 3 + c] ?? 0) + (up.rgb[from * 3 + c] ?? 0) * weight;
        }
      }
    }
    for (let k = 0; k < w * h; k++) {
      const weight = level.weight[k] ?? 0;
      if (weight > 0)
        for (let c = 0; c < 3; c++) level.rgb[k * 3 + c] = (level.rgb[k * 3 + c] ?? 0) / weight;
      level.weight[k] = Math.min(1, weight);
    }
    levels.push(level);
  }
  for (let i = levels.length - 2; i >= 0; i--) {
    const level = levels[i] ?? base;
    const coarse = levels[i + 1] ?? base;
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const k = y * level.width + x;
        const weight = level.weight[k] ?? 0;
        if (weight >= 1) continue;
        const cx = Math.min(coarse.width - 1, x / 2);
        const cy = Math.min(coarse.height - 1, y / 2);
        const x0 = Math.floor(cx);
        const y0 = Math.floor(cy);
        const x1 = Math.min(coarse.width - 1, x0 + 1);
        const y1 = Math.min(coarse.height - 1, y0 + 1);
        const fx = cx - x0;
        const fy = cy - y0;
        for (let c = 0; c < 3; c++) {
          const at = (px: number, py: number) => coarse.rgb[(py * coarse.width + px) * 3 + c] ?? 0;
          const value =
            (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) +
            (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
          level.rgb[k * 3 + c] = (level.rgb[k * 3 + c] ?? 0) * weight + value * (1 - weight);
        }
        level.weight[k] = 1;
      }
    }
  }
  // The sky is banded by rows: each hidden pixel leans on its row's own sky colour, so no
  // ghost of a roof is left in the gradient.
  const rows: ([number, number, number] | undefined)[] = [];
  for (let y = 0; y < height; y++) {
    const reds: number[] = [];
    const greens: number[] = [];
    const blues: number[] = [];
    for (let dy = -3; dy <= 3; dy++) {
      const py = y + dy;
      if (py < 0 || py >= height) continue;
      for (let x = 0; x < width; x += 2) {
        const k = py * width + x;
        if (!sky[k]) continue;
        reds.push(data[k * 4] ?? 0);
        greens.push(data[k * 4 + 1] ?? 0);
        blues.push(data[k * 4 + 2] ?? 0);
      }
    }
    if (reds.length < 12) {
      rows.push(undefined);
      continue;
    }
    const middle = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1] ?? 0;
    rows.push([middle(reds), middle(greens), middle(blues)]);
  }
  let last: [number, number, number] = [222, 128, 112];
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row) last = row;
    else rows[y] = last;
  }
  for (let k = 0; k < width * height; k++) {
    if (sky[k]) continue;
    const row = rows[Math.floor(k / width)] ?? last;
    for (let c = 0; c < 3; c++) {
      data[k * 4 + c] = (row[c] ?? 0) * 0.7 + (base.rgb[k * 3 + c] ?? 0) * 0.3;
    }
  }
}

// ── The palette ─────────────────────────────────────────────────────────────────────────────

/** k-means in Lab over the opaque pixels, seeded on a spread of their lightness. */
function palette(image: Image, mask: Uint8Array | undefined, count: number): Lab[] {
  const samples: Lab[] = [];
  const { width, height, data } = image;
  const step = Math.max(1, Math.floor((width * height) / 90_000));
  for (let k = 0; k < width * height; k += step) {
    if (mask && !mask[k]) continue;
    samples.push(toLab(data[k * 4] ?? 0, data[k * 4 + 1] ?? 0, data[k * 4 + 2] ?? 0));
  }
  samples.sort((a, b) => a[0] - b[0]);
  let centres: Lab[] = Array.from(
    { length: count },
    (_, i) => [...(samples[Math.floor(((i + 0.5) / count) * samples.length)] ?? [50, 0, 0])] as Lab,
  );
  for (let round = 0; round < 12; round++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const sample of samples) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = distance(sample, centres[c] ?? sample);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const sum = sums[best] ?? [0, 0, 0, 0];
      sum[0] = (sum[0] ?? 0) + sample[0];
      sum[1] = (sum[1] ?? 0) + sample[1];
      sum[2] = (sum[2] ?? 0) + sample[2];
      sum[3] = (sum[3] ?? 0) + 1;
    }
    centres = centres.map((centre, c) => {
      const sum = sums[c] ?? [0, 0, 0, 0];
      const n = sum[3] ?? 0;
      return n > 0 ? [(sum[0] ?? 0) / n, (sum[1] ?? 0) / n, (sum[2] ?? 0) / n] : centre;
    });
  }
  return centres;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Each opaque pixel to its nearest colour (slot 1 on); `dither`, a light Bayer bias in L. */
function index(
  image: Image,
  mask: Uint8Array | undefined,
  colors: Lab[],
  dither: number,
): Uint8Array {
  const { width, height, data } = image;
  const slots = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = y * width + x;
      if (mask && !mask[k]) continue;
      const lab = toLab(data[k * 4] ?? 0, data[k * 4 + 1] ?? 0, data[k * 4 + 2] ?? 0);
      lab[0] += ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) / 16 - 0.5) * dither;
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < colors.length; c++) {
        const d = distance(lab, colors[c] ?? lab);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      slots[k] = best + 1;
    }
  }
  return slots;
}

/** A pixel alone in its colour takes the colour most of its neighbours have: clean clusters. */
function cleanOrphans(slots: Uint8Array, width: number, height: number, passes: number): void {
  for (let pass = 0; pass < passes; pass++) {
    const copy = slots.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const k = y * width + x;
        const here = copy[k] ?? 0;
        if (here === 0) continue;
        const sides = [copy[k - 1], copy[k + 1], copy[k - width], copy[k + width]];
        if (sides.includes(here)) continue;
        const votes = new Map<number, number>();
        for (const n of [
          k - 1,
          k + 1,
          k - width,
          k + width,
          k - width - 1,
          k - width + 1,
          k + width - 1,
          k + width + 1,
        ]) {
          const s = copy[n] ?? 0;
          if (s !== 0) votes.set(s, (votes.get(s) ?? 0) + 1);
        }
        let best = here;
        let most = 0;
        for (const [s, v] of votes) {
          if (v > most) {
            most = v;
            best = s;
          }
        }
        slots[k] = best;
      }
    }
  }
}

/** The palette's darkest colour near `lab`'s hue, for contours. */
function darkerOf(colors: Lab[], slot: number, depth: number): number {
  const base = colors[slot - 1] ?? [20, 0, 0];
  const target: Lab = [base[0] * depth, base[1] * 0.8, base[2] * 0.8];
  let best = slot;
  let bestD = Infinity;
  for (let c = 0; c < colors.length; c++) {
    const candidate = colors[c] ?? target;
    if (candidate[0] >= base[0]) continue;
    const d = distance(candidate, target);
    if (d < bestD) {
      bestD = d;
      best = c + 1;
    }
  }
  return best;
}

/**
 * The street's contour: a dark pixel where it meets the sky, as the fighters have theirs; and,
 * inside, the darker side of a strong lightness edge, so the shapes read at a glance.
 */
function contour(slots: Uint8Array, width: number, height: number, colors: Lab[]): void {
  const copy = slots.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = y * width + x;
      const here = copy[k] ?? 0;
      if (here === 0) continue;
      const open =
        (x > 0 && copy[k - 1] === 0) ||
        (x < width - 1 && copy[k + 1] === 0) ||
        (y > 0 && copy[k - width] === 0);
      if (open) {
        slots[k] = darkerOf(colors, here, 0.55);
        continue;
      }
      const L = colors[here - 1]?.[0] ?? 0;
      const right = colors[(copy[k + 1] ?? 0) - 1]?.[0] ?? L;
      const down = colors[(copy[k + width] ?? 0) - 1]?.[0] ?? L;
      if ((x < width - 1 && right - L > EDGE) || (y < height - 1 && down - L > EDGE)) {
        slots[k] = darkerOf(colors, here, 0.6);
      }
    }
  }
}

/** Bare earth in the painting: the road's terracotta, neither the tyres' black nor the crates' wood. */
function earthLike(image: Image, k: number): boolean {
  const [L, A, B] = toLab(
    image.data[k * 4] ?? 0,
    image.data[k * 4 + 1] ?? 0,
    image.data[k * 4 + 2] ?? 0,
  );
  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  const chroma = Math.hypot(A, B);
  // The terracotta, or the grey of the dust and the puddles' dull patches (not the tyres' black).
  return (L >= 26 && L <= 66 && chroma >= 16 && hue >= 22 && hue <= 62) || (L >= 31 && chroma < 18);
}

/** A plane's palette, graded toward the fighters' light (kit/unify.ts): one shadow for all. */
function rgbaOf(colors: Lab[]): Rgba[] {
  return unifyPalette([
    { r: 0, g: 0, b: 0, a: 0 },
    ...colors.map((lab) => {
      const [r, g, b] = fromLab(lab);
      return { r, g, b, a: 255 };
    }),
  ]);
}

async function write(
  name: string,
  width: number,
  height: number,
  slots: Uint8Array,
  colors: Lab[],
) {
  await writeFile(OUT(name), await encodeIndexedPng(width, height, slots, rgbaOf(colors)));
}

// ── The planes ──────────────────────────────────────────────────────────────────────────────

const source = await readTruecolor(SOURCE);

// The street, at the middle layer's scale, cut out of its sky.
const midSource = resample(
  source,
  0,
  MID_TOP_SOURCE,
  source.width,
  MID.height / MID_SCALE,
  MID.width,
  MID.height,
);
const midSky = skyMask(midSource);
const mid = sharpen(kuwahara(midSource, 2), SHARP);
grade(mid, 1, 1.06, 0.94);
const midMask = midSky.map((s) => (s ? 0 : 1));
const midColors = palette(mid, midMask, COLORS.mid);
const midSlots = index(mid, midMask, midColors, 0);
cleanOrphans(midSlots, MID.width, MID.height, 2);
contour(midSlots, MID.width, MID.height, midColors);
// The contour's own crumbs go: only lines that hold read as a stroke.
cleanOrphans(midSlots, MID.width, MID.height, 1);
// The far road: wherever the painting shows bare earth behind the fighters, the earth is drawn
// instead, in the floor's own palette and perspective, so the ground is one surface from the
// crowd's feet to the viewer. Tyres, barrels, crates, feet and grass stay the painting's.
const earth = new Canvas(MID.width, MID.height);
paintEarth(earth, 0, EARTH_FROM);
for (let y = EARTH_FROM; y < MID.height; y++) {
  for (let x = 0; x < MID.width; x++) {
    const k = y * MID.width + x;
    if (!midMask[k] || !earthLike(mid, k)) continue;
    const slot = earth.get(x, y);
    if (slot !== 0) midSlots[k] = midColors.length + slot;
  }
}
// The painting's crumbs left in the drawn earth (a speck of dust, a pebble's halo) join it.
{
  const drawn = (k: number) => (midSlots[k] ?? 0) > midColors.length;
  const seen = new Uint8Array(MID.width * MID.height);
  for (let start = EARTH_FROM * MID.width; start < MID.width * MID.height; start++) {
    if (seen[start] || drawn(start) || !midMask[start]) continue;
    const crumb: number[] = [start];
    seen[start] = 1;
    for (let i = 0; i < crumb.length && crumb.length <= CRUMB; i++) {
      const k = crumb[i] ?? 0;
      const x = k % MID.width;
      for (const n of [
        x > 0 ? k - 1 : -1,
        x < MID.width - 1 ? k + 1 : -1,
        k - MID.width,
        k + MID.width,
      ]) {
        if (n < EARTH_FROM * MID.width || n >= MID.width * MID.height || seen[n] || drawn(n))
          continue;
        seen[n] = 1;
        crumb.push(n);
      }
    }
    if (crumb.length > CRUMB) continue;
    for (const k of crumb) {
      const slot = earth.get(k % MID.width, Math.floor(k / MID.width));
      if (slot !== 0) midSlots[k] = midColors.length + slot;
    }
  }
}
await writeFile(
  OUT('mid'),
  await encodeIndexedPng(MID.width, MID.height, midSlots, [
    ...rgbaOf(midColors),
    ...FLOOR_PALETTE.slice(1),
  ]),
);

// The sky alone, the street painted out behind it.
const farSource = resample(
  source,
  0,
  0,
  source.width,
  FAR.height / FAR_SCALE,
  FAR.width,
  FAR.height,
);
const farSky = skyMask(farSource);
paintOut(farSource, farSky);
const far = kuwahara(farSource, 2);
grade(far, 0.92, 0.9, 0.98);
const farColors = palette(far, undefined, COLORS.far);
const farSlots = index(far, undefined, farColors, 5);
cleanOrphans(farSlots, FAR.width, FAR.height, 1);
await write('far', FAR.width, FAR.height, farSlots, farColors);
