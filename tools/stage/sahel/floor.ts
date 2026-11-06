/**
 * Sahel Sunset's road under the fighters, drawn pixel by pixel (docs/art/decor-sahel.md §3): the
 * beaten red earth of the market street, in perspective (its grain and its stones grow toward the
 * viewer), lit from behind by the low sun (the far edge and the tops of the stones catch it, the
 * near edge and the stones' fronts fall into shadow), with its tyre ruts, its cracks, its pebbles,
 * a puddle holding the sky and a few dry tufts. Every pixel comes from fixed seeds.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The earth, the street's own terracotta (its far road in the middle layer), shadow to sun. */
const EARTH = ramp(
  '#24130f',
  '#361b14',
  '#4a2419',
  '#5e2e20',
  '#743a29',
  '#864635',
  '#97533b',
  '#ab6142',
  '#c07650',
  '#d59263',
);
/** Pebbles and stones, a cooler grey-brown so they read off the earth. */
const STONE = ramp('#2a201d', '#43342d', '#5f4c40', '#7f6a58', '#a48c74', '#c8b094');
/** The puddle: the sky's violet and gold, held in the road. */
const PUDDLE = ramp('#3a2436', '#5c3a52', '#8a5a6e', '#c08280', '#eab08a');
/** Dry grass. */
const GRASS = ramp('#3a3418', '#57502a', '#7c7036', '#a89648');

export const FLOOR_PALETTE: readonly Rgba[] = colors;

function hash(seed: number, a: number, b = 0): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(a + 0x632be5ab, 0xc2b2ae35);
  value = Math.imul(value ^ (b * 0x27d4eb2d), 0x165667b1);
  value ^= value >>> 15;
  return (value >>> 0) / 0x100000000;
}

/**
 * The ground's perspective, by screen row (the floor's top edge, where the feet stand, is row
 * 460): how large its grain and stones are, 1 at the feet, growing toward the viewer, shrinking
 * into the street behind.
 */
export function scaleAt(screenY: number): number {
  return Math.exp((screenY - 460) * 0.0147);
}

/** The earth's base light by screen row: the low sun behind lights the far road, the near is dim. */
function lightAt(screenY: number): number {
  return 7.6 - Math.max(0, screenY - 400) * 0.03;
}

/**
 * The earth's light at x, screen row y: the light by row, large patches of packed and loose earth
 * and the clumps of its grain, all flattened by the perspective.
 */
function earthLevel(x: number, y: number, seed: number): number {
  const s = scaleAt(y);
  let level = lightAt(y);
  level += (noise(seed + 1, x / s, (y / s) * 2.2, 30) - 0.5) * 2.4;
  level += (noise(seed + 2, x / s, (y / s) * 1.8, 6) - 0.5) * 1.5;
  return level;
}

/**
 * A tyre rut at screen row `centre`: a trough that wanders, deepens and fades out (never cut
 * square), its far lip lit, its bottom in shadow.
 */
function rut(canvas: Canvas, top0: number, centre: number, seed: number): void {
  const s = scaleAt(centre);
  for (let x = 0; x < canvas.width; x++) {
    const depth = noise(seed + 9, x / s, 0, 90);
    if (depth < 0.42) continue;
    const width = Math.max(1, Math.round((depth - 0.42) * 6 * s));
    const wander = Math.round((noise(seed, x / s, 0, 120) - 0.5) * 7 * s);
    const top = centre + wander - Math.floor(width / 2);
    for (let i = 0; i < width; i++) {
      const y = top + i;
      canvas.set(x, y - top0, tone(EARTH, lightAt(y) - 3.4 + (i / width) * 1.2, x, y));
    }
    canvas.set(x, top - 1 - top0, tone(EARTH, earthLevel(x, top - 1, seed) + 1.2, x, top));
  }
}

