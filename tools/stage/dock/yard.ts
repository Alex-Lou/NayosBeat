/**
 * The life of the yard (docs/art/decor-dock.md §2.2), in clean pixel art and 3D perspective
 * (docs/art/proprete.md): the delivery van backed against bay 1, the old sedan parked by the
 * stairs, the wheelie bins and the cardboard, the sleeper under his blanket in the alley with his
 * shopping cart.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import type { Random } from '../kit/random.ts';
import {
  ASPHALT,
  BAG,
  BLANKET,
  BOTTLE,
  CAR,
  CARDBOARD,
  CLOTH,
  DUMPSTER,
  GLASS,
  HAZARD,
  PAPER,
  POSTER_RED,
  RUBBER,
  RUST,
  SKIN,
  SODIUM,
  STEEL,
  TAG,
  VAN,
  WOOD,
} from './palette.ts';

export function drawVan(canvas: Canvas, cx: number, foot: number, lights: readonly Light[]): void {
  const lit = lightAt(lights, cx, foot - 70) > 0.6 ? 1 : 0;
  canvas.ellipse(cx - 52, foot - 6, 104, 10, at(ASPHALT, 0));
  const box = { x: cx - 48, y: foot - 104, width: 96, height: 40 };
  const sideW = 7;
  canvas.polygon(
    [
      [box.x - sideW, box.y + 5],
      [box.x, box.y],
      [box.x, box.y + box.height],
      [box.x - sideW, box.y + box.height - 3],
    ],
    at(VAN, 0),
  );
  canvas.line(box.x - sideW, box.y + 5, box.x, box.y, at(VAN, 2));
  canvas.polygon(
    [
      [box.x - sideW, box.y + 5],
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x + box.width - 4, box.y - 4],
      [box.x - 2, box.y - 4],
    ],
    at(VAN, 3),
  );
  canvas.paint(box.x, box.y, box.width, box.height, (x, y) => {
    const rx = x - box.x;
    const ry = y - box.y;
    if (ry === 0) return at(VAN, 4);
    if (ry >= box.height - 3) return at(VAN, 0);
    if (rx < 3) return at(VAN, 3);
    if (rx >= box.width - 3) return at(VAN, 1);
    if (rx % 24 === 0) return at(VAN, 1);
    if (rx % 24 === 1) return at(VAN, 3);
    return at(VAN, ry < 18 ? 2 + lit : 2);
  });
  for (const lx of [box.x + 6, cx - 8, cx, cx + 8, box.x + box.width - 8]) {
    canvas.fill(lx, box.y + 2, 3, 2, at(SODIUM, 2));
  }
  for (let row = 0; row < 6; row++) {
    const half = 36 + row;
    canvas.hline(cx - half, foot - 68 - row, half * 2, at(VAN, row >= 4 ? 3 : 2));
  }
  const cab = { x: cx - 42, y: foot - 68, width: 84, height: 32 };
  canvas.polygon(
    [
      [cab.x - 5, cab.y + 5],
      [cab.x + 3, cab.y],
      [cab.x, foot - 14],
      [cab.x - 5, foot - 16],
    ],
    at(VAN, 1),
  );
  canvas.paint(cab.x, cab.y, cab.width, cab.height, (x, y) => {
    const ry = y - cab.y;
    const taper = Math.max(0, Math.round((24 - ry) * 0.18));
    if (x < cab.x + taper || x >= cab.x + cab.width - taper) return undefined;
    if (ry < 2) return at(VAN, 4);
    if (x < cab.x + taper + 3) return at(VAN, 3);
    if (x >= cab.x + cab.width - taper - 3) return at(VAN, 1);
    return at(VAN, 2 + lit);
  });
  const glass = { x: cx - 35, y: cab.y + 4, width: 70, height: 22 };
  canvas.fill(glass.x - 1, glass.y - 1, glass.width + 2, glass.height + 2, at(RUBBER, 0));
  canvas.paint(glass.x, glass.y, glass.width, glass.height, (x, y) => {
    const d = x - glass.x - (y - glass.y) * 1.2;
    if (Math.abs(d - 42) < 2.2 || Math.abs(d - 48) < 1.2) return at(GLASS, 2);
    if (y > glass.y + glass.height - 5) return at(STEEL, 1);
    return at(STEEL, 0);
  });
  canvas.ellipse(cx - 24, glass.y + 13, 12, 8, at(STEEL, 2));
  canvas.fill(cx - 4, glass.y + 1, 8, 3, at(STEEL, 2));
  canvas.vline(cx + 6, glass.y + 1, 5, at(STEEL, 2));
  canvas.fill(cx + 5, glass.y + 6, 3, 4, at(TAG.green, 1));
  canvas.line(
    cx - 28,
    glass.y + glass.height - 1,
    cx - 8,
    glass.y + glass.height - 5,
    at(STEEL, 3),
  );
  canvas.line(
    cx + 4,
    glass.y + glass.height - 1,
    cx + 24,
    glass.y + glass.height - 5,
    at(STEEL, 3),
  );
  const hoodTop = cab.y + cab.height - 2;
  canvas.polygon(
    [
      [cab.x, hoodTop],
      [cab.x + cab.width, hoodTop],
      [cab.x + cab.width + 3, hoodTop + 8],
      [cab.x - 3, hoodTop + 8],
    ],
    at(VAN, 3 + lit),
  );
  canvas.line(cx - 18, hoodTop + 1, cx - 20, hoodTop + 7, at(VAN, 2));
  canvas.line(cx + 18, hoodTop + 1, cx + 20, hoodTop + 7, at(VAN, 2));
  canvas.hline(cab.x - 3, hoodTop + 8, cab.width + 6, at(VAN, 4));
  const noseY = hoodTop + 9;
  const noseH = foot - 16 - noseY;
  canvas.fill(cab.x - 3, noseY, cab.width + 6, noseH, at(VAN, 2));
  canvas.vline(cab.x - 3, noseY, noseH, at(VAN, 3));
  canvas.vline(cab.x + cab.width + 2, noseY, noseH, at(VAN, 1));
  canvas.fill(cx - 22, noseY + 1, 44, noseH - 2, at(STEEL, 0));
  canvas.hline(cx - 22, noseY + 1, 44, at(STEEL, 3));
  for (let y = noseY + 3; y < noseY + noseH - 2; y += 3) {
    canvas.hline(cx - 20, y, 40, at(STEEL, 2));
  }
  canvas.fill(cx - 3, noseY + 4, 6, 3, at(STEEL, 4));
  for (const side of [-1, 1] as const) {
    canvas.line(cx + side * 39, cab.y + 7, cx + side * 47, cab.y + 5, at(STEEL, 3));
    canvas.fill(cx + side * 47 - (side < 0 ? 4 : 0), cab.y + 3, 4, 10, at(STEEL, 1));
    canvas.vline(cx + side * 47, cab.y + 3, 10, at(STEEL, 3));
    const hx = side < 0 ? cab.x : cab.x + cab.width - 16;
    canvas.fill(hx - 1, noseY + 1, 18, 8, at(STEEL, 0));
    const lampX = side < 0 ? hx + 4 : hx;
    const turnX = side < 0 ? hx : hx + 12;
    canvas.fill(lampX, noseY + 2, 12, 6, at(PAPER, 2));
    canvas.hline(lampX, noseY + 2, 12, at(PAPER, 3));
    canvas.fill(turnX, noseY + 2, 4, 6, at(RUST, 3));
    canvas.hline(turnX, noseY + 2, 4, at(SODIUM, 2));
  }
  canvas.fill(cab.x - 5, foot - 16, cab.width + 10, 7, at(STEEL, 2));
  canvas.hline(cab.x - 5, foot - 16, cab.width + 10, at(STEEL, 4));
  canvas.hline(cab.x - 5, foot - 10, cab.width + 10, at(STEEL, 0));
  canvas.fill(cx - 11, foot - 15, 22, 5, at(PAPER, 2));
  canvas.hline(cx - 11, foot - 15, 22, at(PAPER, 3));
  canvas.fill(cx - 18, foot - 9, 36, 4, at(RUBBER, 0));
  for (const side of [-1, 1] as const) {
    const wx = cx + side * 34 - 7;
    canvas.fill(wx, foot - 10, 14, 10, at(RUBBER, 0));
    canvas.fill(wx + 2, foot - 10, 10, 9, at(RUBBER, 1));
    canvas.vline(wx + 1, foot - 9, 8, at(RUBBER, 2));
  }
}

export function drawCrates(canvas: Canvas, x: number, foot: number): void {
  for (const [dx, level] of [
    [0, 0],
    [22, 0],
    [10, 1],
  ] as const) {
    const top = foot - (level + 1) * 12;
    for (let neck = x + dx + 3; neck < x + dx + 19; neck += 4) {
      canvas.fill(neck, top - 3, 2, 3, at(BOTTLE, 0));
      canvas.set(neck, top - 3, at(BOTTLE, 1));
    }
    canvas.fill(x + dx - 3, top + 1, 3, 11, at(WOOD, 0));
    canvas.fill(x + dx, top, 20, 12, at(WOOD, 1));
    canvas.hline(x + dx, top, 20, at(WOOD, 3));
    canvas.hline(x + dx, top + 5, 20, at(WOOD, 0));
    canvas.hline(x + dx, top + 6, 20, at(WOOD, 2));
    canvas.vline(x + dx + 19, top, 12, at(WOOD, 2));
  }
}

export function drawSedan(canvas: Canvas, x: number, foot: number, lights: readonly Light[]): void {
  const length = 196;
  const lit = lightAt(lights, x + 100, foot - 40) > 0.45 ? 1 : 0;
  canvas.ellipse(x + 6, foot - 5, length - 12, 8, at(ASPHALT, 0));
  const cabin = new Mask(canvas.width, canvas.height);
  cabin.polygon([
    [x + 42, foot - 40],
    [x + 62, foot - 64],
    [x + 132, foot - 64],
    [x + 154, foot - 40],
  ]);
  const body = new Mask(canvas.width, canvas.height);
  body.polygon([
    [x, foot - 18],
    [x + 5, foot - 38],
    [x + 42, foot - 40],
    [x + 154, foot - 40],
    [x + length - 4, foot - 38],
    [x + length, foot - 18],
    [x + length - 2, foot - 10],
    [x + 2, foot - 10],
  ]);
  canvas.paint(x, foot - 66, length + 2, 58, (px, py) => {
    if (cabin.has(px, py) && !body.has(px, py)) {
      if (py <= foot - 62) return at(CAR, 3 + lit);
      if (py === foot - 61) return at(CAR, 4);
      const pillar =
        Math.abs(px - (x + 98)) < 3 ||
        Math.abs(px - (x + 130)) < 2 ||
        !cabin.has(px - 3, py) ||
        !cabin.has(px + 3, py);
      if (pillar) return at(CAR, 2 + lit);
      if (px > x + 98) {
        if (py < foot - 52) return at(STEEL, 0);
        if (py === foot - 52) return at(STEEL, 3);
        return at(GLASS, 1);
      }
      const glint = Math.abs(px - (x + 66) + (py - (foot - 58)) * 0.9) < 2;
      return glint ? at(GLASS, 2) : at(STEEL, 1);
    }
    if (!body.has(px, py)) return undefined;
    if (!body.has(px, py - 1)) return at(CAR, 4);
    if (py === foot - 27) return at(STEEL, 4);
    if (py === foot - 26) return at(CAR, 0);
    const seam = px === x + 50 || px === x + 98 || px === x + 144;
    if (seam && py > foot - 39 && py < foot - 13) return at(CAR, 0);
    if (py < foot - 33) return at(CAR, 3 + lit);
    if (py < foot - 27) return at(CAR, 2 + lit);
    if (py < foot - 15) return at(CAR, 1 + lit);
    return at(CAR, 0);
  });
  for (const hx of [x + 86, x + 134]) {
    canvas.fill(hx, foot - 34, 6, 2, at(STEEL, 4));
    canvas.hline(hx, foot - 32, 6, at(CAR, 0));
  }
  canvas.fill(x + 52, foot - 43, 5, 4, at(CAR, 3));
  canvas.set(x + 56, foot - 42, at(STEEL, 4));
  canvas.fill(x + 114, foot - 48, 8, 4, at(TAG.rose, 1));
  canvas.fill(x, foot - 34, 4, 6, at(PAPER, 2));
  canvas.fill(x + 4, foot - 34, 3, 6, at(SODIUM, 2));
  canvas.fill(x + length - 4, foot - 35, 4, 8, at(POSTER_RED, 1));
  canvas.hline(x + length - 4, foot - 31, 4, at(SODIUM, 2));
  canvas.fill(x - 3, foot - 19, 10, 5, at(STEEL, 2));
  canvas.hline(x - 3, foot - 19, 10, at(STEEL, 4));
  canvas.fill(x + length - 7, foot - 19, 10, 5, at(STEEL, 2));
  canvas.hline(x + length - 7, foot - 19, 10, at(STEEL, 4));
  canvas.fill(x + 150, foot - 25, 14, 4, at(RUST, 1));
  canvas.fill(x + 154, foot - 28, 8, 3, at(RUST, 2));
  for (const wheel of [x + 34, x + 160]) {
    canvas.ellipse(wheel - 14, foot - 26, 28, 26, at(CAR, 0));
    canvas.ellipse(wheel - 12, foot - 24, 24, 24, at(RUBBER, 0));
    canvas.ellipse(wheel - 10, foot - 22, 20, 20, at(RUBBER, 1));
    canvas.ellipse(wheel - 6, foot - 18, 12, 12, at(STEEL, 2));
    canvas.ellipse(wheel - 3, foot - 15, 6, 6, at(STEEL, 4));
  }
}

export function drawBin(canvas: Canvas, x: number, foot: number, open: boolean): void {
  canvas.fill(x - 2, foot - 1, 30, 2, at(ASPHALT, 0));
  canvas.fill(x, foot - 39, 5, 35, at(DUMPSTER, 0));
  canvas.fill(x + 5, foot - 40, 21, 36, at(DUMPSTER, 1));
  canvas.vline(x + 25, foot - 40, 36, at(DUMPSTER, 3));
  canvas.hline(x, foot - 30, 26, at(DUMPSTER, 0));
  canvas.hline(x + 5, foot - 29, 20, at(DUMPSTER, 2));
  if (open) {
    canvas.line(x - 2, foot - 43, x + 24, foot - 51, at(DUMPSTER, 2), 3);
    canvas.line(x - 2, foot - 44, x + 24, foot - 52, at(DUMPSTER, 3), 1);
  } else {
    canvas.fill(x - 2, foot - 44, 30, 4, at(DUMPSTER, 2));
    canvas.hline(x - 2, foot - 44, 30, at(DUMPSTER, 3));
  }
  canvas.fill(x + 18, foot - 6, 6, 6, at(RUBBER, 1));
  canvas.set(x + 21, foot - 3, at(STEEL, 3));
}

export function drawLitter(canvas: Canvas, x: number, foot: number, random: Random): void {
  for (let box = 0; box < 3; box++) {
    const bx = x + box * 18 + random.int(0, 6);
    const height = random.int(10, 18);
    canvas.fill(bx - 3, foot - height + 1, 3, height - 1, at(CARDBOARD, 0));
    canvas.fill(bx, foot - height, 16, height, at(CARDBOARD, 1));
    canvas.hline(bx, foot - height, 16, at(CARDBOARD, 2));
    canvas.vline(bx + 8, foot - height, height, at(CARDBOARD, 0));
  }
  for (let can = 0; can < 4; can++) {
    const cx = x - 18 + random.int(0, 84);
    const cy = foot - 2 - random.int(0, 3);
    canvas.fill(cx, cy, 4, 2, at(POSTER_RED, 1));
    canvas.set(cx + 3, cy, at(STEEL, 4));
  }
}

export function drawSleeper(canvas: Canvas, x: number, foot: number, frame: number): void {
  canvas.fill(x - 6, foot - 1, 80, 2, at(ASPHALT, 0));
  canvas.fill(x - 4, foot - 4, 76, 3, at(CARDBOARD, 1));
  canvas.hline(x - 4, foot - 4, 76, at(CARDBOARD, 2));
  const lump = new Mask(canvas.width, canvas.height);
  const shift = frame === 1 ? 3 : 0;
  lump.ellipse(x + 8 + shift, foot - 16, 32, 14);
  lump.ellipse(x + 30, foot - 13, 36, 11);
  canvas.paint(x, foot - 19, 70, 16, (px, py) => {
    if (!lump.has(px, py)) return undefined;
    if (!lump.has(px, py - 1)) return at(BLANKET, 2);
    if (!lump.has(px, py + 1)) return at(BLANKET, 0);
    const fold = Math.abs(((px + py * 2) % 14) - 7) < 2;
    return at(BLANKET, fold ? 0 : 1);
  });
  const hx = x - 2;
  const hy = foot - (frame === 2 ? 20 : 13);
  canvas.ellipse(hx - 4, hy, 10, 9, at(SKIN, 0));
  canvas.fill(hx - 4, hy - 1, 10, 5, at(CLOTH.olive, 1));
  canvas.hline(hx - 3, hy - 1, 8, at(CLOTH.olive, 2));
  if (frame === 2) canvas.fill(hx - 3, hy + 4, 3, 2, at(SKIN, 1));
  const cart = x - 30;
  canvas.fill(cart - 2, foot - 1, 30, 2, at(ASPHALT, 0));
  canvas.fill(cart + 4, foot - 38, 16, 12, at(BAG, 2));
  canvas.hline(cart + 4, foot - 38, 16, at(BAG, 3));
  canvas.paint(cart, foot - 34, 26, 22, (px, py) => {
    const border = px === cart || px === cart + 25 || py === foot - 34 || py === foot - 13;
    if (border) return at(STEEL, 3);
    return (px - cart) % 5 === 0 || (py - foot) % 5 === 0 ? at(STEEL, 2) : undefined;
  });
  canvas.line(cart + 25, foot - 34, cart + 30, foot - 40, at(STEEL, 3));
  canvas.fill(cart + 29, foot - 41, 3, 2, at(POSTER_RED, 1));
  canvas.line(cart + 2, foot - 12, cart + 4, foot - 4, at(STEEL, 2));
  canvas.line(cart + 23, foot - 12, cart + 21, foot - 4, at(STEEL, 2));
  canvas.hline(cart + 2, foot - 6, 22, at(STEEL, 2));
  for (const wx of [cart + 2, cart + 21]) {
    canvas.fill(wx, foot - 4, 4, 4, at(RUBBER, 1));
    canvas.set(wx + 1, foot - 3, at(STEEL, 3));
  }
}

export function drawCone(canvas: Canvas, x: number, foot: number): void {
  canvas.fill(x - 6, foot - 1, 13, 2, at(ASPHALT, 0));
  canvas.fill(x - 5, foot - 3, 11, 2, at(RUBBER, 1));
  canvas.hline(x - 4, foot - 3, 9, at(RUST, 2));
  canvas.polygon(
    [
      [x - 4, foot - 3],
      [x - 1, foot - 16],
      [x + 2, foot - 16],
      [x + 5, foot - 3],
    ],
    at(RUST, 3),
  );
  canvas.line(x + 1, foot - 16, x + 4, foot - 3, at(RUST, 4));
  canvas.hline(x - 2, foot - 11, 5, at(PAPER, 3));
  canvas.hline(x - 2, foot - 10, 5, at(PAPER, 2));
}

export function drawSawhorse(canvas: Canvas, x: number, foot: number): void {
  canvas.fill(x - 2, foot - 1, 42, 2, at(ASPHALT, 0));
  canvas.line(x + 2, foot, x + 7, foot - 24, at(WOOD, 1), 2);
  canvas.line(x + 12, foot - 2, x + 7, foot - 24, at(WOOD, 2), 2);
  canvas.line(x + 28, foot, x + 33, foot - 24, at(WOOD, 1), 2);
  canvas.line(x + 38, foot - 2, x + 33, foot - 24, at(WOOD, 2), 2);
  canvas.hline(x + 4, foot - 10, 31, at(WOOD, 1));
  canvas.fill(x, foot - 26, 40, 7, at(STEEL, 1));
  canvas.hline(x, foot - 26, 40, at(HAZARD, 2));
  for (let px = x; px < x + 40; px++) {
    for (let py = foot - 25; py < foot - 19; py++) {
      const stripe = Math.floor((px + py) / 6) % 2 === 0;
      canvas.set(px, py, stripe ? at(HAZARD, 1) : at(STEEL, 0));
    }
  }
}

export function drawPalletJack(canvas: Canvas, x: number, foot: number): void {
  canvas.fill(x - 4, foot - 2, 58, 4, at(ASPHALT, 0));
  canvas.fill(x + 4, foot - 6, 44, 4, at(WOOD, 1));
  canvas.hline(x + 4, foot - 6, 44, at(WOOD, 3));
  for (const fx of [x + 8, x + 32]) {
    canvas.fill(fx, foot - 4, 10, 3, at(HAZARD, 1));
    canvas.hline(fx, foot - 4, 10, at(HAZARD, 2));
    canvas.fill(fx + 2, foot - 2, 4, 2, at(RUBBER, 0));
  }
  canvas.fill(x, foot - 16, 8, 12, at(HAZARD, 1));
  canvas.vline(x + 7, foot - 16, 12, at(HAZARD, 2));
  canvas.fill(x + 1, foot - 4, 6, 4, at(RUBBER, 0));
  canvas.line(x + 3, foot - 16, x - 3, foot - 36, at(STEEL, 3), 2);
  canvas.fill(x - 6, foot - 38, 7, 3, at(RUBBER, 1));
  const c1 = { x: x + 6, y: foot - 28, w: 38, h: 22 };
  canvas.fill(c1.x - 4, c1.y + 2, 4, c1.h - 2, at(STEEL, 0));
  canvas.fill(c1.x, c1.y, c1.w, c1.h, at(STEEL, 1));
  canvas.hline(c1.x, c1.y, c1.w, at(STEEL, 3));
  canvas.vline(c1.x, c1.y, c1.h, at(STEEL, 3));
  canvas.vline(c1.x + c1.w - 1, c1.y, c1.h, at(STEEL, 2));
  canvas.hline(c1.x, c1.y + 10, c1.w, at(STEEL, 2));
  for (const [cx, cy] of [
    [c1.x, c1.y],
    [c1.x + c1.w - 3, c1.y],
    [c1.x, c1.y + c1.h - 3],
    [c1.x + c1.w - 3, c1.y + c1.h - 3],
  ] as const) {
    canvas.fill(cx, cy, 3, 3, at(STEEL, 4));
  }
  const c2 = { x: x + 10, y: c1.y - 16, w: 28, h: 16 };
  canvas.fill(c2.x - 3, c2.y + 2, 3, c2.h - 2, at(STEEL, 0));
  canvas.fill(c2.x, c2.y, c2.w, c2.h, at(RUBBER, 2));
  canvas.hline(c2.x, c2.y, c2.w, at(STEEL, 4));
  canvas.fill(c2.x + 10, c2.y + 5, 8, 4, at(HAZARD, 1));
}

export function drawDrums(canvas: Canvas, x: number, foot: number, hop = 0): void {
  canvas.ellipse(x - 6, foot - 4, 68, 7, at(ASPHALT, 0));
  canvas.fill(x - 2, foot - 5, 56, 4, at(WOOD, 1));
  canvas.hline(x - 2, foot - 5, 56, at(WOOD, 3));
  const d1 = { x: x + 2, top: foot - 43, w: 24, h: 38 };
  canvas.paint(d1.x, d1.top, d1.w, d1.h, (px, py) => {
    const col = px - d1.x;
    const rib = py === d1.top + 12 || py === d1.top + 25;
    if (rib) return at(STEEL, col < 6 ? 4 : 3);
    const band = py > d1.top + 13 && py < d1.top + 24;
    if (band) return at(HAZARD, col < 7 ? 2 : col > 18 ? 0 : 1);
    return at(STEEL, col < 5 ? 3 : col < 15 ? 2 : col > 20 ? 0 : 1);
  });
  canvas.ellipse(d1.x, d1.top - 3, d1.w, 6, at(STEEL, 3));
  canvas.ellipse(d1.x + 2, d1.top - 2, d1.w - 4, 4, at(STEEL, 1));
  const d2 = { x: x + 28, top: foot - 39, w: 22, h: 34 };
  canvas.paint(d2.x, d2.top, d2.w, d2.h, (px, py) => {
    const col = px - d2.x;
    const rib = py === d2.top + 11 || py === d2.top + 22;
    if (rib) return at(RUST, 2);
    if (py > d2.top + 22 && col > 8 && col < 16) return at(RUST, 1);
    return at(DUMPSTER, col < 5 ? 3 : col < 14 ? 2 : 0);
  });
  canvas.ellipse(d2.x, d2.top - 3, d2.w, 5, at(DUMPSTER, 3));
  const canX = x + 56 + (hop === 1 ? 1 : hop === 2 ? -1 : 0);
  const canY = foot - 3 - (hop > 0 ? 2 : 0);
  canvas.fill(canX, canY, 5, 3, at(POSTER_RED, 1));
  canvas.set(canX + 4, canY, at(STEEL, 4));
  drawCone(canvas, x - 12, foot + 2);
}

export function drawFlightCases(canvas: Canvas, x: number, foot: number): void {
  canvas.ellipse(x - 6, foot - 4, 72, 7, at(ASPHALT, 0));
  const big = { x, y: foot - 38, w: 40, h: 34 };
  canvas.polygon(
    [
      [big.x - 6, big.y + 4],
      [big.x, big.y],
      [big.x, big.y + big.h],
      [big.x - 6, big.y + big.h - 3],
    ],
    at(RUBBER, 0),
  );
  canvas.fill(big.x, big.y, big.w, big.h, at(STEEL, 1));
  canvas.hline(big.x, big.y, big.w, at(STEEL, 4));
  canvas.vline(big.x, big.y, big.h, at(STEEL, 3));
  canvas.vline(big.x + big.w - 1, big.y, big.h, at(STEEL, 2));
  canvas.hline(big.x, big.y + 16, big.w, at(STEEL, 2));
  canvas.fill(big.x + 15, big.y + 14, 10, 5, at(STEEL, 3));
  canvas.fill(big.x + 8, big.y + 5, 16, 5, at(TAG.cream, 0));
  for (const wx of [big.x + 4, big.x + big.w - 8]) {
    canvas.fill(wx, foot - 4, 4, 4, at(RUBBER, 0));
    canvas.set(wx + 1, foot - 3, at(STEEL, 3));
  }
  const side = { x: big.x + big.w + 3, y: foot - 24, w: 22, h: 22 };
  canvas.fill(side.x, side.y, side.w, side.h, at(RUBBER, 2));
  canvas.hline(side.x, side.y, side.w, at(STEEL, 4));
  canvas.hline(side.x, side.y + 10, side.w, at(STEEL, 2));
  canvas.fill(side.x + 6, side.y + 3, 10, 4, at(POSTER_RED, 1));
}

export function drawCables(canvas: Canvas, bayX: number, dockTop: number, foot: number): void {
  const startX = bayX + 12;
  for (let y = dockTop - 4; y < foot; y++) {
    const t = (y - (dockTop - 4)) / (foot - (dockTop - 4));
    const sway = Math.round(Math.sin(t * Math.PI * 2) * 10 - t * 24);
    const cx = startX + sway;
    canvas.fill(cx, y, 3, 1, at(RUBBER, 0));
    canvas.set(cx + 1, y, at(STEEL, 2));
    canvas.fill(cx + 5, y, 2, 1, at(RUST, 3));
  }
}

export function drawSpoolAndKegs(canvas: Canvas, x: number, foot: number): void {
  canvas.ellipse(x - 8, foot - 4, 88, 7, at(ASPHALT, 0));
  const sx = x + 16;
  const sy = foot - 20;
  canvas.ellipse(sx - 18, sy - 16, 32, 32, at(WOOD, 1));
  canvas.ellipse(sx - 14, sy - 16, 32, 32, at(WOOD, 2));
  canvas.ellipse(sx - 13, sy - 15, 30, 30, at(WOOD, 3));
  canvas.ellipse(sx - 11, sy - 13, 26, 26, at(WOOD, 1));
  canvas.ellipse(sx - 3, sy - 5, 10, 10, at(STEEL, 0));
  canvas.ellipse(sx - 1, sy - 3, 6, 6, at(STEEL, 3));
  for (const [kx, ky] of [
    [x + 42, foot - 28],
    [x + 60, foot - 26],
  ] as const) {
    canvas.fill(kx, ky, 15, 24, at(STEEL, 2));
    canvas.vline(kx + 2, ky, 24, at(STEEL, 4));
    canvas.vline(kx + 13, ky, 24, at(STEEL, 0));
    canvas.hline(kx, ky + 7, 15, at(STEEL, 4));
    canvas.hline(kx, ky + 15, 15, at(STEEL, 4));
    canvas.ellipse(kx, ky - 2, 15, 4, at(STEEL, 4));
  }
  const signX = x - 10;
  canvas.line(signX, foot, signX + 5, foot - 18, at(HAZARD, 1), 2);
  canvas.line(signX + 11, foot, signX + 6, foot - 18, at(HAZARD, 2), 2);
  canvas.fill(signX + 3, foot - 14, 6, 8, at(HAZARD, 2));
  canvas.set(signX + 5, foot - 11, at(STEEL, 0));
}

export function drawDrainPlates(canvas: Canvas, xs: readonly number[], drainY: number): void {
  for (const cx of xs) {
    canvas.polygon(
      [
        [cx - 34, drainY - 2],
        [cx + 34, drainY - 2],
        [cx + 38, drainY + 6],
        [cx - 38, drainY + 6],
      ],
      at(STEEL, 2),
    );
    canvas.hline(cx - 34, drainY - 2, 68, at(STEEL, 4));
    canvas.hline(cx - 38, drainY + 5, 76, at(STEEL, 0));
    for (let px = cx - 28; px < cx + 28; px += 8) {
      canvas.set(px, drainY + 1, at(STEEL, 4));
      canvas.set(px + 4, drainY + 3, at(STEEL, 4));
    }
  }
}
