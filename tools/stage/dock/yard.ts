/**
 * The life of the yard (docs/art/decor-dock.md §2.2): the delivery van backed against bay 1, the
 * old sedan parked by the stairs, the wheelie bins and the cardboard, the sleeper under his
 * blanket in the alley with his shopping cart. Each drawn where mid.ts tells it.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, type Random } from '../kit/random.ts';
import {
  BLANKET,
  BOTTLE,
  CAR,
  CARDBOARD,
  DUMPSTER,
  GLASS,
  PAPER,
  PERSON,
  RUBBER,
  RUST,
  SKIN,
  STEEL,
  TAG,
  VAN,
  WOOD,
} from './palette.ts';

/**
 * The delivery van backed against the dock, seen from its front: the cargo box over the cab, the
 * windshield and its air freshener, the grille, the headlights off, the bumper, the plate, the
 * wheels; lit from above by the bay's lamp. Its foot on row `foot`, centered on `cx`.
 */
export function drawVan(canvas: Canvas, cx: number, foot: number, lights: readonly Light[]): void {
  const lit = (x: number, y: number) => lightAt(lights, x, y) * 0.6;
  // The cargo box over the cab, ribbed, in the cab's shade at its foot.
  const box = { x: cx - 50, y: foot - 124, width: 100, height: 58 };
  canvas.paint(box.x, box.y, box.width, box.height, (x, y) => {
    const rib = (x - box.x) % 20 === 0 ? -0.7 : 0;
    const dirt = (noise(91, x, y, 10) - 0.5) * 0.6;
    const edge = y === box.y ? 1.8 : y >= box.y + box.height - 2 ? -1 : 0;
    return tone(VAN, 1.5 + rib + dirt + edge + lit(x, y), x, y);
  });
  // The wind deflector, from the cab's roof up to the box.
  for (let row = 0; row < 8; row++) {
    const half = 38 + row;
    canvas.hline(cx - half, foot - 66 - row, half * 2, at(VAN, row === 7 ? 3 : 2));
  }
  // The cab, its top corners rounded, paler than the box (the lamp is on it).
  const cab = { x: cx - 42, y: foot - 66, width: 84, height: 54 };
  canvas.paint(cab.x, cab.y, cab.width, cab.height, (x, y) => {
    const corner =
      y - cab.y < 3 && (x - cab.x < 3 - (y - cab.y) || cab.x + cab.width - 1 - x < 3 - (y - cab.y));
    if (corner) return undefined;
    return tone(VAN, 2.6 + lit(x, y), x, y);
  });
  // The windshield, wide and dark, a streak of the lamp, the wipers, the freshener hanging.
  const glass = { x: cx - 36, y: cab.y + 3, width: 72, height: 24 };
  canvas.paint(glass.x, glass.y, glass.width, glass.height, (x, y) => {
    if (Math.abs(x - glass.x - (y - glass.y) * 1.2 - 44) < 2) return at(GLASS, 1);
    return at(STEEL, 0);
  });
  canvas.line(
    cx - 30,
    glass.y + glass.height - 2,
    cx - 6,
    glass.y + glass.height - 6,
    at(STEEL, 3),
  );
  canvas.line(
    cx + 4,
    glass.y + glass.height - 2,
    cx + 28,
    glass.y + glass.height - 6,
    at(STEEL, 3),
  );
  canvas.vline(cx + 6, glass.y, 6, at(STEEL, 2));
  canvas.fill(cx + 5, glass.y + 6, 3, 4, at(TAG.green, 1));
  // The mirrors on their arms, the headlights (off) and the orange indicators, the grille.
  for (const side of [-1, 1] as const) {
    canvas.line(cx + side * 42, cab.y + 6, cx + side * 48, cab.y + 4, at(STEEL, 2));
    canvas.fill(cx + side * 48 - (side < 0 ? 4 : 0), cab.y + 2, 4, 10, at(STEEL, 1));
    canvas.fill(cx + side * 31 - 6, cab.y + 32, 12, 6, at(PAPER, 1));
    canvas.fill(cx + side * 39 - 1, cab.y + 32, 3, 6, at(RUST, 3));
  }
  for (let y = cab.y + 31; y < cab.y + 39; y += 2) canvas.hline(cx - 20, y, 40, at(STEEL, 0));
  // The bumper and its plate, the wheels under it.
  canvas.fill(cab.x - 2, foot - 16, cab.width + 4, 6, at(STEEL, 2));
  canvas.hline(cab.x - 2, foot - 16, cab.width + 4, at(STEEL, 4));
  canvas.fill(cx - 10, foot - 15, 20, 4, at(PAPER, 2));
  for (const side of [-1, 1] as const)
    canvas.fill(cx + side * 34 - 6, foot - 10, 12, 10, at(RUBBER, 1));
}

