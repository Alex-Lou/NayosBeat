/**
 * The street's ironwork and objects (docs/art/decor-rue.md §3.2): fire escapes, balconies, street
 * lamps, the sidewalk shed, awnings, rolling shutters, and what stands on the sidewalk. Iron is
 * dark and lit on its upper edges; the railings' bars are sparse and one step off what is behind.
 */

import { Canvas, Mask, at, tone } from './canvas.ts';
import { castShadow, drawLedge, type Rect, type Wall } from './facade.ts';
import { lightAt, type Light } from './light.ts';
import {
  AWNING,
  BAG,
  CRATE,
  FRUIT,
  HYDRANT,
  LAMP,
  NEON_ORANGE,
  PAPER,
  PLYWOOD,
  POSTER_RED,
  SHUTTER,
  STEEL,
} from './palette.ts';
import type { Random } from './random.ts';

/** A railing: top rail lit on top, a middle rail, bars every `spacing` pixels down to `floor`. */
function drawRailing(
  canvas: Canvas,
  x: number,
  floor: number,
  width: number,
  height: number,
  spacing: number,
): void {
  const top = floor - height;
  for (let px = x + 2; px < x + width - 1; px += spacing) {
    canvas.vline(px, top + 2, height - 2, at(STEEL, 0));
  }
  canvas.hline(x, top, width, at(STEEL, 4));
  canvas.hline(x, top + 1, width, at(STEEL, 1));
  canvas.hline(x, top + Math.round(height * 0.55), width, at(STEEL, 1));
  canvas.vline(x, top, height, at(STEEL, 2));
  canvas.vline(x + width - 1, top, height, at(STEEL, 1));
}

/**
 * A fire escape across `width` pixels: a slatted platform at each of `floors` (a window sill's
 * row), its railing, the stairs zigzagging from each to the next, the drop ladder hung under the
 * lowest; each platform casts its shadow on the wall.
 */
export function drawFireEscape(
  canvas: Canvas,
  x: number,
  width: number,
  floors: readonly number[],
  wall: Wall,
): void {
  const sorted = [...floors].sort((a, b) => b - a);
  sorted.forEach((floor, index) => {
    castShadow(canvas, wall, x + 2, floor + 5, width - 4, 10);
    // Brackets to the wall under the platform.
    for (let px = x + 10; px < x + width; px += 48) {
      canvas.line(px, floor + 5, px + 10, floor + 15, at(STEEL, 1), 2);
    }
    // Stairs up to the next platform, alternating sides.
    const next = sorted[index + 1];
    if (next !== undefined) {
      const fromLeft = index % 2 === 0;
      const low = fromLeft ? x + 14 : x + width - 14;
      const high = fromLeft ? x + width - 30 : x + 30;
      const climb = floor - next;
      for (const offset of [0, 4]) {
        canvas.line(
          low,
          floor - offset,
          high,
          next + 4 - offset,
          at(STEEL, offset === 0 ? 1 : 2),
          2,
        );
      }
      const steps = Math.floor(climb / 7);
      for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const sx = Math.round(low + (high - low) * t);
        const sy = Math.round(floor + (next + 4 - floor) * t);
        canvas.fill(sx - 2, sy - 3, 5, 1, at(STEEL, 3));
      }
    }
    drawRailing(canvas, x, floor, width, 24, 8);
    // The platform's edge, seen from just below: lit lip, slats, dark underside.
    canvas.hline(x - 1, floor, width + 2, at(STEEL, 4));
    canvas.fill(x - 1, floor + 1, width + 2, 3, at(STEEL, 1));
    for (let px = x + 3; px < x + width; px += 6) canvas.set(px, floor + 2, at(STEEL, 0));
    canvas.hline(x - 1, floor + 4, width + 2, at(STEEL, 0));
  });
  // The drop ladder, hooked up under the lowest platform.
  const lowest = sorted[0];
  if (lowest === undefined) return;
  const lx = x + width - 22;
  for (const rail of [lx, lx + 10]) canvas.vline(rail, lowest + 5, 34, at(STEEL, 1));
  for (let py = lowest + 9; py < lowest + 38; py += 6) canvas.hline(lx, py, 11, at(STEEL, 2));
}

/**
 * A wrought iron balcony on a stone slab: its corbels, its bars, a band of scrolls under the top
 * rail; its shadow on the wall below.
 */
