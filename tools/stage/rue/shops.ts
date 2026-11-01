/**
 * The shops at street level (docs/art/decor-rue.md §3.2): the grocery and its warm window, the
 * laundromat and its cold light, a shop long closed. Worn, lit from inside, no real name.
 */

import { Canvas, at, tone } from './canvas.ts';
import { drawLedge, type Rect } from './facade.ts';
import { drawAwning, drawCrate, FRUITS } from './fixtures.ts';
import type { Light } from './light.ts';
import {
  CAT,
  COOL,
  CRATE,
  FRUIT,
  GLASS,
  NEON_ORANGE,
  NEON_VIOLET,
  STEEL,
  STONE,
  WARM,
} from './palette.ts';
import type { Random } from './random.ts';
import { drawLightbox, drawNeonWord, drawPainted } from './signs.ts';

/** A shop window's frame: a dark surround, a mullion, the bulkhead under it. */
function drawStorefrontFrame(canvas: Canvas, rect: Rect, mullions: readonly number[]): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 3, y - 3, width + 6, 3, at(STEEL, 2));
  canvas.hline(x - 3, y - 3, width + 6, at(STEEL, 4));
  canvas.fill(x - 3, y, 3, height, at(STEEL, 1));
  canvas.fill(x + width, y, 3, height, at(STEEL, 0));
  for (const mx of mullions) canvas.fill(mx - 1, y, 3, height, at(STEEL, 1));
  canvas.fill(x - 3, y + height, width + 6, 8, at(STONE, 1));
  canvas.hline(x - 3, y + height, width + 6, at(STONE, 3));
}

/** The grocery's shelves seen through its window: rows of goods, warm, brighter near its lamp. */
function drawShelves(canvas: Canvas, rect: Rect, random: Random): void {
  const { x, y, width, height } = rect;
  canvas.paint(x, y, width, height, (px, py) => {
    const glow =
      (1 - Math.min(1, Math.hypot(px - x - width * 0.45, py - y - height * 0.2) / (width * 0.5))) **
      2;
    return tone(WARM, 0.9 + glow * 3.4, px, py);
  });
  const colors = [FRUIT.orange, FRUIT.red, FRUIT.yellow, FRUIT.green, CRATE] as const;
  for (let row = y + 8; row < y + height - 10; row += 13) {
    canvas.hline(x, row + 8, width, at(WARM, 0));
    for (let px = x + 2; px < x + width - 4; px += random.int(4, 7)) {
      const ramp = random.pick(colors);
      const tall = random.int(4, 7);
      canvas.fill(px, row + 8 - tall, random.int(2, 4), tall, at(ramp, 1));
    }
  }
  // The counter and its till, darker, at the back right.
  canvas.fill(x + width - 46, y + height - 18, 40, 18, at(WARM, 0));
  canvas.hline(x + width - 46, y + height - 18, 40, at(WARM, 2));
}

/** The grocery: its lit sign box, its awning, its window of shelves, its door, crates outside. */
export function drawGrocery(
  canvas: Canvas,
  rect: Rect,
  lights: readonly Light[],
  random: Random,
): { window: Rect } {
  const { x, width } = rect;
  drawLightbox(canvas, { x: x + 22, y: 284, width: width - 44, height: 24 }, 'ÉPICERIE', 2);
  const window: Rect = { x: x + 8, y: 338, width: width - 52, height: 54 };
  const door: Rect = { x: x + width - 38, y: 330, width: 28, height: 70 };
  drawShelves(canvas, window, random);
  // The door's glass, the light behind it, a push bar.
  canvas.paint(door.x, door.y, door.width, door.height, (px, py) =>
    tone(WARM, 1.6 - (py - door.y) / door.height + (px - door.x < 3 ? -1 : 0), px, py),
  );
  canvas.fill(door.x + 4, door.y + 36, door.width - 8, 2, at(STEEL, 3));
  canvas.fill(door.x - 3, door.y - 3, door.width + 6, 3, at(STEEL, 2));
  canvas.fill(door.x - 3, door.y, 3, door.height, at(STEEL, 1));
  canvas.fill(door.x + door.width, door.y, 3, door.height, at(STEEL, 0));
  drawStorefrontFrame(canvas, window, [window.x + Math.round(window.width / 2)]);
  drawAwning(canvas, { x: x + 2, y: 312, width: width - 4, height: 26 }, lights, random);
  drawPainted(canvas, x + 30, 330, 'FRUITS LÉGUMES', at(STONE, 4));
  for (let index = 0; index < 4; index++) {
    drawCrate(
      canvas,
      x + 6 + index * 31,
      414,
      FRUITS[index % FRUITS.length] ?? FRUIT.orange,
      random,
    );
  }
  return { window };
}