/** Crates of empty bottles stacked on the dock by the van: wood, the necks green. */
export function drawCrates(canvas: Canvas, x: number, foot: number): void {
  for (const [dx, level] of [
    [0, 0],
    [22, 0],
    [10, 1],
  ] as const) {
    const top = foot - (level + 1) * 12;
    canvas.fill(x + dx, top, 20, 12, at(WOOD, 1));
    canvas.hline(x + dx, top, 20, at(WOOD, 3));
    for (let neck = x + dx + 2; neck < x + dx + 19; neck += 4)
      canvas.fill(neck, top - 3, 2, 3, at(BOTTLE, 1));
  }
}

/**
 * The old sedan parked along the dock, seen from its side, its nose to the left: maroon gone
 * dull, the chrome strip, the windows dark (the rear one down), a sticker, a dent, rust over the
 * wheel arch. Its foot on row `foot`, its back at `x`.
 */
export function drawSedan(canvas: Canvas, x: number, foot: number, lights: readonly Light[]): void {
  const length = 196;
  const body = new Mask(canvas.width, canvas.height);
  body.polygon([
    [x, foot - 16],
    [x + 4, foot - 40],
    [x + length - 6, foot - 42],
    [x + length, foot - 18],
    [x + length - 2, foot - 10],
    [x + 2, foot - 10],
  ]);
  const cabin = new Mask(canvas.width, canvas.height);
  cabin.polygon([
    [x + 44, foot - 40],
    [x + 62, foot - 64],
    [x + 128, foot - 64],
    [x + 150, foot - 41],
  ]);
  canvas.paint(x, foot - 66, length + 2, 58, (px, py) => {
    if (cabin.has(px, py) && !body.has(px, py)) {
      const pillar =
        Math.abs(px - (x + 96)) < 3 || !cabin.has(px - 2, py) || !cabin.has(px + 2, py);
      if (pillar || !cabin.has(px, py - 2))
        return tone(CAR, 2 + lightAt(lights, px, py) * 0.5, px, py);
      // The rear window rolled down: the dark of the car inside, no glass.
      if (px < x + 96) return at(STEEL, 0);
      return Math.abs(px - py * 0.6 - x - 30) < 2 ? at(GLASS, 1) : at(STEEL, 1);
    }
    if (!body.has(px, py)) return undefined;
    const top = !body.has(px, py - 1);
    const chrome = py === foot - 26;
    const seam = px === x + 96 || px === x + 52;
    const dent = Math.hypot(px - x - 160, py - foot + 24) < 5 ? -0.8 : 0;
    const level = 2.1 + (top ? 1.6 : 0) + (seam ? -1 : 0) + dent + lightAt(lights, px, py) * 0.6;
    if (chrome) return at(STEEL, 4);
    return tone(CAR, level - (py - foot + 42) * 0.03, px, py);
  });
  // Rust over the rear arch, a sticker on the rear window, the wheels and their hubcaps.
  canvas.paint(x + 18, foot - 26, 30, 10, (px, py) =>
    noise(93, px, py, 3) > 0.7 ? at(RUST, 1) : undefined,
  );
  canvas.fill(x + 70, foot - 58, 8, 5, at(TAG.rose, 1));
  for (const wheel of [x + 34, x + 160]) {
    canvas.ellipse(wheel - 12, foot - 24, 24, 24, at(RUBBER, 0));
    canvas.ellipse(wheel - 6, foot - 18, 12, 12, at(STEEL, 2));
    canvas.ellipse(wheel - 2, foot - 14, 4, 4, at(STEEL, 4));
  }
}