export function drawBalcony(
  canvas: Canvas,
  x: number,
  floor: number,
  width: number,
  wall: Wall,
): void {
  castShadow(canvas, wall, x, floor + 6, width, 10);
  for (const px of [x + 6, x + width - 12]) {
    drawLedge(canvas, px, floor + 6, 6, 8, wall.lights);
  }
  drawRailing(canvas, x, floor, width, 26, 6);
  // Scrolls: small rings between the top rail and a second one.
  canvas.hline(x, floor - 19, width, at(STEEL, 2));
  for (let px = x + 4; px < x + width - 6; px += 8) {
    const ring = new Mask(6, 6);
    ring.ellipse(0, 0, 6, 6);
    for (let ry = 0; ry < 6; ry++) {
      for (let rx = 0; rx < 6; rx++) {
        const inner = (rx - 2.5) ** 2 + (ry - 2.5) ** 2 < 3;
        if (ring.has(rx, ry) && !inner) canvas.set(px + rx, floor - 25 + ry, at(STEEL, 1));
      }
    }
  }
  drawLedge(canvas, x - 2, floor, width + 4, 6, wall.lights);
}

/**
 * A street lamp: a pole from the curb, a cobra-head arm, its sodium lens glowing with a dithered
 * halo (whole pixels: the glow is drawn, not blended).
 */
export function drawStreetLamp(
  canvas: Canvas,
  x: number,
  foot: number,
  top: number,
  side: -1 | 1,
): void {
  canvas.fill(x - 2, top, 5, foot - top, at(STEEL, 1));
  canvas.vline(x - 2, top, foot - top, at(STEEL, 3));
  canvas.vline(x + 2, top, foot - top, at(STEEL, 0));
  canvas.fill(x - 4, foot - 14, 9, 14, at(STEEL, 1));
  canvas.vline(x - 4, foot - 14, 14, at(STEEL, 3));
  canvas.hline(x - 4, foot - 14, 9, at(STEEL, 4));
  // The arm, curving out over the sidewalk.
  const reach = 30 * side;
  canvas.line(x, top, x + reach * 0.4, top - 7, at(STEEL, 2), 2);
  canvas.line(x + reach * 0.4, top - 7, x + reach, top - 9, at(STEEL, 2), 2);
  // The head and its lens.
  const hx = x + reach - (side > 0 ? 4 : 14);
  canvas.fill(hx, top - 13, 18, 5, at(STEEL, 2));
  canvas.hline(hx, top - 13, 18, at(STEEL, 4));
  canvas.fill(hx + 2, top - 8, 14, 2, at(LAMP, 1));
  canvas.fill(hx + 4, top - 8, 10, 1, at(LAMP, 2));
  // The halo under it, two rings of dithered orange.
  const cx = hx + 9;
  const cy = top - 6;
  canvas.paint(cx - 16, cy - 4, 32, 16, (px, py) => {
    if (canvas.get(px, py) === at(STEEL, 2) || (py <= top - 7 && py >= top - 13)) return undefined;
    const distance = Math.hypot(px - cx, (py - cy) * 1.8);
    if (distance > 15) return undefined;
    const checker = (px + py) % 2 === 0;
    if (distance < 7) return at(NEON_ORANGE, 2);
    if (distance < 11) return checker ? at(NEON_ORANGE, 1) : undefined;
    return checker && px % 2 === 0 ? at(NEON_ORANGE, 0) : undefined;
  });
}

/**
 * A fabric awning: its slanted top lit by the street, its valance with a scalloped hem, faded,
 * a stain or two.
 */
export function drawAwning(
  canvas: Canvas,
  rect: Rect,
  lights: readonly Light[],
  random: Random,
): void {
  const { x, y, width, height } = rect;
  const valance = Math.round(height * 0.4);
  const slope = height - valance;
  canvas.paint(x, y, width, slope, (px, py) => {
    const lit = lightAt(lights, px, py);
    const inset = Math.round(((slope - (py - y)) / slope) * 6);
    if (px < x + inset || px >= x + width - inset) return undefined;
    return tone(AWNING, 1.2 + lit * 0.8 + ((py - y) / slope) * 0.6, px, py);
  });
  canvas.paint(x, y + slope, width, valance + 3, (px, py) => {
    const row = py - y - slope;
    const scallop = (px - x) % 12;
    const hem = valance + (scallop < 6 ? 0 : -2) + (scallop === 0 || scallop === 6 ? -1 : 0);
    if (row >= hem) return undefined;
    const edge = row === 0 ? 1 : row >= hem - 1 ? -1 : 0;
    return tone(AWNING, 1.8 + lightAt(lights, px, py) * 0.6 + edge, px, py);
  });
  for (let stain = 0; stain < 3; stain++) {
    const sx = x + random.int(10, width - 20);
    const sy = y + random.int(2, slope - 4);
    canvas.fill(sx, sy, random.int(4, 9), 2, at(AWNING, 0));
  }
}

/**
 * A rolling shutter: its housing box, its slats every 6 pixels (one step darker joints), its
 * bottom bar and padlocks, lit by the lights it faces.
 */
