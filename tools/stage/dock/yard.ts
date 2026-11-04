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
