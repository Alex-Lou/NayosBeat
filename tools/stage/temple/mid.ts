/**
 * The middle layer (docs/art/decor-temple.md §2.2): the temple's courtyard in high-detail pixel art
 * and 3D perspective. On the left, the main sanctuary hall (Hondō) with two-tiered curved tile roof,
 * golden shachihoko finials, karahafu entrance gable, dougong brackets, glowing shoji screens,
 * veranda railing, stone steps, and smoking bronze kōro incense burner; by its steps, the ema rack
 * and bamboo tsukubai water basin; in the center, the vermilion Myōjin torii gate with gold tablet,
 * braided shimenawa rope, shide, and sculpted kitsune fox guardians; on the right, lattice-windowed
 * courtyard wall, two Kasuga stone lanterns, a vermilion arched bridge over the courtyard stream, a
 * festoon of paper lanterns, and an ancient gnarled sakura cherry tree.
 *
 * What the wind's gust shakes loops over GUST_CYCLE, with it.
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import {
  BARK,
  BIB,
  BLOSSOM,
  BRONZE,
  GLITTER,
  LACQUER,
  LANTERN,
  MOSS,
  PAPER,
  ROPE,
  SEA,
  SNOW_BLOSSOM,
  SNOW_MOSS,
  SNOW_STONE,
  SNOW_TILE,
  STONE,
  TILE,
  WOOD,
} from './palette.ts';

export const BASE = 424;
const FLOOR_END = 470;
const WALL = { top: 332, cap: 316 } as const;
const HALL = { left: 24, right: 444, base: 368, eave: 226, ridge: 146 } as const;
const GATE = { left: 584, right: 788, pillar: 20, top: 158, beam: 204 } as const;
const STONE_LANTERNS = [884, 1006] as const;
const TREE = { x: 1252, foot: 436 } as const;
const STRING = { left: GATE.right - 6, right: 1154, y: 212, sag: 22 } as const;
const PAPER_LANTERNS = [842, 930, 1018, 1100] as const;
const INCENSE = { x: 158, y: 422 } as const;
const BASIN = { x: 534, y: 432 } as const;

const LIGHTS: readonly Light[] = [
  ...STONE_LANTERNS.map((x): Light => ({ x, y: 348, radius: 115, strength: 1.65, squash: 0.75 })),
  ...PAPER_LANTERNS.map((x): Light => ({ x, y: 244, radius: 82, strength: 1.05, squash: 0.85 })),
  { x: 234, y: 294, radius: 195, strength: 1.5, squash: 0.75 },
  { x: 686, y: 390, radius: 130, strength: 0.9, squash: 0.6 },
];

export const GUST_CYCLE = 2400;
export const GUST_AT = 1200;
export const GUST = 300;

export function gusting(step: number): boolean {
  return step >= GUST_AT && step < GUST_AT + GUST;
}

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < GUST_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

function litStone(level: number, x: number, y: number): number {
  return hdTone(STONE, level + lightAt(LIGHTS, x, y), x, y);
}

function drawWall(canvas: Canvas): void {
  canvas.paint(0, WALL.top, canvas.width, BASE - WALL.top, (x, y) => {
    const along = x % 144;
    const post = along < 12;
    const plinth = y > BASE - 16;
    if (post) {
      const pEdge = along < 2 ? 4 : along > 9 ? 1.2 : 2.6;
      return hdTone(WOOD, pEdge, x, y);
    }
    if (plinth) {
      if (y === BASE - 16) return at(STONE, 6);
      const block = x % 36 < 2 || y === BASE - 8 ? -1.1 : 0;
      return litStone(3 + block, x, y);
    }
    if (y < WALL.top + 3) return at(WOOD, 1);
    const beam = (y >= WALL.top + 14 && y < WALL.top + 18) || (y >= BASE - 20 && y < BASE - 16);
    if (beam) return hdTone(WOOD, y === WALL.top + 14 || y === BASE - 20 ? 3.6 : 1.8, x, y);

    const win = along >= 42 && along < 102 && y >= WALL.top + 24 && y < BASE - 28;
    if (win) {
      if (along === 42 || along === 101 || y === WALL.top + 24 || y === BASE - 29) {
        return at(WOOD, 3);
      }
      if (along % 6 < 2) return at(WOOD, 2);
      return at(SEA, (y + along) % 7 === 0 ? 4 : 2);
    }

    const stain = (noise(29, x >> 2, y >> 1, 10) - 0.5) * 0.4;
    return litStone(3.6 + stain, x, y);
  });

  canvas.paint(0, WALL.cap, canvas.width, WALL.top - WALL.cap, (x, y) => {
    const row = y - WALL.cap;
    if (row === 0) return at(SNOW_TILE, 4);
    if (row < 4) return hdTone(SNOW_TILE, 2.4, x, y);
    if (row === WALL.top - WALL.cap - 1) return at(TILE, 0);
    if (row === WALL.top - WALL.cap - 2) return at(STONE, 6);
    const rib = x % 8 < 3 ? 0.8 : -0.3;
    return hdTone(TILE, 2.2 + rib - (row % 5 === 0 ? 0.7 : 0), x, y);
  });

  for (let x = 0; x < canvas.width; x++) {
    const tall = Math.round(noise(31, x >> 1, 0, 14) * 6);
    if (tall > 1) canvas.vline(x, BASE - tall, tall, at(MOSS, tall > 3 ? 3 : 2));
  }
}

function drawGround(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    if (y < BASE + 2) return at(STONE, 0);
    if (y === BASE + 2) return at(STONE, 5);
    if (y >= 446 && y < 454) {
      if (y === 446) return at(STONE, 6);
      if (y === 447) return at(STONE, 1);
      if (y === 453) return at(STONE, 5);
      const shimmer = (x + y * 5) % 29 < 3 && lightAt(LIGHTS, x, y) > 0.35;
      if (shimmer) return at(LANTERN, 2);
      const ripple = (x + y * 3) % 19 === 0;
      return at(ripple ? GLITTER : SEA, ripple ? 1 : 2);
    }
    if (y >= 456) {
      if (y === 456) return at(STONE, 5);
      return at(STONE, 0);
    }
    const fade = Math.max(0, 1 - (y - BASE) / 36);
    const glow = lightAt(LIGHTS, x, y) * 1.15 * fade;
    const wear = (noise(35, x >> 2, y >> 1, 10) - 0.5) * 0.45 * fade;
    const level = 3.4 + glow + wear;
    const snow = noise(37, x, y, 90) > 0.12;
    return hdTone(snow ? SNOW_STONE : STONE, level, x, y);
  });

  for (const [sx, sy, sw, sh] of [
    [548, 434, 34, 8],
    [608, 436, 38, 9],
    [686, 435, 44, 10],
    [760, 436, 36, 9],
    [838, 434, 32, 8],
  ] as const) {
    canvas.ellipse(sx, sy + 2, sw, sh, at(STONE, 0));
    canvas.ellipse(sx, sy, sw, sh, at(SNOW_STONE, 5));
    canvas.hline(sx + 6, sy, sw - 12, at(STONE, 7));
  }

  const bx = 944;
  canvas.fill(bx - 28, 442, 6, 14, at(WOOD, 2));
  canvas.fill(bx + 22, 442, 6, 14, at(WOOD, 2));
  for (let dx = -28; dx < 28; dx++) {
    const arch = Math.round((1 - (dx / 28) ** 2) * 7);
    const by = 446 - arch;
    canvas.fill(bx + dx, by, 1, 6, at(LACQUER, 3));
    canvas.set(bx + dx, by, at(LACQUER, 4));
    canvas.set(bx + dx, by - 6, at(LACQUER, 4));
    if (dx % 9 === 0) canvas.fill(bx + dx, by - 6, 2, 6, at(LACQUER, 3));
  }
  for (const px of [bx - 28, bx, bx + 26]) {
    const arch = px === bx ? 7 : 0;
    canvas.fill(px - 1, 438 - arch, 4, 3, at(BRONZE, 3));
  }

  for (let p = 0; p < 24; p++) {
    const px = TREE.x - 150 + ((p * 23) % 260);
    const py = 428 + ((p * 7) % 16);
    canvas.fill(px, py, 3, 2, at(BLOSSOM, p % 3 === 0 ? 4 : 3));
  }
}

function drawRoof(
  canvas: Canvas,
  left: number,
  right: number,
  ridge: number,
  eave: number,
  flare: number,
): void {
  const width = right - left;
  for (let x = left; x < right; x++) {
    const t = (x - left) / width;
    const edge = Math.min(t, 1 - t);
    const lift = edge < 0.15 ? Math.round(flare * (1 - edge / 0.15) ** 2) : 0;
    const inset = Math.round((1 - Math.min(edge / 0.2, 1)) * (eave - ridge) * 0.54);
    const topY = ridge + inset;
    const botY = eave - lift;
    for (let y = topY; y < botY; y++) {
      if (y === topY) {
        canvas.set(x, y, at(SNOW_TILE, 4));
        continue;
      }
      if (y < topY + 5) {
        canvas.set(x, y, hdTone(SNOW_TILE, 2.3, x, y));
        continue;
      }
      if (y >= botY - 6) {
        if (y === botY - 1) canvas.set(x, y, at(TILE, 0));
        else if (y === botY - 3 && x % 8 >= 2 && x % 8 <= 5) canvas.set(x, y, at(BRONZE, 3));
        else if (y === botY - 5) canvas.set(x, y, at(TILE, 4));
        else canvas.set(x, y, at(TILE, 3));
        continue;
      }
      const slope = (y - topY) / Math.max(1, botY - topY);
      const rib = x % 8 < 2 ? 0.85 : x % 8 === 7 ? -0.6 : 0;
      const course = (y - topY) % 7 === 0 ? -0.5 : 0;
      const level = Math.min(3.8, 1.8 + slope * 1.2 + rib + course);
      canvas.set(x, y, hdTone(TILE, level, x, y));
    }
  }
  const rLeft = Math.round(left + width * 0.18);
  const rWidth = Math.round(width * 0.64);
  canvas.fill(rLeft, ridge - 9, rWidth, 9, at(TILE, 3));
  canvas.hline(rLeft, ridge - 9, rWidth, at(SNOW_TILE, 4));
  canvas.hline(rLeft, ridge - 5, rWidth, at(BRONZE, 3));
  canvas.hline(rLeft, ridge - 2, rWidth, at(STONE, 6));
  for (const [ox, dir] of [
    [rLeft - 6, 1],
    [rLeft + rWidth - 6, -1],
  ] as const) {
    canvas.fill(ox, ridge - 22, 12, 20, at(BRONZE, 2));
    canvas.fill(ox + 2, ridge - 24, 8, 18, at(BRONZE, 3));
    canvas.fill(ox + (dir > 0 ? 0 : 8), ridge - 26, 4, 6, at(LANTERN, 4));
    canvas.hline(ox - 2, ridge - 10, 16, at(SNOW_TILE, 4));
  }

  const gCenter = Math.round((left + right) / 2);
  const gHalf = 58;
  for (let dx = -gHalf; dx <= gHalf; dx++) {
    const u = Math.abs(dx) / gHalf;
    const gy = eave - 34 + Math.round(u * u * 26);
    canvas.vline(gCenter + dx, gy, eave - gy - 2, at(WOOD, 2));
    canvas.set(gCenter + dx, gy, at(SNOW_TILE, 4));
    canvas.set(gCenter + dx, gy + 1, at(TILE, 4));
    canvas.set(gCenter + dx, gy + 2, at(BRONZE, 3));
    canvas.set(gCenter + dx, gy + 3, at(LACQUER, 3));
  }
  canvas.fill(gCenter - 8, eave - 24, 16, 12, at(BRONZE, 3));
  canvas.fill(gCenter - 4, eave - 21, 8, 6, at(LANTERN, 4));
}

function drawPaperLantern(canvas: Canvas, x: number, y: number, swing: number): void {
  const body = new Mask(canvas.width, canvas.height);
  const cx = x + swing;
  body.ellipse(cx - 9, y + 4, 18, 24);
  canvas.line(x, y - 6, cx, y + 4, at(ROPE, 2));
  canvas.paint(cx - 12, y - 2, 24, 34, (px, py) => {
    if (!body.has(px, py)) return undefined;
    const rib = (py - y) % 4 === 0;
    const dist = Math.hypot((px - cx) / 8, (py - (y + 16)) / 11);
    const level = (rib ? 2.1 : 3.1) + Math.max(0, 1 - dist) * 1.5;
    return hdTone(LANTERN, level, px, py);
  });
  canvas.fill(cx - 2, y + 11, 3, 8, at(LACQUER, 1));
  canvas.fill(cx - 6, y + 2, 12, 3, at(WOOD, 1));
  canvas.hline(cx - 6, y + 2, 12, at(BRONZE, 3));
  canvas.fill(cx - 6, y + 26, 12, 3, at(WOOD, 1));
  canvas.hline(cx - 6, y + 26, 12, at(BRONZE, 3));
  canvas.vline(cx, y + 29, 5, at(LACQUER, 4));
}

function drawIncense(canvas: Canvas, frame: number): void {
  const { x, y } = INCENSE;
  canvas.fill(x - 16, y - 4, 32, 6, at(STONE, 5));
  canvas.hline(x - 16, y - 4, 32, at(STONE, 7));
  canvas.fill(x - 12, y - 16, 24, 12, at(BRONZE, 1));
  canvas.fill(x - 14, y - 24, 28, 10, at(BRONZE, 2));
  canvas.hline(x - 15, y - 24, 30, at(BRONZE, 3));
  canvas.hline(x - 12, y - 18, 24, at(BRONZE, 3));
  canvas.fill(x - 5, y - 26, 10, 2, at(LANTERN, 4));
  const lean = frame >= 3 ? -3 : 0;
  const phase = frame % 3;
  for (let i = 0; i < 9; i++) {
    const rise = 3 + i * 3;
    const sx = x + Math.round(Math.sin((i + phase) * 0.9) * 2.5 + (lean * i) / 4);
    const sy = y - 26 - rise;
    canvas.fill(sx, sy, 2, 2, at(PAPER, 2));
  }
}

function drawHall(canvas: Canvas, swing: number, chime: number): void {
  const { left, right, base, eave, ridge } = HALL;
  canvas.paint(left - 12, base, right - left + 24, BASE - base + 6, (x, y) => {
    if (y === base) return at(STONE, 7);
    if (y === base + 1) return at(STONE, 6);
    if (y < base + 5) return litStone(4.6, x, y);
    const row = Math.floor((y - base) / 12);
    const jointX = (x + row * 22) % 44 < 2;
    const jointY = (y - base) % 12 === 0;
    if (jointX || jointY) return at(STONE, 1);
    const bevel = (x + row * 22) % 44 === 2 || (y - base) % 12 === 1 ? 0.9 : 0;
    return litStone(3.5 + bevel, x, y);
  });

  const stairX = Math.round((left + right) / 2) - 44;
  const stairW = 88;
  for (let step = 0; step < 6; step++) {
    const y = base + 4 + step * 9;
    const sx = stairX - step * 2;
    const sw = stairW + step * 4;
    canvas.fill(sx, y, sw, 9, at(STONE, step % 2 === 0 ? 5 : 4));
    canvas.hline(sx, y, sw, at(STONE, 7));
    canvas.hline(sx, y + 1, sw, at(STONE, 6));
    canvas.hline(sx, y + 8, sw, at(STONE, 1));
  }
  for (const side of [stairX - 8, stairX + stairW + 2]) {
    canvas.fill(side, base, 8, BASE - base + 6, at(STONE, 5));
    canvas.vline(side, base, BASE - base + 6, at(STONE, 7));
    canvas.fill(side - 1, BASE + 1, 10, 5, at(BRONZE, 3));
  }

  canvas.paint(left + 16, eave, right - left - 32, base - eave, (x, y) => {
    const shoji = y > eave + 20 && y < base - 18 && x > left + 96 && x < right - 96;
    const gridX = (x - left) % 14 === 0;
    const gridY = (y - eave) % 12 === 0;
    if (shoji) {
      if (gridX || gridY) return at(WOOD, 2);
      const cx = (left + right) / 2;
      const cy = eave + 88;
      if (Math.abs(x - cx) < 18 && y > cy - 16 && y < cy + 16) {
        return at(BRONZE, Math.abs(x - cx) < 8 ? 3 : 2);
      }
      const dist = Math.hypot((x - cx) / 96, (y - cy) / 48);
      if (dist < 0.55) return hdTone(LANTERN, 3.6 - dist * 3.2, x, y);
      return hdTone(PAPER, Math.min(2, Math.max(0.4, 1.8 - dist * 1.1)), x, y);
    }
    const plank = (y - eave) % 8 === 0;
    const frame = (x - left) % 28 < 2 || (y - eave) % 28 < 2;
    return hdTone(WOOD, frame ? 3.4 : plank ? 1.2 : 2.3, x, y);
  });

  for (let x = left + 16; x <= right - 32; x += 92) {
    canvas.paint(x, eave - 4, 16, base - eave + 4, (px, py) => {
      const u = (px - x) / 16;
      return hdTone(LACQUER, 4.4 - u * 2.5, px, py);
    });
    canvas.fill(x - 2, base - 7, 20, 7, at(BRONZE, 2));
    canvas.hline(x - 2, base - 7, 20, at(BRONZE, 3));
    canvas.fill(x - 1, eave + 14, 18, 4, at(BRONZE, 3));
    canvas.fill(x - 6, eave - 10, 28, 6, at(LACQUER, 3));
    canvas.hline(x - 6, eave - 10, 28, at(BRONZE, 3));
  }

  canvas.hline(left + 8, base - 16, right - left - 16, at(LACQUER, 4));
  canvas.fill(left + 8, base - 15, right - left - 16, 3, at(LACQUER, 3));
  canvas.hline(left + 8, base - 9, right - left - 16, at(LACQUER, 4));
  for (let rx = left + 14; rx <= right - 14; rx += 26) {
    canvas.fill(rx, base - 18, 3, 18, at(LACQUER, 3));
    canvas.fill(rx - 1, base - 22, 5, 4, at(BRONZE, 3));
  }

  canvas.fill(left - 6, eave - 14, right - left + 12, 12, at(LACQUER, 2));
  canvas.hline(left - 6, eave - 14, right - left + 12, at(LACQUER, 4));
  canvas.hline(left - 6, eave - 8, right - left + 12, at(BRONZE, 3));
  for (let tx: number = left; tx < right; tx += 10) {
    canvas.fill(tx, eave - 12, 4, 6, at(WOOD, 3));
    canvas.hline(tx, eave - 12, 4, at(PAPER, 2));
  }

  drawRoof(canvas, left - 36, right + 36, ridge, eave - 8, 22);
  drawPaperLantern(canvas, left + 106, eave + 2, swing);
  drawPaperLantern(canvas, right - 106, eave + 2, swing);

  const corner = right + 24;
  canvas.vline(corner, eave - 14, 18, at(ROPE, 2));
  canvas.fill(corner - 4, eave + 4, 9, 7, at(BRONZE, 3));
  canvas.vline(corner + ([0, 2, -2][chime % 3] ?? 0), eave + 11, 12, at(PAPER, 2));
}

function drawVotivesAndBasin(canvas: Canvas, waterFrame: number): void {
  const x = 456;
  canvas.fill(x - 6, 344, 72, 6, at(TILE, 3));
  canvas.hline(x - 6, 344, 72, at(SNOW_TILE, 4));
  canvas.hline(x - 6, 349, 72, at(BRONZE, 3));
  canvas.fill(x, 350, 4, BASE - 350, at(WOOD, 3));
  canvas.fill(x + 56, 350, 4, BASE - 350, at(WOOD, 3));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const ex = x + 6 + i * 9;
      const ey = 358 + row * 15;
      canvas.fill(ex, ey, 7, 9, at(WOOD, 4));
      canvas.hline(ex + 1, ey - 1, 5, at(PAPER, 2));
      canvas.fill(ex + 2, ey + 2, 3, 3, at(LACQUER, 4));
      canvas.set(ex + 3, ey + 3, at(BRONZE, 3));
    }
  }
  canvas.hline(x + 2, 394, 56, at(ROPE, 2));
  for (let i = 0; i < 6; i++) canvas.fill(x + 6 + i * 8, 393, 3, 5, at(PAPER, 2));

  const bx = BASIN.x;
  const by = BASIN.y;
  canvas.ellipse(bx - 22, by - 6, 44, 8, at(STONE, 2));
  canvas.fill(bx - 16, by - 20, 32, 18, at(STONE, 4));
  canvas.hline(bx - 16, by - 20, 32, at(STONE, 7));
  canvas.fill(bx - 12, by - 19, 24, 5, at(SEA, 3));
  canvas.hline(bx - 8 + (waterFrame % 3) * 2, by - 17, 10, at(GLITTER, 2));
  canvas.line(bx - 14, by - 21, bx + 4, by - 23, at(WOOD, 4), 2);
  canvas.fill(bx + 10, by - 38, 4, 22, at(MOSS, 3));
  canvas.line(bx + 10, by - 34, bx - 2, by - 28, at(MOSS, 3), 2);
  for (let wy = by - 27; wy < by - 18; wy += 2) {
    if ((wy + waterFrame) % 3 !== 0) {
      canvas.set(bx - 3, wy, at(GLITTER, 2));
      canvas.set(bx - 2, wy, at(GLITTER, 1));
    }
  }
}

function drawRope(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, beam } = GATE;
  const y0 = beam + 22;
  for (let x = left + pillar; x < right; x++) {
    const t = (x - left - pillar) / (right - left - pillar);
    const y = y0 + Math.round(Math.sin(t * Math.PI) * 10);
    const thick = Math.round(5 + Math.sin(t * Math.PI) * 4);
    const twist = (x + y) % 6 < 3;
    canvas.fill(x, y, 1, thick, at(ROPE, twist ? 2 : 1));
    if (twist) canvas.set(x, y, at(BRONZE, 3));
  }
  for (let i = 1; i < 5; i++) {
    const x = left + pillar + Math.round(((right - left - pillar) * i) / 5);
    const t = i / 5;
    const top = y0 + 6 + Math.round(Math.sin(t * Math.PI) * 10);
    const lean = flutter === 0 ? 0 : flutter === 1 ? 2 : 4;
    for (let seg = 0; seg < 4; seg++) {
      const sx = x + (seg % 2 === 0 ? 0 : 3) + Math.round((lean * seg) / 3);
      canvas.fill(sx, top + seg * 5, 4, 5, at(PAPER, 2));
      canvas.set(sx, top + seg * 5, at(LANTERN, 4));
    }
  }
}

function drawGate(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, top, beam } = GATE;
  const cx = Math.round((left + right + pillar) / 2);
  const foot = 434;
  canvas.fill(cx - 10, top + 14, 20, beam - top - 14, at(WOOD, 1));
  canvas.fill(cx - 9, top + 15, 18, beam - top - 16, at(BRONZE, 3));
  canvas.fill(cx - 6, top + 18, 12, beam - top - 22, at(LACQUER, 1));
  canvas.fill(cx - 2, top + 21, 4, 16, at(LANTERN, 4));

  for (const x of [left, right - pillar]) {
    canvas.paint(x, top + 10, pillar, foot - top - 10, (px, py) => {
      const u = (px - x) / pillar;
      return hdTone(LACQUER, 4.4 - u * 2.5, px, py);
    });
    canvas.fill(x - 2, top + 16, pillar + 4, 4, at(BRONZE, 3));
    canvas.fill(x - 3, foot - 24, pillar + 6, 20, at(WOOD, 0));
    canvas.hline(x - 3, foot - 24, pillar + 6, at(BRONZE, 3));
    canvas.hline(x - 3, foot - 14, pillar + 6, at(BRONZE, 2));
    canvas.fill(x - 7, foot - 6, pillar + 14, 8, at(STONE, 5));
    canvas.hline(x - 7, foot - 6, pillar + 14, at(STONE, 7));
  }

  canvas.fill(left - 22, beam, right - left + pillar + 24, 12, at(LACQUER, 3));
  canvas.hline(left - 22, beam, right - left + pillar + 24, at(LACQUER, 4));
  canvas.hline(left - 22, beam + 11, right - left + pillar + 24, at(LACQUER, 1));
  for (const wx of [left - 6, right - pillar - 2]) {
    canvas.fill(wx, beam - 4, pillar + 8, 4, at(BRONZE, 3));
  }

  for (let x = left - 46; x < right + pillar + 26; x++) {
    const t = (x - (left - 46)) / (right - left + pillar + 72);
    const up = Math.round(((t - 0.5) * 2) ** 4 * 18);
    canvas.fill(x, top - up, 1, 9, at(TILE, 2));
    canvas.set(x, top - up, at(SNOW_TILE, 4));
    canvas.set(x, top - up + 2, at(TILE, 4));
    canvas.fill(x, top + 9 - up, 1, 8, at(LACQUER, 3));
    canvas.set(x, top + 9 - up, at(LACQUER, 4));
    canvas.set(x, top + 12 - up, at(BRONZE, 3));
  }
  drawRope(canvas, flutter);
}

function drawFox(canvas: Canvas, x: number, facing: -1 | 1): void {
  const foot = 436;
  canvas.fill(x - 18, foot - 6, 36, 6, at(STONE, 3));
  canvas.hline(x - 18, foot - 6, 36, at(STONE, 6));
  canvas.fill(x - 15, foot - 20, 30, 14, at(STONE, 4));
  canvas.hline(x - 15, foot - 20, 30, at(STONE, 7));
  canvas.fill(x - 11, foot - 16, 22, 8, at(STONE, 2));
  const body = new Mask(canvas.width, canvas.height);
  body.ellipse(x - 9, foot - 48, 18, 28);
  body.limb(x + facing * 5, foot - 38, x + facing * 7, foot - 21, 2.5);
  body.ellipse(x - 7 + facing * 4, foot - 61, 14, 13);
  body.rect(x + (facing > 0 ? 5 : -11), foot - 57, 6, 5);
  body.polygon([
    [x - 5 + facing * 3, foot - 60],
    [x - 2 + facing * 3, foot - 73],
    [x + 3 + facing * 3, foot - 60],
  ]);
  body.limb(x - facing * 7, foot - 24, x - facing * 15, foot - 44, 4.5);
  body.limb(x - facing * 15, foot - 44, x - facing * 12, foot - 56, 3.5);
  canvas.paint(x - 24, foot - 76, 48, 58, (px, py) => {
    if (!body.has(px, py)) return undefined;
    const rim = !body.has(px - facing, py) || !body.has(px, py - 1);
    const shade = !body.has(px + facing, py) && py > foot - 44;
    if (rim) return at(STONE, 7);
    return hdTone(STONE, shade ? 2.8 : 4.6, px, py);
  });
  canvas.fill(x - 7 + facing * 3, foot - 50, 14, 6, at(BIB, 1));
  canvas.fill(x - 5 + facing * 3, foot - 44, 10, 4, at(BIB, 0));
  canvas.fill(x + facing * 4, foot - 48, 3, 3, at(BRONZE, 3));
  canvas.fill(x + facing * 5, foot - 58, 2, 2, at(LANTERN, 4));
}

function drawStoneLantern(canvas: Canvas, x: number, flame: number): void {
  const foot = 436;
  canvas.fill(x - 16, foot - 6, 32, 6, at(STONE, 3));
  canvas.hline(x - 16, foot - 6, 32, at(STONE, 6));
  canvas.fill(x - 12, foot - 14, 24, 8, at(STONE, 4));
  canvas.hline(x - 12, foot - 14, 24, at(STONE, 7));
  canvas.paint(x - 7, foot - 58, 14, 44, (px, py) => {
    const ring = Math.abs(py - (foot - 36)) <= 2;
    const u = (px - (x - 7)) / 14;
    if (ring && u < 0.5) return at(STONE, 7);
    return hdTone(STONE, (ring ? 5.4 : 4.8) - u * 2.2, px, py);
  });
  canvas.fill(x - 16, foot - 65, 32, 7, at(STONE, 5));
  canvas.hline(x - 16, foot - 65, 32, at(STONE, 7));
  canvas.fill(x - 12, foot - 87, 24, 22, at(STONE, 3));
  canvas.vline(x - 12, foot - 87, 22, at(STONE, 6));
  canvas.fill(x - 8, foot - 83, 16, 15, at(LANTERN, flame === 0 ? 2 : 3));
  canvas.fill(x - 4, foot - 80, 8, 9, at(LANTERN, 4));
  canvas.vline(x, foot - 83, 15, at(WOOD, 2));
  canvas.hline(x - 8, foot - 76, 16, at(WOOD, 2));
  for (let row = 0; row < 12; row++) {
    const half = Math.round(7 + row * 1.5);
    const ry = foot - 99 + row;
    canvas.hline(x - half, ry, half * 2, at(STONE, row < 3 ? 6 : 5));
    if (row >= 9) {
      canvas.set(x - half - 1, ry - 1, at(STONE, 7));
      canvas.set(x + half, ry - 1, at(STONE, 4));
    }
  }
  canvas.hline(x - 12, foot - 100, 24, at(SNOW_STONE, 7));
  canvas.fill(x - 3, foot - 107, 6, 7, at(BRONZE, 3));
  canvas.set(x - 1, foot - 109, at(LANTERN, 4));
}

function drawTree(canvas: Canvas): void {
  const { x, foot } = TREE;
  canvas.fill(x - 32, foot - 8, 64, 10, at(STONE, 4));
  canvas.hline(x - 32, foot - 8, 64, at(STONE, 7));
  canvas.hline(x - 28, foot - 9, 56, at(MOSS, 3));
  const wood = new Mask(canvas.width, canvas.height);
  wood.limb(x - 16, foot - 6, x - 3, foot - 36, 7);
  wood.limb(x + 16, foot - 6, x + 3, foot - 36, 7);
  wood.limb(x, foot - 8, x - 6, foot - 146, 11);
  wood.limb(x - 6, foot - 146, x - 96, foot - 238, 7);
  wood.limb(x - 6, foot - 146, x + 64, foot - 254, 7);
  wood.limb(x - 48, foot - 198, x - 148, foot - 218, 4.5);
  wood.limb(x + 28, foot - 200, x + 118, foot - 218, 4.5);
  wood.limb(x - 74, foot - 220, x - 118, foot - 268, 3.5);
  wood.limb(x + 44, foot - 234, x + 92, foot - 278, 3.5);
  canvas.paint(x - 170, foot - 290, 320, 288, (px, py) => {
    if (!wood.has(px, py)) return undefined;
    const barkGrain = (px + Math.floor(py / 4)) % 5 === 0 ? -0.6 : 0;
    const level = (!wood.has(px - 2, py) ? 3.5 : !wood.has(px + 2, py) ? 0.7 : 2.1) + barkGrain;
    return hdTone(BARK, level, px, py);
  });

  const puffs = [
    [-168, -218, 46, 28, false],
    [-142, -234, 52, 32, true],
    [-116, -212, 48, 28, false],
    [-128, -264, 58, 36, true],
    [-96, -248, 62, 38, false],
    [-82, -284, 64, 38, true],
    [-48, -268, 68, 42, false],
    [-54, -302, 62, 36, true],
    [-18, -296, 68, 40, true],
    [-24, -252, 64, 38, false],
    [-6, -228, 56, 34, false],
    [16, -276, 66, 40, false],
    [22, -308, 64, 38, true],
    [54, -298, 62, 36, true],
    [46, -262, 66, 38, false],
    [34, -228, 54, 32, false],
    [68, -242, 58, 34, false],
    [82, -272, 60, 36, true],
    [98, -238, 52, 32, false],
    [72, -214, 48, 28, false],
    [112, -222, 46, 28, true],
  ] as const;

  for (const [dx, dy, w, h, topCluster] of puffs) {
    const cx = x + dx + w / 2;
    const cy = foot + dy + h / 2;
    canvas.paint(x + dx, foot + dy, w, h, (px, py) => {
      const nx = (px + 0.5 - cx) / (w / 2);
      const ny = (py + 0.5 - cy) / (h / 2);
      const r2 = nx * nx + ny * ny;
      const scallop = Math.sin(px * 0.45) * 0.08 + Math.cos(py * 0.55) * 0.08;
      if (r2 + scallop > 1) return undefined;
      if (topCluster && ny < -0.8) return at(SNOW_BLOSSOM, 4);
      if (ny < -0.52) return at(BLOSSOM, 4);
      if (ny < -0.2) return at(BLOSSOM, 3);
      if (ny > 0.62) return at(BLOSSOM, 0);
      const level = 2.1 - ny * 1.4 - nx * 0.35;
      return hdTone(BLOSSOM, Math.min(3.6, Math.max(0.5, level)), px, py);
    });
  }
}

function drawPetals(canvas: Canvas, rect: Rect, frame: number, seed: number): void {
  if (frame === 0) return;
  const gust = frame >= 5;
  const count = gust ? 16 : 6;
  for (let petal = 0; petal < count; petal++) {
    const fall = (petal * 37 + (frame - 1) * 22) % rect.height;
    const wander = Math.round(Math.sin(petal * 1.7 + frame) * 6) - (gust ? (frame - 4) * 12 : 0);
    const px = rect.x + ((petal * 53 + seed) % rect.width) + wander;
    const py = rect.y + fall;
    canvas.fill(px, py, 2, 2, at(BLOSSOM, 4));
    canvas.set(px + 1, py + 1, at(BLOSSOM, 3));
  }
}

function drawString(canvas: Canvas, swing: number): void {
  const { left, right, y, sag } = STRING;
  const rowAt = (x: number) =>
    y + Math.round(Math.sin(((x - left) / (right - left)) * Math.PI) * sag);
  for (let x = left; x < right; x++) canvas.set(x, rowAt(x), at(ROPE, 2));
  PAPER_LANTERNS.forEach((x, index) => {
    drawPaperLantern(canvas, x, rowAt(x) + 6, index % 2 === 0 ? swing : -swing);
  });
}

const PETAL_RECTS: readonly Rect[] = [
  { x: TREE.x - 190, y: TREE.foot - 200, width: 90, height: 190 },
  { x: TREE.x - 90, y: TREE.foot - 190, width: 90, height: 180 },
  { x: TREE.x + 10, y: TREE.foot - 200, width: 90, height: 190 },
];
const STRING_RECT: Rect = { x: 820, y: STRING.y, width: 310, height: STRING.sag + 50 };

function swingAt(step: number): number {
  if (gusting(step)) return [3, 2, -2, -3, -2, 2][Math.floor(step / 10) % 6] ?? 0;
  return [1, 0, -1, 0][Math.floor(step / 60) % 4] ?? 0;
}

function swingFrame(step: number): number {
  return swingAt(step) + 4;
}

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'string',
    rect: STRING_RECT,
    frames: 8,
    timeline: timelineOf(swingFrame),
  },
  {
    name: 'hall',
    rect: { x: HALL.left + 86, y: HALL.eave - 8, width: 270, height: 44 },
    frames: 8,
    timeline: timelineOf(swingFrame),
  },
  {
    name: 'shide',
    rect: {
      x: GATE.left + GATE.pillar,
      y: GATE.beam + 26,
      width: GATE.right - GATE.left - GATE.pillar + 6,
      height: 36,
    },
    frames: 3,
    timeline: timelineOf((step) =>
      gusting(step) ? 1 + (Math.floor(step / 8) % 2) : Math.floor(step / 90) % 3 === 0 ? 1 : 0,
    ),
  },
  {
    name: 'chime',
    rect: { x: HALL.right + 18, y: HALL.eave + 8, width: 12, height: 18 },
    frames: 3,
    timeline: timelineOf((step) => (gusting(step) ? 1 + (Math.floor(step / 6) % 2) : 0)),
  },
  {
    name: 'incense',
    rect: { x: INCENSE.x - 10, y: INCENSE.y - 54, width: 20, height: 28 },
    frames: 6,
    timeline: timelineOf((step) => (gusting(step) ? 3 : 0) + (Math.floor(step / 12) % 3)),
  },
  {
    name: 'water',
    rect: { x: BASIN.x - 10, y: BASIN.y - 28, width: 20, height: 12 },
    frames: 3,
    timeline: [
      [0, 10],
      [1, 10],
      [2, 10],
    ],
  },
  ...PETAL_RECTS.map((rect, index): Animation => ({
    name: `petals${index}`,
    rect,
    frames: 7,
    timeline: timelineOf((step) => {
      const shifted = step + index * 40;
      if (gusting(step)) return 5 + (Math.floor(shifted / 12) % 2);
      return 1 + (Math.floor(shifted / 24) % 4);
    }),
  })),
  ...STONE_LANTERNS.map((x, index): Animation => ({
    name: `flame${index}`,
    rect: { x: x - 8, y: 436 - 83, width: 16, height: 15 },
    frames: 2,
    timeline: timelineOf((step) => (Math.floor((step + index * 80) / 40) % 3 === 0 ? 1 : 0)),
  })),
];

export function drawMid(
  width: number,
  height: number,
  frameOf: (name: string) => number = () => 0,
  clip?: Rect,
): Canvas {
  const canvas = new Canvas(width, height);
  if (clip) {
    canvas.clip = {
      left: Math.max(0, clip.x),
      top: Math.max(0, clip.y),
      right: Math.min(width, clip.x + clip.width),
      bottom: Math.min(height, clip.y + clip.height),
    };
  }
  const swing = (name: string) => {
    const frame = frameOf(name);
    return frame === 0 ? 0 : frame - 4;
  };
  drawWall(canvas);
  drawGround(canvas);
  drawTree(canvas);
  drawHall(canvas, swing('hall'), frameOf('chime'));
  drawIncense(canvas, frameOf('incense'));
  drawVotivesAndBasin(canvas, frameOf('water'));
  drawGate(canvas, frameOf('shide'));
  drawFox(canvas, GATE.left - 34, 1);
  drawFox(canvas, GATE.right + 34, -1);
  STONE_LANTERNS.forEach((x, index) => {
    drawStoneLantern(canvas, x, frameOf(`flame${index}`));
  });
  drawString(canvas, swing('string'));
  PETAL_RECTS.forEach((rect, index) => {
    drawPetals(canvas, rect, frameOf(`petals${index}`), index * 17);
  });
  canvas.paint(0, BASE - 2, width, 2, (x) =>
    noise(43, x, 0, 20) > 0.6 ? at(SNOW_MOSS, 2) : undefined,
  );
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