export function drawShutter(canvas: Canvas, rect: Rect, lights: readonly Light[]): void {
  const { x, y, width, height } = rect;
  drawLedge(canvas, x - 4, y - 10, width + 8, 10, lights);
  canvas.paint(x, y, width, height, (px, py) => {
    const joint = (py - y) % 6 === 5 ? -0.9 : 0;
    const wear = ((px * 7 + py * 3) % 23 === 0 ? -0.5 : 0) + (py - y < 3 ? -0.8 : 0);
    return tone(SHUTTER, 1.4 + lightAt(lights, px, py) * 0.8 + joint + wear, px, py);
  });
  canvas.fill(x, y + height - 6, width, 6, at(SHUTTER, 1));
  canvas.hline(x, y + height - 6, width, at(SHUTTER, 4));
  for (const px of [x + 8, x + width - 14]) {
    canvas.fill(px, y + height - 5, 6, 5, at(STEEL, 4));
    canvas.fill(px + 1, y + height - 8, 4, 3, at(STEEL, 2));
  }
}

/**
 * The sidewalk shed on the left corner: posts down to the curb, the plank deck and its rail, a
 * plywood fence under it (posters and tags go on it after).
 */
export function drawScaffold(
  canvas: Canvas,
  x: number,
  width: number,
  deck: number,
  foot: number,
  lights: readonly Light[],
): Rect {
  const fence: Rect = { x, y: deck + 26, width: width - 14, height: foot - deck - 30 };
  canvas.paint(fence.x, fence.y, fence.width, fence.height, (px, py) => {
    const seam = (px - x) % 48 === 47 ? -1.2 : 0;
    const grain = ((px * 5 + Math.floor(py / 3) * 11) % 17 === 0 ? -0.4 : 0) as number;
    return tone(PLYWOOD, 1.3 + lightAt(lights, px, py) * 0.6 + seam + grain, px, py);
  });
  canvas.hline(fence.x, fence.y, fence.width, at(PLYWOOD, 3));
  // Posts: the lit one at the corner marks the end of the street.
  for (const px of [x + 4, x + width / 2, x + width - 10]) {
    canvas.fill(px, deck, 6, foot - deck, at(STEEL, 1));
    canvas.vline(px + 5, deck, foot - deck, at(STEEL, 3));
  }
  canvas.fill(x, deck, 6, foot - deck, at(STEEL, 2));
  canvas.vline(x + 5, deck, foot - deck, at(STEEL, 5));
  canvas.vline(x + 4, deck, foot - deck, at(STEEL, 4));
  // The deck: a beam, the planks' ends, a rail over them.
  canvas.fill(x, deck, width, 12, at(STEEL, 1));
  canvas.hline(x, deck, width, at(STEEL, 4));
  canvas.fill(x, deck + 12, width, 3, at(STEEL, 0));
  canvas.fill(x, deck - 14, width, 2, at(STEEL, 3));
  for (let px = x + 3; px < x + width; px += 22) canvas.fill(px, deck - 12, 2, 12, at(STEEL, 1));
  for (let px = x + 2; px < x + width; px += 9) canvas.fill(px, deck + 3, 6, 6, at(PLYWOOD, 2));
  return fence;
}

/** A poster pasted on a wall: faded paper, an abstract printed shape, a torn bottom edge. */
export function drawPoster(canvas: Canvas, rect: Rect, random: Random): void {
  const { x, y, width, height } = rect;
  const red = random.chance(0.4);
  const tear = Array.from({ length: width }, () => random.int(0, 4));
  canvas.paint(x, y, width, height, (px, py) => {
    if (py > y + height - 1 - (tear[px - x] ?? 0)) return undefined;
    return at(PAPER, py === y ? 3 : 2);
  });
  const blockY = y + random.int(3, 6);
  const blockHeight = random.int(Math.round(height * 0.3), Math.round(height * 0.5));
  canvas.fill(x + 3, blockY, width - 6, blockHeight, red ? at(POSTER_RED, 1) : at(PAPER, 0));
  for (let line = blockY + blockHeight + 3; line < y + height - 8; line += 4) {
    canvas.hline(x + 3, line, random.int(Math.round(width * 0.3), width - 6), at(PAPER, 1));
  }
}

/** A fire hydrant on the sidewalk: its dome, its two side nozzles, lit on the `side` of the light. */
export function drawHydrant(canvas: Canvas, x: number, foot: number, side: -1 | 1): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.rect(x - 6, foot - 26, 12, 24);
  mask.ellipse(x - 6, foot - 32, 12, 10);
  mask.rect(x - 2, foot - 35, 4, 4);
  mask.rect(x - 10, foot - 20, 20, 6);
  mask.rect(x - 8, foot - 4, 16, 4);
  for (let py = foot - 36; py < foot; py++) {
    for (let px = x - 11; px < x + 11; px++) {
      if (!mask.has(px, py)) continue;
      const lit = !mask.has(px + side, py) || !mask.has(px + side * 2, py) ? 1.4 : 0;
      const shade = !mask.has(px - side, py) || !mask.has(px, py + 1) ? -1 : 0;
      const top = !mask.has(px, py - 1) ? 1 : 0;
      canvas.set(px, py, tone(HYDRANT, 1.3 + lit + shade + top, px, py));
    }
  }
}