/** A stone, lit from behind and above: its top catches the sun, it casts its shadow forward. */
function stone(canvas: Canvas, x: number, y: number, size: number, seed: number): void {
  const w = size;
  const h = Math.max(2, Math.round(size * 0.55));
  const inside = (px: number, py: number): boolean => {
    const nx = (px + 0.5 - (x + w / 2)) / (w / 2);
    const ny = (py + 0.5 - (y + h / 2)) / (h / 2);
    return nx * nx + ny * ny <= 1;
  };
  // Its shadow, toward the viewer, hard-edged.
  canvas.ellipse(x, y + Math.ceil(h / 2), w + 2, Math.max(2, h), at(EARTH, 0));
  canvas.paint(x, y, w, h, (px, py) => {
    if (!inside(px, py)) return undefined;
    const ny = (py + 0.5 - (y + h / 2)) / (h / 2);
    // Three flat values, lit on top, dark below, as the fighters are shaded.
    const level = ny < -0.35 ? 3.3 : ny < 0.35 ? 2.1 : 1.2;
    return tone(STONE, level + (hash(seed, px, py) - 0.5) * 0.3, px, py);
  });
  // The contour, as the fighters have theirs: dark below and on the sides, a rim of sun on top.
  if (size < 4) return;
  canvas.paint(x - 1, y - 1, w + 2, h + 2, (px, py) => {
    if (inside(px, py)) return undefined;
    const touches =
      inside(px - 1, py) || inside(px + 1, py) || inside(px, py - 1) || inside(px, py + 1);
    if (!touches) return undefined;
    return inside(px, py + 1) ? at(STONE, 4) : at(EARTH, 0);
  });
}

/** A crack in the dried earth: a dark broken line, its far edge lit. */
function crack(canvas: Canvas, top0: number, x: number, y: number, length: number, seed: number) {
  let cx = x;
  let cy = y;
  for (let step = 0; step < length; step++) {
    const turn = hash(seed, step) < 0.3 ? (hash(seed, step, 1) < 0.5 ? -1 : 1) : 0;
    cx += 1;
    cy = Math.max(top0 + 2, Math.min(top0 + canvas.height - 2, cy + turn));
    canvas.set(cx, cy - top0, at(EARTH, 0));
    canvas.set(cx, cy - 1 - top0, tone(EARTH, earthLevel(cx, cy - 1, seed) + 1, cx, cy));
    if (hash(seed, step, 2) < 0.12) {
      // A branch.
      for (let b = 1; b < 4; b++) canvas.set(cx + b, cy + b - top0, at(EARTH, 2));
    }
  }
}

/** A puddle left by the last rain, holding the dusk sky; its near rim dark, far rim lit. */
function puddle(canvas: Canvas, x: number, y: number, w: number, h: number): void {
  canvas.paint(x - 1, y - 1, w + 2, h + 2, (px, py) => {
    const nx = (px + 0.5 - (x + w / 2)) / (w / 2 + 1);
    const ny = (py + 0.5 - (y + h / 2)) / (h / 2 + 1);
    return nx * nx + ny * ny <= 1 ? at(EARTH, 2) : undefined;
  });
  canvas.paint(x, y, w, h, (px, py) => {
    const nx = (px + 0.5 - (x + w / 2)) / (w / 2);
    const ny = (py + 0.5 - (y + h / 2)) / (h / 2);
    if (nx * nx + ny * ny > 1) return undefined;
    // The sky upside down: gold near the far rim, violet toward the viewer.
    return tone(PUDDLE, 3.4 - (ny + 1) * 1.6, px, py);
  });
  // A glint of the sun on the water.
  canvas.hline(x + Math.round(w * 0.3), y + 1, Math.max(2, Math.round(w * 0.25)), at(PUDDLE, 4));
}

/** A dry tuft: a few blades, the tallest lit. */
function tuft(canvas: Canvas, x: number, base: number, size: number, seed: number): void {
  const blades = 3 + Math.floor(hash(seed, 0) * 4);
  for (let b = 0; b < blades; b++) {
    const bx = x + b * 2 - blades;
    const tall = Math.round(size * (0.5 + hash(seed, b) * 0.7));
    const lean = hash(seed, b, 1) < 0.5 ? -1 : 1;
    for (let i = 0; i < tall; i++) {
      const px = bx + (i > tall / 2 ? lean : 0);
      canvas.set(px, base - i, at(GRASS, i > tall - 2 ? 3 : i > tall / 2 ? 2 : 1));
    }
  }
  canvas.hline(x - blades - 1, base + 1, blades * 2 + 2, at(EARTH, 2));
}

/**
 * The earth drawn into `canvas`, its row 0 at screen row `top0`, from screen row `from` down: the
 * floor's strip (top0 460), or the far road behind the fighters in the middle layer (top0 0).
 */