/** The grocery's cat, sitting in the window: its tail flicks (frames 0 to 2). */
export function drawCat(canvas: Canvas, x: number, sill: number, frame: number): void {
  const body = at(CAT, 0);
  const rim = at(CAT, 1);
  canvas.fill(x + 2, sill - 12, 11, 12, body);
  canvas.fill(x + 1, sill - 6, 13, 6, body);
  canvas.fill(x + 4, sill - 18, 8, 7, body);
  canvas.set(x + 4, sill - 19, body);
  canvas.set(x + 11, sill - 19, body);
  canvas.set(x + 4, sill - 20, body);
  canvas.set(x + 11, sill - 20, body);
  canvas.vline(x + 12, sill - 18, 18, rim);
  canvas.set(x + 6, sill - 15, at(FRUIT.yellow, 1));
  canvas.set(x + 9, sill - 15, at(FRUIT.yellow, 1));
  // The tail: down along the sill, then curling up on the beat it flicks.
  const tails: readonly (readonly [number, number])[][] = [
    [
      [14, -1],
      [16, -1],
      [18, -1],
      [19, -2],
      [20, -3],
    ],
    [
      [14, -1],
      [16, -2],
      [17, -4],
      [18, -6],
      [18, -8],
    ],
    [
      [14, -1],
      [16, -1],
      [18, -2],
      [20, -4],
      [21, -6],
    ],
  ];
  for (const [dx, dy] of tails[frame % tails.length] ?? []) {
    canvas.fill(x + dx, sill + dy, 2, 2, body);
  }
}

/** Washing machines in a row: white-ish bodies in cold light, their round doors. */
function drawWashers(canvas: Canvas, rect: Rect): void {
  const { x, y, width, height } = rect;
  canvas.paint(x, y, width, height, (px, py) => {
    const tubes = 1 - Math.min(1, (py - y) / height);
    return tone(COOL, 0.1 + tubes * 1, px, py);
  });
  // Ceiling tubes.
  for (let px = x + 10; px < x + width - 30; px += 64) canvas.fill(px, y + 3, 30, 2, at(COOL, 4));
  const top = y + height - 34;
  for (let px = x + 4; px + 28 < x + width; px += 32) {
    canvas.fill(px, top, 28, 34, at(COOL, 1));
    canvas.hline(px, top, 28, at(COOL, 3));
    canvas.vline(px + 27, top, 34, at(COOL, 0));
    canvas.fill(px + 2, top + 3, 24, 3, at(COOL, 2));
    canvas.fill(px, top + 28, 28, 6, at(COOL, 0));
    // The door: a dark ring around a glass of tumbling grey.
    const cx = px + 14;
    const cy = top + 19;
    canvas.paint(cx - 9, cy - 9, 18, 18, (qx, qy) => {
      const d = Math.hypot(qx + 0.5 - cx, qy + 0.5 - cy);
      if (d > 9) return undefined;
      if (d > 7) return at(STEEL, 2);
      return at(COOL, qy < cy - 2 ? 1 : 0);
    });
  }
}

/** The laundromat: its neon word (two letters dead), its cold window full of machines. */
export function drawLaundromat(canvas: Canvas, rect: Rect): { window: Rect } {
  const { x, width } = rect;
  drawLedge(canvas, x - 4, 280, width + 8, 6, []);
  drawNeonWord(canvas, x + 60, 296, 'LAVERIE', 2, NEON_VIOLET, new Set([1, 5]));
  const door: Rect = { x: x + 6, y: 326, width: 26, height: 74 };
  const window: Rect = { x: x + 40, y: 324, width: width - 44, height: 68 };
  drawWashers(canvas, window);
  canvas.paint(door.x, door.y, door.width, door.height, (px, py) =>
    tone(COOL, 1.1 - (py - door.y) / door.height, px, py),
  );
  canvas.fill(door.x - 3, door.y - 3, door.width + 6, 3, at(STEEL, 2));
  canvas.fill(door.x - 3, door.y, 3, door.height, at(STEEL, 1));
  canvas.fill(door.x + door.width, door.y, 3, door.height, at(STEEL, 0));
  canvas.fill(door.x + 18, door.y + 38, 3, 8, at(STEEL, 4));
  drawStorefrontFrame(canvas, window, [window.x + 64, window.x + 128]);
  drawNeonWord(
    canvas,
    window.x + window.width - 42,
    window.y + 10,
    '24/24',
    1,
    NEON_ORANGE,
    new Set(),
  );
  return { window };
}

/** The sign board of a shop long closed: blank, its paint gone dark. */
export function drawDeadSign(canvas: Canvas, rect: Rect): void {
  canvas.fill(rect.x, rect.y, rect.width, rect.height, at(GLASS, 1));
  canvas.hline(rect.x, rect.y, rect.width, at(STEEL, 3));
  canvas.hline(rect.x, rect.y + rect.height - 1, rect.width, at(STEEL, 0));
}