/** A wheelie bin: its body, its lid, a wheel; foot on row `foot`. */
export function drawBin(canvas: Canvas, x: number, foot: number, open: boolean): void {
  canvas.fill(x, foot - 40, 26, 36, at(DUMPSTER, 1));
  canvas.vline(x + 25, foot - 40, 36, at(DUMPSTER, 3));
  canvas.hline(x, foot - 30, 26, at(DUMPSTER, 0));
  if (open) canvas.line(x - 2, foot - 44, x + 24, foot - 52, at(DUMPSTER, 2), 3);
  else canvas.fill(x - 2, foot - 44, 30, 4, at(DUMPSTER, 2));
  canvas.fill(x + 18, foot - 6, 6, 6, at(RUBBER, 1));
}

/** Flattened boxes and crushed cans along the dock's foot. */
export function drawLitter(canvas: Canvas, x: number, foot: number, random: Random): void {
  for (let box = 0; box < 3; box++) {
    const bx = x + box * 18 + random.int(0, 6);
    const height = random.int(10, 18);
    canvas.fill(bx, foot - height, 16, height, at(CARDBOARD, 1));
    canvas.hline(bx, foot - height, 16, at(CARDBOARD, 2));
    canvas.vline(bx + 8, foot - height, height, at(CARDBOARD, 0));
  }
  for (let can = 0; can < 5; can++) {
    canvas.fill(x - 20 + random.int(0, 90), foot - 2 - random.int(0, 3), 3, 2, at(STEEL, 4));
  }
}

/**
 * The sleeper in the alley, on his cardboard under a blanket, his shopping cart by him: frame 0
 * asleep, 1 turned over, 2 the bass waking him half up, his head lifted. Foot on row `foot`.
 */
export function drawSleeper(canvas: Canvas, x: number, foot: number, frame: number): void {
  canvas.fill(x - 4, foot - 3, 76, 3, at(CARDBOARD, 1));
  const lump = new Mask(canvas.width, canvas.height);
  const shift = frame === 1 ? 3 : 0;
  lump.ellipse(x + 8 + shift, foot - 15, 30, 14);
  lump.ellipse(x + 30, foot - 12, 36, 11);
  canvas.paint(x, foot - 18, 70, 16, (px, py) => {
    if (!lump.has(px, py)) return undefined;
    const fold = (px + py * 2) % 9 === 0 ? -0.8 : 0;
    return tone(BLANKET, (lump.has(px, py - 1) ? 1.2 : 2.2) + fold, px, py);
  });
  // His head at the left end, a beanie; lifted with the bass.
  const hx = x - 2;
  const hy = foot - (frame === 2 ? 20 : 12);
  canvas.ellipse(hx - 4, hy, 10, 9, at(PERSON, 1));
  canvas.fill(hx - 4, hy, 10, 4, at(BLANKET, 0));
  if (frame === 2) canvas.set(hx - 3, hy + 5, at(SKIN, 0));
  // The shopping cart, its wire basket, a bag in it.
  const cart = x - 30;
  canvas.paint(cart, foot - 34, 26, 22, (px, py) =>
    (px - cart) % 4 === 0 || (py - foot) % 4 === 0 || py === foot - 34 ? at(STEEL, 2) : undefined,
  );
  canvas.fill(cart + 4, foot - 40, 14, 8, at(PAPER, 1));
  canvas.line(cart + 26, foot - 34, cart + 30, foot - 40, at(STEEL, 3));
  for (const wx of [cart + 2, cart + 22]) canvas.fill(wx, foot - 4, 3, 3, at(RUBBER, 1));
  canvas.line(cart + 2, foot - 12, cart + 24, foot - 12, at(STEEL, 2));
}
