/**
 * The dock's fixtures (docs/art/decor-dock.md §2.2), drawn in clean flat tones and 3D relief
 * (docs/art/proprete.md): the roll-up shutters, the stage door and its chain, the lamps, the
 * dumpster and its cat, the pallets, the freight lift's gate, the alley's fence.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, type Random } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { drawHalo, drawTubes } from '../rue/signs.ts';
import {
  ASPHALT,
  BAG,
  CAT,
  DUMPSTER,
  EXIT,
  GLASS,
  HAZARD,
  PAPER,
  POSTER_RED,
  RUBBER,
  RUST,
  SHUTTER,
  SODIUM,
  STEEL,
  TAG,
  WOOD,
} from './palette.ts';

const SLAT = 6;
export const LOOSE = SLAT * 5;

function clampedStep(ramp: readonly number[], step: number): number {
  return at(ramp, Math.max(0, Math.min(ramp.length - 1, Math.round(step))));
}

export function drawShutter(
  canvas: Canvas,
  rect: Rect,
  bottom: number,
  label: string,
  lights: readonly Light[],
  seed: number,
  rattle = 0,
): void {
  const { x, y, width } = rect;
  const hood = 12;
  canvas.fill(x - 8, y + hood, 2, rect.height - hood, at(STEEL, 0));
  for (const [gx, litSide] of [
    [x - 6, true],
    [x + width, false],
  ] as const) {
    canvas.fill(gx, y, 6, rect.height, at(STEEL, 2));
    canvas.vline(gx + (litSide ? 0 : 5), y, rect.height, at(STEEL, 4));
    canvas.vline(gx + (litSide ? 5 : 0), y, rect.height, at(STEEL, 0));
  }
  const top = y + hood;
  const loose = bottom - LOOSE;
  canvas.paint(x, top, width, bottom - top, (px, py) => {
    const shift = py >= loose ? rattle : 0;
    const row = (py - top + shift + SLAT * 10) % SLAT;
    if (row === SLAT - 1) return at(SHUTTER, 0);
    const edgeShade = px < x + 4 || px >= x + width - 4 ? -1 : 0;
    const lit = lightAt(lights, px, py);
    const band = lit > 1.05 ? 3 : lit > 0.55 ? 2 : 1;
    const groove = row === 0 ? 1 : row === SLAT - 2 ? -1 : 0;
    const low = (py - top) / Math.max(1, bottom - top);
    const rustPatch =
      low > 0.55 &&
      noise(seed, Math.floor(px / 4), Math.floor(py / SLAT), 3) > 0.74 - (low - 0.55) * 0.28;
    if (rustPatch) {
      return clampedStep(RUST, 1 + (row === 0 ? 1 : 0));
    }
    return clampedStep(SHUTTER, band + groove + edgeShade);
  });
  canvas.fill(x, top, width, 3, at(SHUTTER, 0));
  const scale = Math.min(5, Math.floor((bottom - top - 8) / 7));
  const textWidth = spell(label, scale, 1, () => undefined);
  const lx = x + Math.round((width - textWidth) / 2);
  const ly = top + Math.round((bottom - top - 7 * scale) * 0.4);
  spell(label, Math.max(scale, 1), 1, (px, py) => {
    const sx = lx + px;
    const sy = ly + py;
    if (scale < 1 || sy >= bottom - 6) return;
    const row = (sy - top) % SLAT;
    if (row === SLAT - 1) return;
    canvas.set(sx, sy, at(TAG.cream, row === 0 ? 1 : 0));
  });
  const barY = bottom - 5 - (rattle > 0 ? 2 : 0);
  canvas.fill(x, barY, width, 4, at(STEEL, 2));
  canvas.hline(x, barY, width, at(STEEL, 4));
  canvas.hline(x, barY + 4, width, at(RUBBER, 0));
  canvas.fill(x + width / 2 - 10, barY - 6, 20, 4, at(STEEL, 1));
  canvas.hline(x + width / 2 - 10, barY - 6, 20, at(STEEL, 4));
  canvas.fill(x + width / 2 - 6, barY - 4, 12, 2, at(STEEL, 0));
  canvas.fill(x - 8, y - 3, width + 16, 3, at(STEEL, 3));
  canvas.hline(x - 8, y - 3, width + 16, at(STEEL, 5));
  canvas.fill(x - 8, y, width + 16, hood, at(STEEL, 2));
  canvas.hline(x - 8, y, width + 16, at(STEEL, 4));
  canvas.hline(x - 8, y + hood - 2, width + 16, at(STEEL, 1));
  canvas.hline(x - 8, y + hood - 1, width + 16, at(STEEL, 0));
  for (const bx of [x - 8, x + width + 5]) {
    canvas.fill(bx, y - 3, 3, hood + 3, at(STEEL, 3));
    canvas.vline(bx, y - 3, hood + 3, at(STEEL, 5));
  }
}

export function drawStageDoor(canvas: Canvas, rect: Rect, lights: readonly Light[]): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 6, y - 6, width + 12, height + 6, at(STEEL, 1));
  canvas.hline(x - 6, y - 6, width + 12, at(STEEL, 4));
  canvas.vline(x - 6, y - 6, height + 6, at(STEEL, 3));
  canvas.fill(x - 2, y - 2, width + 4, height + 2, at(STEEL, 0));
  canvas.paint(x, y, width, height, (px, py) => {
    const lit = lightAt(lights, px, py) > 0.75 ? 3 : 2;
    const border = px - x < 4 || px - x >= width - 4 || py - y < 5 || py - y >= height - 6;
    if (border) return at(STEEL, lit);
    const panelX = px - x >= 7 && px - x < width - 7;
    const upperPanel = panelX && py - y >= 8 && py - y < 42;
    const lowerPanel = panelX && py - y >= 50 && py - y < height - 10;
    if (upperPanel || lowerPanel) {
      const topOrLeft = py - y === 8 || py - y === 50 || px - x === 7;
      const botOrRight = py - y === 41 || py - y === height - 11 || px - x === width - 8;
      if (topOrLeft) return at(STEEL, 0);
      if (botOrRight) return at(STEEL, 3);
      return at(STEEL, 1);
    }
    return at(STEEL, lit);
  });
  for (let py = y + 8; py < y + height - 6; py += 14) {
    canvas.set(x + 2, py, at(STEEL, 4));
    canvas.set(x + width - 3, py, at(STEEL, 4));
  }
  canvas.hline(x + 2, y + height - 2, width - 4, at(GLASS, 3));
  canvas.hline(x, y + height - 1, width, at(GLASS, 2));
  const hy = y + 48;
  canvas.fill(x + width - 9, hy - 8, 3, 18, at(STEEL, 5));
  canvas.fill(x + width + 1, hy - 3, 5, 8, at(STEEL, 3));
  for (let i = 0; i < 9; i++) {
    const cx = x + width - 8 + i;
    const cy = hy + Math.round(Math.sin((i / 8) * Math.PI) * 5);
    canvas.set(cx, cy, at(STEEL, i % 2 === 0 ? 5 : 3));
    canvas.set(cx, cy - 6 + Math.round(Math.sin((i / 8) * Math.PI) * 2), at(STEEL, 3));
  }
  canvas.fill(x + width - 3, hy + 6, 7, 7, at(STEEL, 4));
  canvas.hline(x + width - 3, hy + 6, 7, at(STEEL, 5));
  canvas.set(x + width, hy + 9, at(STEEL, 0));
  canvas.vline(x + width - 1, hy + 2, 4, at(STEEL, 4));
  canvas.vline(x + width + 2, hy + 2, 4, at(STEEL, 4));
}

export function drawExitSign(canvas: Canvas, x: number, y: number): void {
  const width = spell('EXIT', 1, 1, () => undefined) + 8;
  canvas.fill(x - 1, y - 1, width + 2, 14, at(STEEL, 0));
  canvas.fill(x, y, width, 12, at(STEEL, 2));
  canvas.hline(x, y, width, at(STEEL, 4));
  canvas.fill(x + 1, y + 1, width - 2, 10, at(EXIT, 0));
  const glow = new Mask(canvas.width, canvas.height);
  spell('EXIT', 1, 1, (px, py) => {
    glow.add(x + 4 + px, y + 2 + py);
  });
  drawHalo(canvas, glow, EXIT, 1.5);
  spell('EXIT', 1, 1, (px, py) => {
    canvas.set(x + 4 + px, y + 2 + py, at(EXIT, 3));
  });
}

export function drawCagedLamp(canvas: Canvas, x: number, y: number): void {
  const bulb = new Mask(canvas.width, canvas.height);
  bulb.rect(x - 3, y, 7, 8);
  drawHalo(canvas, bulb, SODIUM, 7);
  canvas.fill(x - 6, y - 4, 13, 3, at(STEEL, 2));
  canvas.hline(x - 6, y - 4, 13, at(STEEL, 4));
  canvas.fill(x - 3, y, 7, 8, at(SODIUM, 3));
  canvas.fill(x - 1, y + 2, 3, 4, at(SODIUM, 4));
  for (const px of [x - 4, x, x + 4]) canvas.vline(px, y - 1, 10, at(STEEL, 1));
  canvas.hline(x - 4, y + 9, 9, at(STEEL, 1));
}

export function drawWallPack(canvas: Canvas, cx: number, y: number): void {
  canvas.fill(cx - 10, y - 1, 20, 9, at(STEEL, 1));
  canvas.fill(cx - 9, y, 18, 7, at(STEEL, 2));
  canvas.hline(cx - 9, y, 18, at(STEEL, 4));
  const lens = new Mask(canvas.width, canvas.height);
  lens.rect(cx - 7, y + 7, 14, 3);
  drawHalo(canvas, lens, SODIUM, 6);
  drawTubes(canvas, lens, SODIUM);
}

export function drawDumpster(canvas: Canvas, x: number, foot: number, width: number): void {
  const height = 46;
  const top = foot - height;
  const sideW = 12;
  canvas.fill(x - 4, foot - 2, width + 8, 4, at(ASPHALT, 0));
  canvas.polygon(
    [
      [x, top],
      [x + sideW, top - 6],
      [x + sideW, foot - 8],
      [x, foot - 4],
    ],
    at(DUMPSTER, 0),
  );
  const faceX = x + sideW;
  const faceW = width - sideW;
  canvas.paint(faceX, top - 6, faceW, height - 2, (px, py) => {
    const rx = (px - faceX) % 16;
    if (rx === 7) return at(DUMPSTER, 0);
    if (rx === 8 || rx === 9) return at(DUMPSTER, 2);
    if (py > top + 24 && rx > 11 && ((px + py) >> 2) % 5 === 0) return at(RUST, 1);
    return at(DUMPSTER, py < top + 12 ? 2 : 1);
  });
  canvas.hline(faceX, top + 10, faceW, at(DUMPSTER, 2));
  canvas.hline(faceX, top + 11, faceW, at(DUMPSTER, 0));
  canvas.vline(x + width - 1, top - 6, height - 2, at(DUMPSTER, 3));
  canvas.polygon(
    [
      [x - 2, top - 4],
      [x + sideW, top - 11],
      [x + width + 2, top - 11],
      [x + width - sideW + 2, top - 4],
    ],
    at(DUMPSTER, 2),
  );
  canvas.hline(x + sideW, top - 11, faceW + 2, at(DUMPSTER, 3));
  canvas.hline(x - 2, top - 4, width - sideW + 4, at(DUMPSTER, 3));
  canvas.line(
    x + Math.round(width / 2) - 2,
    top - 4,
    x + Math.round(width / 2) + sideW - 2,
    top - 11,
    at(DUMPSTER, 0),
    2,
  );
  for (const px of [x + 2, x + sideW + 4, x + width - 10]) {
    canvas.fill(px, foot - 5, 7, 5, at(RUBBER, 1));
    canvas.set(px + 3, foot - 3, at(STEEL, 3));
  }
}

export function drawCat(canvas: Canvas, x: number, foot: number, frame: number): void {
  const body = at(CAT, 0);
  const rim = at(CAT, 1);
  if (frame === 2) {
    for (let dx = 0; dx < 16; dx++) {
      const hump = Math.round(Math.sin((dx / 15) * Math.PI) * 6);
      canvas.vline(x + dx, foot - 12 - hump, 6 + Math.round(hump / 2), body);
      canvas.set(x + dx, foot - 13 - hump, rim);
    }
    for (const lx of [x + 1, x + 4, x + 11, x + 14]) canvas.vline(lx, foot - 8, 8, body);
    canvas.fill(x - 5, foot - 16, 7, 6, body);
    canvas.set(x - 5, foot - 17, body);
    canvas.set(x, foot - 17, body);
    canvas.set(x - 3, foot - 14, at(HAZARD, 2));
    canvas.fill(x + 15, foot - 24, 3, 12, body);
    canvas.vline(x + 18, foot - 23, 10, rim);
    return;
  }
  canvas.fill(x + 2, foot - 11, 12, 11, body);
  canvas.fill(x + 1, foot - 5, 14, 5, body);
  canvas.fill(x + 3, foot - 17, 8, 7, body);
  canvas.set(x + 3, foot - 18, body);
  canvas.set(x + 10, foot - 18, body);
  canvas.vline(x + 13, foot - 11, 11, rim);
  canvas.set(x + 5, foot - 14, at(HAZARD, 2));
  canvas.set(x + 8, foot - 14, at(HAZARD, 2));
  const tail: readonly (readonly [number, number])[] =
    frame === 1
      ? [
          [15, -1],
          [17, -3],
          [18, -6],
          [18, -9],
          [17, -11],
        ]
      : [
          [15, -1],
          [17, -1],
          [19, -1],
          [20, -2],
          [21, -4],
        ];
  for (const [dx, dy] of tail) canvas.fill(x + dx, foot + dy, 2, 2, body);
}

export function drawBags(
  canvas: Canvas,
  x: number,
  foot: number,
  count: number,
  random: Random,
): void {
  for (let bag = 0; bag < count; bag++) {
    const width = random.int(16, 22);
    const height = random.int(14, 19);
    const bx = x + bag * 13 - random.int(0, 4);
    const by = foot - height - (bag % 2) * random.int(4, 8);
    const mask = new Mask(canvas.width, canvas.height);
    mask.ellipse(bx, by, width, height);
    mask.ellipse(bx + width / 2 - 2, by - 4, 5, 6);
    for (let py = by - 5; py < by + height; py++) {
      for (let px = bx; px < bx + width; px++) {
        if (!mask.has(px, py)) continue;
        const gloss = Math.hypot(px - bx - width * 0.32, py - by - height * 0.3) < 3.2 ? 2 : 0;
        const edge = !mask.has(px, py - 1) ? 1 : !mask.has(px, py + 1) ? -1 : 0;
        canvas.set(px, py, at(BAG, 1 + gloss + edge));
      }
    }
  }
}

const PALLET = 9;

function drawPallet(canvas: Canvas, x: number, foot: number, width: number): void {
  const top = foot - PALLET;
  canvas.fill(x - 5, top - 2, 5, 3, at(WOOD, 1));
  canvas.hline(x - 5, top - 2, width, at(WOOD, 2));
  canvas.fill(x, top, width, 3, at(WOOD, 2));
  canvas.hline(x, top, width, at(WOOD, 3));
  canvas.fill(x, top + 3, width, 4, at(STEEL, 0));
  for (const bx of [x + 1, x + Math.floor(width / 2) - 4, x + width - 9]) {
    canvas.fill(bx, top + 3, 8, 4, at(WOOD, 1));
    canvas.vline(bx + 7, top + 3, 4, at(WOOD, 2));
  }
  canvas.fill(x, foot - 2, width, 2, at(WOOD, 1));
}

export function drawPallets(canvas: Canvas, x: number, foot: number, count: number): void {
  canvas.fill(x - 6, foot, 66, 2, at(ASPHALT, 0));
  for (let level = 0; level < count; level++) {
    const shift = [0, 2, -1, 3, 1, -2][level] ?? 0;
    drawPallet(canvas, x + shift, foot - level * PALLET, 58);
  }
}

export function drawLiftGate(canvas: Canvas, rect: Rect): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 6, y - 6, width + 12, height + 6, at(STEEL, 2));
  canvas.hline(x - 6, y - 6, width + 12, at(STEEL, 4));
  canvas.vline(x - 6, y - 6, height + 6, at(STEEL, 3));
  canvas.fill(x, y, width, height, at(STEEL, 0));
  canvas.fill(x + 4, y + 4, width - 8, 18, at(STEEL, 1));
  canvas.fill(x + width / 2 - 3, y + 6, 6, 4, at(SODIUM, 3));
  canvas.fill(x + width / 2 - 1, y + 7, 2, 2, at(SODIUM, 4));
  const cell = 14;
  canvas.paint(x, y, width, height, (px, py) => {
    const u = (px - x + py - y) % cell;
    const v = (px - x - (py - y) + cell * 40) % cell;
    if ((px - x) % cell === 0) return at(STEEL, 3);
    if (u === 0 || u === 1 || v === 0 || v === 1) return at(STEEL, 2);
    return undefined;
  });
  canvas.fill(x, y, width, 3, at(STEEL, 4));
  canvas.fill(x, y + height - 3, width, 3, at(STEEL, 4));
}

export function drawFence(canvas: Canvas, left: number, right: number, top: number, foot: number) {
  const cell = 12;
  canvas.paint(left, top, right - left, foot - top, (px, py) => {
    const u = (px - left + py) % cell;
    const v = (px - left - py + cell * 60) % cell;
    return u === 0 || v === 0 ? at(STEEL, 1) : undefined;
  });
  canvas.fill(left, top, right - left, 3, at(STEEL, 3));
  canvas.hline(left, top, right - left, at(STEEL, 4));
  canvas.fill(left, foot - 2, right - left, 2, at(STEEL, 2));
  for (const px of [left, Math.round((left + right) / 2), right - 4]) {
    canvas.fill(px, top - 14, 4, foot - top + 14, at(STEEL, 2));
    canvas.vline(px, top - 14, foot - top + 14, at(STEEL, 4));
  }
  for (let px = left + 4; px < right - 8; px += 10) {
    canvas.ellipse(px, top - 11, 8, 8, at(STEEL, 2));
    canvas.set(px + 4, top - 11, at(STEEL, 4));
  }
}

export function drawPlate(canvas: Canvas, rect: Rect, lines: readonly string[]): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 1, y - 1, width + 2, height + 2, at(STEEL, 1));
  canvas.fill(x, y, width, height, at(PAPER, 2));
  canvas.hline(x, y, width, at(PAPER, 3));
  canvas.hline(x, y + height - 1, width, at(PAPER, 1));
  canvas.set(x + 2, y + 2, at(STEEL, 2));
  canvas.set(x + width - 3, y + 2, at(STEEL, 2));
  lines.forEach((text, index) => {
    const textWidth = spell(text, 1, 1, () => undefined);
    spell(text, 1, 1, (px, py) => {
      canvas.set(
        x + Math.round((width - textWidth) / 2) + px,
        y + 4 + index * 10 + py,
        at(POSTER_RED, 1),
      );
    });
  });
}

export function drawStreak(canvas: Canvas, x: number, y: number, length: number): void {
  const h = Math.max(4, Math.round(length * 0.7));
  canvas.vline(x, y, h, at(RUST, 1));
  canvas.vline(x + 1, y, Math.max(2, Math.round(h * 0.6)), at(RUST, 0));
}

export function concreteAt(x: number, y: number, base: number, lights: readonly Light[]): number {
  const form = x % 64 === 0 ? -1 : x % 64 === 1 ? 0.5 : 0;
  const lit = lightAt(lights, x, y);
  const lift = lit > 1 ? 1 : lit > 0.45 ? 0.5 : 0;
  return Math.round(base + form + lift);
}