export function paintEarth(canvas: Canvas, top0: number, from: number, seed = 31): void {
  const { width } = canvas;
  const bottom = top0 + canvas.height;
  const y0 = Math.max(from, top0);
  canvas.paint(0, y0 - top0, width, bottom - y0, (x, row) =>
    tone(EARTH, earthLevel(x, row + top0, seed), x, row + top0),
  );
  // The ruts the carts and the Jeeps cut, closer together far away.
  for (const [i, row] of [430, 442, 474, 520].entries()) {
    if (row >= y0 && row < bottom) rut(canvas, top0, row, seed + 10 + i);
  }
  // Cracks, longer nearer the viewer.
  for (let i = 0; i < 60; i++) {
    const y = y0 + 3 + Math.floor(hash(seed + 20, i) * (bottom - y0 - 6));
    const x = Math.floor(hash(seed + 21, i) * width);
    if (hash(seed + 24, i) > 0.45) continue;
    const length = Math.round((10 + hash(seed + 22, i) * 18) * scaleAt(y));
    crack(canvas, top0, x, y, length, seed + 23 + i);
  }
  // Puddles from the last rain, flattened by the perspective.
  for (const [px, py, pw] of [
    [520, 488, 46],
    [1410, 505, 64],
    [300, 440, 30],
    [980, 446, 38],
  ] as const) {
    if (py < y0 || py >= bottom - 2) continue;
    const s = scaleAt(py);
    puddle(canvas, px, py - top0, Math.round(pw * s * 0.6), Math.max(3, Math.round(4 * s)));
  }
  // Clods and packed patches: darker lumps with a lit top, lighter flat patches.
  for (let i = 0; i < 260; i++) {
    const y = y0 + 2 + Math.floor(hash(seed + 60, i) * (bottom - y0 - 4));
    const x = Math.floor(hash(seed + 61, i) * width);
    const s = scaleAt(y);
    const w = Math.round((4 + hash(seed + 62, i) * 10) * s);
    const h = Math.max(1, Math.round(w * 0.28));
    const dark = hash(seed + 63, i) < 0.6;
    const level = lightAt(y) + (dark ? -1.6 : 1.1);
    const inClod = (px: number, sy: number): boolean => {
      const nx = (px + 0.5 - (x + w / 2)) / (w / 2);
      const ny = (sy + 0.5 - (y + h / 2)) / (h / 2);
      return nx * nx + ny * ny <= 1;
    };
    canvas.paint(x, y - top0, w, h, (px, py) => {
      const sy = py + top0;
      if (!inClod(px, sy)) return undefined;
      // A dark clod: its lit top edge, its dark underside; a packed patch: flat and pale.
      if (dark && !inClod(px, sy - 1)) return tone(EARTH, level + 2.6, px, sy);
      if (dark && !inClod(px, sy + 1)) return at(EARTH, 0);
      return tone(EARTH, level, px, sy);
    });
  }
  // Stones: in patches, where the earth is loose; tiny far away, larger near.
  for (let i = 0; i < 800; i++) {
    const y = y0 + 2 + Math.floor(hash(seed + 30, i) * (bottom - y0 - 4));
    const x = Math.floor(hash(seed + 31, i) * width);
    const s = scaleAt(y);
    const loose = noise(seed + 34, x / s, y / s, 70);
    if (loose < 0.52 || hash(seed + 35, i) > (loose - 0.52) * 3.2) continue;
    const size = Math.round((0.8 + hash(seed + 32, i) * 2.2) * s);
    if (size <= 1) {
      canvas.set(x, y - top0, at(STONE, 3));
    } else if (size === 2) {
      canvas.set(x, y - top0, at(STONE, 4));
      canvas.set(x + 1, y - top0, at(STONE, 2));
      canvas.set(x, y + 1 - top0, at(EARTH, 2));
    } else stone(canvas, x, y - top0, size, seed + 33 + i);
  }
  // Dry tufts here and there.
  for (let i = 0; i < 40; i++) {
    const y = y0 + 4 + Math.floor(hash(seed + 50, i) * (bottom - y0 - 6));
    if (hash(seed + 53, i) > 0.55) continue;
    const s = scaleAt(y);
    tuft(
      canvas,
      Math.floor(hash(seed + 51, i) * width),
      y - top0,
      Math.round(3 * s),
      seed + 52 + i,
    );
  }
}

/** The road under the feet, `width × height` image pixels (screen rows 460 on). */
export function drawSahelFloor(width: number, height: number, seed = 31): Canvas {
  const canvas = new Canvas(width, height);
  paintEarth(canvas, 460, 460, seed);
  return canvas;
}
