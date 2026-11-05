/**
 * The middle layer (docs/art/decor-temple.md §2.2): the temple's courtyard, in high-detail pixel
 * art and 3D perspective (docs/art/proprete.md). On the left, the main hall (Hondō) with curved
 * tiled roof, rafter tails, veranda railing, shoji doors, bronze incense burner, lanterns and wind
 * chime; by its steps, the ema rack and bamboo tsukubai water basin; in the center, the vermilion
 * torii gate with sacred rope, shide, and sculpted kitsune fox guardians; on the right, two carved
 * stone lanterns, a string of paper lanterns, and the gnarled cherry blossom tree.
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

export const BASE = 410;
const FLOOR_END = 470;
const WALL = { top: 326, cap: 310 } as const;
const HALL = { left: 24, right: 470, base: 352, eave: 214, ridge: 124 } as const;
const GATE = { left: 584, right: 788, pillar: 20, top: 148, beam: 196 } as const;
const STONE_LANTERNS = [884, 1006] as const;
const TREE = { x: 1246, foot: 422 } as const;
const STRING = { left: GATE.right - 6, right: 1154, y: 208, sag: 22 } as const;
const PAPER_LANTERNS = [842, 930, 1018, 1100] as const;
const INCENSE = { x: 246, y: 348 } as const;
const BASIN = { x: 534, y: 416 } as const;

const LIGHTS: readonly Light[] = [
  ...STONE_LANTERNS.map((x): Light => ({ x, y: 336, radius: 105, strength: 1.5, squash: 0.75 })),
  ...PAPER_LANTERNS.map((x): Light => ({ x, y: 240, radius: 75, strength: 0.9, squash: 0.85 })),
  { x: 246, y: 280, radius: 185, strength: 1.35, squash: 0.75 },
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

function litTone(ramp: readonly number[], level: number, x: number, y: number): number {
  return hdTone(ramp, level + lightAt(LIGHTS, x, y), x, y);
}

function drawWall(canvas: Canvas): void {
  canvas.paint(0, WALL.top, canvas.width, BASE - WALL.top, (x, y) => {
    const along = x % 160;
    const post = along < 14;
    const plinth = y > BASE - 14;
    if (post) {
      const pEdge = along < 3 ? 4.3 : along > 11 ? 1.5 : 3;
      return litTone(STONE, pEdge, x, y);
    }
    if (plinth) {
      const block = x % 32 === 0 || y === BASE - 14 ? -1 : 0;
      return litTone(STONE, 2 + block, x, y);
    }
    if (y < WALL.top + 3) return at(STONE, 1);
    const beam = y >= WALL.top + 18 && y < WALL.top + 22;
    if (beam) return litTone(WOOD, y === WALL.top + 18 ? 3 : 1, x, y);
    const stain = (noise(29, x >> 2, y >> 1, 10) - 0.5) * 0.45;
    return litTone(STONE, 3.1 + stain, x, y);
  });
  canvas.paint(0, WALL.cap, canvas.width, WALL.top - WALL.cap, (x, y) => {
    const row = y - WALL.cap;
    if (row === 0) return at(SNOW_TILE, 4);
    if (row < 4) return hdTone(SNOW_TILE, 2.2, x, y);
    if (row === WALL.top - WALL.cap - 1) return at(TILE, 0);
    if (row === WALL.top - WALL.cap - 2) return at(STONE, 4);
    const rib = x % 10 < 3 ? 0.6 : -0.3;
    return hdTone(TILE, 2 + rib - (row % 5 === 0 ? 0.8 : 0), x, y);
  });
  for (let x = 0; x < canvas.width; x++) {
    const tall = Math.round(noise(31, x >> 1, 0, 16) * 6);
    if (tall > 1) canvas.vline(x, BASE - tall, tall, at(MOSS, tall > 3 ? 2 : 1));
  }
}

function drawGround(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    if (y < BASE + 3) return at(STONE, 1);
    const fade = Math.max(0, 1 - (y - BASE) / 48);
    const glow = lightAt(LIGHTS, x, y) * 0.9 * fade;
    const wear = (noise(35, x >> 2, y >> 1, 10) - 0.5) * 0.4 * fade;
    const level = 2.8 + glow + wear;
    const snow = noise(37, x, y, 90) > 0.12;
    return hdTone(snow ? SNOW_STONE : STONE, level, x, y);
  });
  for (const [sx, sy, sw, sh] of [
    [548, 424, 34, 8],
    [608, 426, 38, 9],
    [686, 425, 44, 10],
    [760, 426, 36, 9],
    [838, 424, 32, 8],
  ] as const) {
    canvas.ellipse(sx, sy + 1, sw, sh, at(STONE, 1));
    canvas.ellipse(sx, sy, sw, sh, at(SNOW_STONE, 4));
    canvas.hline(sx + 6, sy, sw - 12, at(SNOW_STONE, 5));
  }
  for (let p = 0; p < 18; p++) {
    const px = TREE.x - 140 + ((p * 23) % 240);
    const py = 414 + ((p * 7) % 14);
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
    const lift = edge < 0.14 ? Math.round(flare * (1 - edge / 0.14) ** 2) : 0;
    const inset = Math.round((1 - Math.min(edge / 0.2, 1)) * (eave - ridge) * 0.55);
    const topY = ridge + inset;
    const botY = eave - lift;
    for (let y = topY; y < botY; y++) {
      if (y === topY) {
        canvas.set(x, y, at(SNOW_TILE, 4));
        continue;
      }
      if (y < topY + 6) {
        canvas.set(x, y, hdTone(SNOW_TILE, 2.2, x, y));
        continue;
      }
      if (y >= botY - 6) {
        if (y === botY - 1) canvas.set(x, y, at(TILE, 0));
        else if (y === botY - 3 && x % 10 >= 2 && x % 10 <= 6) canvas.set(x, y, at(STONE, 5));
        else canvas.set(x, y, at(TILE, 3));
        continue;
      }
      const slope = (y - topY) / Math.max(1, botY - topY);
      const rib = x % 10 < 3 ? 0.55 : x % 10 === 9 ? -0.6 : 0;
      const course = (y - topY) % 8 === 0 ? -0.5 : 0;
      canvas.set(x, y, hdTone(TILE, 1.5 + slope * 1.1 + rib + course, x, y));
    }
  }
  const rLeft = Math.round(left + width * 0.18);
  const rWidth = Math.round(width * 0.64);
  canvas.fill(rLeft, ridge - 8, rWidth, 8, at(TILE, 3));
  canvas.hline(rLeft, ridge - 8, rWidth, at(SNOW_TILE, 4));
  canvas.hline(rLeft, ridge - 4, rWidth, at(STONE, 5));
  for (const ox of [rLeft - 6, rLeft + rWidth - 4]) {
    canvas.fill(ox, ridge - 18, 10, 18, at(TILE, 3));
    canvas.vline(ox + 2, ridge - 18, 16, at(STONE, 5));
    canvas.fill(ox - 2, ridge - 20, 14, 4, at(SNOW_TILE, 4));
  }
}

function drawPaperLantern(canvas: Canvas, x: number, y: number, swing: number): void {
  const body = new Mask(canvas.width, canvas.height);
  const cx = x + swing;
  body.ellipse(cx - 9, y + 4, 18, 24);
  canvas.line(x, y - 6, cx, y + 4, at(ROPE, 1));
  canvas.paint(cx - 12, y - 2, 24, 34, (px, py) => {
    if (!body.has(px, py)) return undefined;
    const rib = (py - y) % 5 === 0;
    const dist = Math.hypot((px - cx) / 8, (py - (y + 16)) / 11);
    const level = (rib ? 1.8 : 2.6) + Math.max(0, 1 - dist) * 1.4;
    return hdTone(LANTERN, level, px, py);
  });
  canvas.fill(cx - 6, y + 2, 12, 3, at(WOOD, 1));
  canvas.hline(cx - 6, y + 2, 12, at(WOOD, 3));
  canvas.fill(cx - 6, y + 26, 12, 3, at(WOOD, 1));
  canvas.vline(cx, y + 29, 5, at(ROPE, 2));
}

function drawIncense(canvas: Canvas, frame: number): void {
  const { x, y } = INCENSE;
  canvas.fill(x - 14, y, 28, 16, at(BRONZE, 1));
  canvas.hline(x - 14, y, 28, at(BRONZE, 3));
  canvas.fill(x - 11, y - 8, 22, 8, at(BRONZE, 2));
  canvas.hline(x - 12, y - 8, 24, at(BRONZE, 3));
  canvas.fill(x - 4, y - 10, 8, 2, at(LANTERN, 2));
  const lean = frame >= 3 ? -3 : 0;
  const phase = frame % 3;
  for (let i = 0; i < 9; i++) {
    const rise = 3 + i * 3;
    const sx = x + Math.round(Math.sin((i + phase) * 0.9) * 2.5 + (lean * i) / 4);
    const sy = y - 10 - rise;
    canvas.fill(sx, sy, 2, 2, at(PAPER, i < 4 ? 2 : 1));
  }
}

function drawHall(canvas: Canvas, swing: number, chime: number): void {
  const { left, right, base, eave, ridge } = HALL;
  canvas.paint(left - 12, base, right - left + 24, BASE - base + 6, (x, y) => {
    if (y === base) return at(STONE, 6);
    if (y < base + 5) return litTone(STONE, 4.4, x, y);
    const block = x % 48 < 2 || (y - base) % 14 === 0 ? -1.1 : 0;
    return litTone(STONE, 3.1 + block, x, y);
  });
  const stairX = right - 96;
  const stairW = 86;
  for (let step = 0; step < 5; step++) {
    const y = base + 8 + step * 11;
    const sx = stairX + step * 4;
    canvas.fill(sx, y, stairW, 11, litTone(STONE, 4.2 - (step % 2) * 0.5, right, y));
    canvas.hline(sx, y, stairW, at(SNOW_STONE, 6));
    canvas.hline(sx, y + 3, stairW, at(STONE, 1));
  }
  canvas.polygon(
    [
      [stairX - 6, base + 4],
      [stairX, base + 4],
      [stairX + 20, BASE + 6],
      [stairX + 12, BASE + 6],
    ],
    at(STONE, 4),
  );
  canvas.paint(left + 20, eave, right - left - 40, base - eave, (x, y) => {
    const shoji = y > eave + 22 && y < base - 18 && x > left + 112 && x < left + 332;
    const gridX = (x - left) % 16 === 0;
    const gridY = (y - eave) % 14 === 0;
    if (shoji) {
      if (gridX || gridY) return at(WOOD, 2);
      const dist = Math.hypot((x - (left + 222)) / 90, (y - (eave + 86)) / 42);
      if (dist < 0.38 && y > eave + 66) return hdTone(LANTERN, 1.2 - dist * 1.5, x, y);
      return hdTone(PAPER, Math.min(1, Math.max(0, 1.1 - dist * 0.85)), x, y);
    }
    const panel = (x - left) % 32 < 2 || (y - eave) % 28 < 2;
    return hdTone(WOOD, panel ? 2.2 : 0.8, x, y);
  });
  for (let x = left + 20; x <= right - 40; x += 92) {
    canvas.paint(x, eave - 4, 16, base - eave + 4, (px, py) => {
      const u = (px - x) / 16;
      return litTone(LACQUER, 4.2 - u * 2.6, px, py);
    });
    canvas.fill(x - 2, base - 6, 20, 6, at(BRONZE, 2));
    canvas.hline(x - 2, base - 6, 20, at(BRONZE, 3));
  }
  canvas.hline(left + 12, base - 16, right - left - 24, at(LACQUER, 4));
  canvas.fill(left + 12, base - 15, right - left - 24, 3, at(LACQUER, 2));
  canvas.hline(left + 12, base - 9, right - left - 24, at(LACQUER, 3));
  for (let rx = left + 16; rx <= right - 16; rx += 28) {
    canvas.fill(rx, base - 18, 3, 18, at(LACQUER, 3));
    canvas.fill(rx - 1, base - 21, 5, 3, at(BRONZE, 3));
  }
  canvas.fill(left, eave - 12, right - left, 12, at(LACQUER, 2));
  canvas.hline(left, eave - 12, right - left, at(LACQUER, 4));
  for (let tx = left + 6; tx < right - 6; tx += 12) {
    canvas.fill(tx, eave - 10, 4, 6, at(WOOD, 3));
    canvas.hline(tx, eave - 10, 4, at(PAPER, 2));
  }
  drawRoof(canvas, left - 40, right + 40, ridge, eave - 8, 24);
  drawPaperLantern(canvas, left + 110, eave + 2, swing);
  drawPaperLantern(canvas, left + 330, eave + 2, swing);
  const corner = right + 26;
  canvas.vline(corner, eave - 14, 18, at(ROPE, 1));
  canvas.fill(corner - 4, eave + 4, 9, 7, at(BRONZE, 3));
  canvas.vline(corner + ([0, 2, -2][chime % 3] ?? 0), eave + 11, 12, at(PAPER, 2));
}

function drawVotivesAndBasin(canvas: Canvas, waterFrame: number): void {
  const x = 482;
  canvas.fill(x - 4, 344, 68, 5, at(TILE, 3));
  canvas.hline(x - 4, 344, 68, at(SNOW_TILE, 4));
  canvas.fill(x, 349, 4, BASE - 349, at(WOOD, 2));
  canvas.fill(x + 56, 349, 4, BASE - 349, at(WOOD, 2));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const ex = x + 6 + i * 9;
      const ey = 356 + row * 14;
      canvas.fill(ex, ey, 7, 9, at(WOOD, 4));
      canvas.hline(ex + 1, ey - 1, 5, at(WOOD, 3));
      canvas.fill(ex + 2, ey + 3, 3, 2, at(LACQUER, 3));
    }
  }
  canvas.hline(x + 2, 390, 56, at(ROPE, 1));
  for (let i = 0; i < 6; i++) canvas.fill(x + 6 + i * 8, 390, 3, 4, at(PAPER, 2));
  const bx = BASIN.x;
  const by = BASIN.y;
  canvas.fill(bx - 16, by - 18, 32, 18, at(STONE, 3));
  canvas.hline(bx - 16, by - 18, 32, at(SNOW_STONE, 5));
  canvas.fill(bx - 12, by - 17, 24, 4, at(SEA, 3));
  canvas.hline(bx - 8 + (waterFrame % 3) * 2, by - 15, 10, at(GLITTER, 2));
  canvas.fill(bx + 10, by - 36, 4, 22, at(MOSS, 2));
  canvas.line(bx + 10, by - 32, bx - 2, by - 26, at(MOSS, 3), 2);
  for (let wy = by - 25; wy < by - 16; wy += 2) {
    if ((wy + waterFrame) % 3 !== 0) {
      canvas.set(bx - 3, wy, at(GLITTER, 2));
      canvas.set(bx - 2, wy, at(GLITTER, 1));
    }
  }
}

function drawRope(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, beam } = GATE;
  const y0 = beam + 24;
  for (let x = left + pillar; x < right; x++) {
    const t = (x - left - pillar) / (right - left - pillar);
    const y = y0 + Math.round(Math.sin(t * Math.PI) * 10);
    const thick = Math.round(4 + Math.sin(t * Math.PI) * 3);
    canvas.fill(x, y, 1, thick, at(ROPE, (x + y) % 6 < 3 ? 2 : 1));
    canvas.set(x, y, at(ROPE, 2));
  }
  for (let i = 1; i < 5; i++) {
    const x = left + pillar + Math.round(((right - left - pillar) * i) / 5);
    const t = i / 5;
    const top = y0 + 6 + Math.round(Math.sin(t * Math.PI) * 10);
    const lean = flutter === 0 ? 0 : flutter === 1 ? 2 : 4;
    for (let seg = 0; seg < 4; seg++) {
      const sx = x + (seg % 2 === 0 ? 0 : 3) + Math.round((lean * seg) / 3);
      canvas.fill(sx, top + seg * 5, 4, 5, at(PAPER, seg % 2 === 0 ? 2 : 1));
    }
  }
}

function drawGate(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, top, beam } = GATE;
  const cx = Math.round((left + right + pillar) / 2);
  canvas.fill(cx - 8, top + 14, 16, beam - top - 14, at(WOOD, 1));
  canvas.fill(cx - 6, top + 16, 12, beam - top - 18, at(LACQUER, 1));
  canvas.hline(cx - 8, top + 14, 16, at(BRONZE, 3));
  canvas.fill(cx - 2, top + 22, 4, 14, at(LANTERN, 3));
  for (const x of [left, right - pillar]) {
    canvas.paint(x, top + 10, pillar, BASE + 4 - top - 10, (px, py) => {
      const u = (px - x) / pillar;
      return hdTone(LACQUER, 4.3 - u * 2.8, px, py);
    });
    canvas.fill(x - 3, BASE - 20, pillar + 6, 24, at(WOOD, 0));
    canvas.hline(x - 3, BASE - 20, pillar + 6, at(BRONZE, 3));
    canvas.fill(x - 6, BASE - 4, pillar + 12, 8, at(STONE, 3));
    canvas.hline(x - 6, BASE - 4, pillar + 12, at(STONE, 5));
  }
  canvas.fill(left - 18, beam, right - left + pillar + 16, 11, at(LACQUER, 3));
  canvas.hline(left - 18, beam, right - left + pillar + 16, at(LACQUER, 4));
  canvas.hline(left - 18, beam + 10, right - left + pillar + 16, at(LACQUER, 1));
  for (const wx of [left - 6, right - pillar - 2]) {
    canvas.fill(wx, beam - 3, pillar + 8, 3, at(WOOD, 2));
  }
  for (let x = left - 44; x < right + pillar + 24; x++) {
    const t = (x - (left - 44)) / (right - left + pillar + 68);
    const up = Math.round(((t - 0.5) * 2) ** 4 * 16);
    canvas.fill(x, top - up, 1, 10, at(WOOD, 1));
    canvas.fill(x, top - up, 1, 2, at(SNOW_TILE, 4));
    canvas.fill(x, top + 10 - up, 1, 7, at(LACQUER, 3));
    canvas.set(x, top + 10 - up, at(LACQUER, 4));
  }
  drawRope(canvas, flutter);
}

function drawFox(canvas: Canvas, x: number, facing: -1 | 1): void {
  const foot = BASE + 4;
  canvas.fill(x - 18, foot - 6, 36, 6, at(STONE, 2));
  canvas.hline(x - 18, foot - 6, 36, at(STONE, 4));
  canvas.fill(x - 15, foot - 20, 30, 14, at(STONE, 3));
  canvas.hline(x - 15, foot - 20, 30, at(SNOW_STONE, 5));
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
    return litTone(STONE, rim ? 5.2 : shade ? 2 : 3.5, px, py);
  });
  canvas.fill(x - 7 + facing * 3, foot - 50, 14, 6, at(BIB, 1));
  canvas.fill(x - 5 + facing * 3, foot - 44, 10, 4, at(BIB, 0));
  canvas.fill(x + facing * 4, foot - 47, 2, 2, at(LANTERN, 3));
}

function drawStoneLantern(canvas: Canvas, x: number, flame: number): void {
  const foot = BASE + 4;
  canvas.fill(x - 16, foot - 6, 32, 6, at(STONE, 2));
  canvas.hline(x - 16, foot - 6, 32, at(STONE, 5));
  canvas.fill(x - 12, foot - 14, 24, 8, at(STONE, 3));
  canvas.hline(x - 12, foot - 14, 24, at(STONE, 5));
  canvas.paint(x - 7, foot - 58, 14, 44, (px, py) => {
    const ring = Math.abs(py - (foot - 36)) <= 2;
    const u = (px - (x - 7)) / 14;
    return litTone(STONE, (ring ? 4.8 : 4.2) - u * 2.2, px, py);
  });
  canvas.fill(x - 16, foot - 65, 32, 7, at(STONE, 4));
  canvas.hline(x - 16, foot - 65, 32, at(STONE, 6));
  canvas.fill(x - 12, foot - 87, 24, 22, at(STONE, 2));
  canvas.vline(x - 12, foot - 87, 22, at(STONE, 4));
  canvas.fill(x - 7, foot - 82, 14, 14, at(LANTERN, flame === 0 ? 2 : 3));
  canvas.fill(x - 3, foot - 79, 6, 8, at(LANTERN, 4));
  canvas.vline(x, foot - 82, 14, at(WOOD, 2));
  canvas.hline(x - 7, foot - 75, 14, at(WOOD, 2));
  for (let row = 0; row < 12; row++) {
    const half = Math.round(7 + row * 1.5);
    const ry = foot - 99 + row;
    canvas.hline(x - half, ry, half * 2, at(STONE, row < 3 ? 5 : 4));
    if (row >= 9) {
      canvas.set(x - half - 1, ry - 1, at(STONE, 5));
      canvas.set(x + half, ry - 1, at(STONE, 3));
    }
  }
  canvas.hline(x - 12, foot - 100, 24, at(SNOW_STONE, 7));
  canvas.fill(x - 3, foot - 107, 6, 7, at(STONE, 5));
  canvas.set(x - 1, foot - 109, at(STONE, 6));
}

function drawTree(canvas: Canvas): void {
  const { x, foot } = TREE;
  canvas.fill(x - 28, foot - 6, 56, 8, at(STONE, 2));
  canvas.hline(x - 28, foot - 6, 56, at(SNOW_STONE, 5));
  const wood = new Mask(canvas.width, canvas.height);
  wood.limb(x - 14, foot - 4, x - 2, foot - 34, 7);
  wood.limb(x + 14, foot - 4, x + 2, foot - 34, 7);
  wood.limb(x, foot - 6, x - 6, foot - 142, 11);
  wood.limb(x - 6, foot - 142, x - 94, foot - 234, 7);
  wood.limb(x - 6, foot - 142, x + 64, foot - 252, 7);
  wood.limb(x - 48, foot - 196, x - 146, foot - 216, 4);
  wood.limb(x + 28, foot - 198, x + 114, foot - 216, 4);
  canvas.paint(x - 170, foot - 280, 310, 284, (px, py) => {
    if (!wood.has(px, py)) return undefined;
    const barkGrain = (px + Math.floor(py / 4)) % 5 === 0 ? -0.5 : 0;
    const level = (!wood.has(px - 2, py) ? 3.2 : !wood.has(px + 2, py) ? 0.6 : 1.8) + barkGrain;
    return hdTone(BARK, level, px, py);
  });
  const clusters = [
    [-162, -214, 74, 42],
    [-124, -252, 96, 58],
    [-64, -294, 126, 74],
    [26, -302, 124, 78],
    [88, -258, 92, 58],
    [-12, -242, 114, 58],
    [56, -216, 88, 44],
  ] as const;
  for (const [dx, dy, w, h] of clusters) {
    const cx = x + dx + w / 2;
    const cy = foot + dy + h / 2;
    canvas.paint(x + dx, foot + dy, w, h, (px, py) => {
      const nx = (px + 0.5 - cx) / (w / 2);
      const ny = (py + 0.5 - cy) / (h / 2);
      if (nx * nx + ny * ny > 1) return undefined;
      if (ny < -0.9) return at(SNOW_BLOSSOM, 4);
      if (ny < -0.74) return at(SNOW_BLOSSOM, 3);
      if (ny < -0.52) return at(BLOSSOM, 3);
      if (ny > 0.68) return at(BLOSSOM, 0);
      const level = 1.8 - ny * 1.1 + nx * 0.35;
      return hdTone(BLOSSOM, Math.min(3, Math.max(0.4, level)), px, py);
    });
  }
}

function drawPetals(canvas: Canvas, rect: Rect, frame: number, seed: number): void {
  if (frame === 0) return;
  const gust = frame >= 5;
  const count = gust ? 14 : 5;
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
  for (let x = left; x < right; x++) canvas.set(x, rowAt(x), at(ROPE, 1));
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
    rect: { x: HALL.left + 90, y: HALL.eave - 8, width: 270, height: 44 },
    frames: 8,
    timeline: timelineOf(swingFrame),
  },
  {
    name: 'shide',
    rect: {
      x: GATE.left + GATE.pillar,
      y: GATE.beam + 28,
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
    rect: { x: HALL.right + 20, y: HALL.eave + 8, width: 12, height: 18 },
    frames: 3,
    timeline: timelineOf((step) => (gusting(step) ? 1 + (Math.floor(step / 6) % 2) : 0)),
  },
  {
    name: 'incense',
    rect: { x: INCENSE.x - 12, y: INCENSE.y - 38, width: 20, height: 28 },
    frames: 6,
    timeline: timelineOf((step) => (gusting(step) ? 3 : 0) + (Math.floor(step / 12) % 3)),
  },
  {
    name: 'water',
    rect: { x: BASIN.x - 10, y: BASIN.y - 26, width: 20, height: 12 },
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
    rect: { x: x - 7, y: BASE + 4 - 82, width: 14, height: 14 },
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