/** Trash bags heaped against a wall: soft blobs, a glossy highlight on each, a tied neck. */
export function drawBags(
  canvas: Canvas,
  x: number,
  foot: number,
  count: number,
  random: Random,
): void {
  for (let bag = 0; bag < count; bag++) {
    const width = random.int(16, 24);
    const height = random.int(14, 20);
    const bx = x + bag * 13 - random.int(0, 4);
    const by = foot - height - (bag % 2) * random.int(4, 9);
    const mask = new Mask(canvas.width, canvas.height);
    mask.ellipse(bx, by, width, height);
    mask.ellipse(bx + width / 2 - 2, by - 4, 5, 6);
    for (let py = by - 5; py < by + height; py++) {
      for (let px = bx; px < bx + width; px++) {
        if (!mask.has(px, py)) continue;
        const gloss = Math.hypot(px - bx - width * 0.32, py - by - height * 0.3) < 3 ? 2 : 0;
        const rim = !mask.has(px, py - 1) ? 1 : !mask.has(px, py + 1) ? -1 : 0;
        canvas.set(px, py, at(BAG, 1 + gloss + rim));
      }
    }
  }
}

/** A crate of fruit on the sidewalk: its wooden front, the round fruit heaped on top. */
export function drawCrate(
  canvas: Canvas,
  x: number,
  foot: number,
  fruit: readonly number[],
  random: Random,
): void {
  canvas.fill(x, foot - 14, 28, 14, at(CRATE, 1));
  canvas.hline(x, foot - 14, 28, at(CRATE, 2));
  canvas.hline(x, foot - 8, 28, at(CRATE, 0));
  canvas.vline(x, foot - 14, 14, at(CRATE, 2));
  canvas.vline(x + 27, foot - 14, 14, at(CRATE, 0));
  for (let fx = x + 1; fx < x + 26; fx += 4) {
    const fy = foot - 18 - random.int(0, 2);
    canvas.fill(fx, fy, 4, 4, at(fruit, 1));
    canvas.set(fx + 1, fy, at(fruit, 2));
    canvas.set(fx + 3, fy + 3, at(fruit, 0));
  }
}

export const FRUITS = [FRUIT.orange, FRUIT.red, FRUIT.green, FRUIT.yellow] as const;

/** Steel cellar doors flush in the sidewalk, seen at a grazing angle: two lit-edged plates. */
export function drawCellarDoors(canvas: Canvas, x: number, y: number, width: number): void {
  for (const [left, w] of [
    [x, Math.floor(width / 2) - 1],
    [x + Math.ceil(width / 2) + 1, Math.floor(width / 2) - 1],
  ] as const) {
    canvas.fill(left, y, w, 8, at(STEEL, 2));
    canvas.hline(left, y, w, at(STEEL, 4));
    canvas.hline(left, y + 7, w, at(STEEL, 0));
    for (let px = left + 3; px < left + w - 2; px += 6) canvas.set(px, y + 3, at(STEEL, 3));
  }
}

/** A dumpster in the alley: its body, its slanted lid, a wheel, lit on the street side. */
export function drawDumpster(canvas: Canvas, x: number, foot: number): void {
  canvas.fill(x, foot - 34, 54, 30, at(SHUTTER, 1));
  canvas.vline(x + 53, foot - 34, 30, at(SHUTTER, 3));
  canvas.fill(x - 2, foot - 40, 58, 6, at(SHUTTER, 2));
  canvas.hline(x - 2, foot - 40, 58, at(SHUTTER, 3));
  for (let px = x + 8; px < x + 50; px += 14) canvas.vline(px, foot - 32, 26, at(SHUTTER, 0));
  for (const px of [x + 4, x + 42]) canvas.fill(px, foot - 4, 7, 4, at(STEEL, 0));
}

/** A cast iron drainpipe down a wall, its brackets every 40 pixels. */
export function drawDrainpipe(canvas: Canvas, x: number, top: number, bottom: number): void {
  canvas.fill(x, top, 4, bottom - top, at(STEEL, 1));
  canvas.vline(x, top, bottom - top, at(STEEL, 3));
  for (let py = top + 10; py < bottom; py += 40) canvas.fill(x - 1, py, 6, 3, at(STEEL, 2));
  canvas.fill(x - 2, bottom - 6, 8, 6, at(STEEL, 1));
}
