/**
 * The dock's fixtures (docs/art/decor-dock.md §2.2), each drawn where it is told: the roll-up
 * shutters, the stage door and its chain, the lamps, the dumpster and its cat, the pallets, the
 * freight lift's gate, the alley's fence. The layout is mid.ts's.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, type Random } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { drawHalo, drawTubes } from '../rue/signs.ts';
import {
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

/** Height of a shutter's slat, image pixels. */
const SLAT = 6;
/** How high from its bottom a shutter rattles in its guides (`rattle`): its five lowest slats. */
export const LOOSE = SLAT * 5;

/**
 * A roll-up shutter in its bay, down to row `bottom` (the dock's floor when shut): its hood, its
 * guides, slats of plum paint gone grey with rust breaking through, a big stenciled bay number,
 * the bottom bar and its handle. `rattle` shifts the LOOSE slats a pixel and lifts the bar (the
 * bass, mid.ts).
 */
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
  const hood = 10;
  // The guides, steel channels down each side.
  for (const gx of [x - 6, x + width]) {
    canvas.paint(gx, y, 6, rect.height, (px, py) =>
      tone(STEEL, 1.4 + (px === gx ? 1 : 0) + lightAt(lights, px, py) * 0.5, px, py),
    );
  }
  const top = y + hood;
  const loose = bottom - LOOSE;
  canvas.paint(x, top, width, bottom - top, (px, py) => {
    const shift = py >= loose ? rattle : 0;
    const row = (py - top + shift + SLAT * 10) % SLAT;
    const groove = row === SLAT - 1 ? -1.3 : row === 0 ? 0.9 : 0;
    const lit = lightAt(lights, px, py) * 0.85;
    // Rust: runs down from the slats' edges, worse low where the rain splashes.
    const low = (py - top) / (bottom - top);
    const run = noise(seed, px, py * 0.25, 9) * 0.75 + noise(seed + 1, px, py, 3) * 0.25;
    if (run > 0.8 - low * 0.14) return tone(RUST, 0.6 + lit * 0.5 + groove * 0.5, px, py);
    return tone(SHUTTER, 1.7 + lit + groove + (noise(seed + 2, px, py, 30) - 0.5) * 0.6, px, py);
  });
  // The bay's number, stenciled big, a little worn; smaller on a shutter half up.
  const scale = Math.min(5, Math.floor((bottom - top - 8) / 7));
  const textWidth = spell(label, scale, 1, () => undefined);
  const lx = x + Math.round((width - textWidth) / 2);
  const ly = top + Math.round((bottom - top - 7 * scale) * 0.4);
  // A shutter rolled up has no room left for its number.
  spell(label, Math.max(scale, 1), 1, (px, py) => {
    const sx = lx + px;
    const sy = ly + py;
    if (scale < 1 || sy >= bottom - 4 || noise(seed + 5, sx, sy, 4) < 0.16) return;
    canvas.set(sx, sy, at(TAG.cream, (sy - top) % SLAT === SLAT - 1 ? 0 : 1));
  });
  // The bottom bar, its rubber seal and handle.
  const barY = bottom - 5 - (rattle > 0 ? 2 : 0);
  canvas.fill(x, barY, width, 4, at(STEEL, 2));
  canvas.hline(x, barY, width, at(STEEL, 4));
  canvas.hline(x, barY + 4, width, at(RUBBER, 0));
  canvas.fill(x + width / 2 - 8, barY - 6, 16, 3, at(STEEL, 3));
  // The hood the shutter rolls into.
  canvas.fill(x - 8, y, width + 16, hood, at(STEEL, 2));
  canvas.hline(x - 8, y, width + 16, at(STEEL, 4));
  canvas.hline(x - 8, y + hood - 1, width + 16, at(STEEL, 0));
}

/**
 * The stage door: riveted steel in a steel frame, the light under it, a pull handle, and the chain
 * wrapped through the handle and the hasp, its padlock hanging (docs/art/histoire.md: the padlock
 * of a door that did not hold).
 */
export function drawStageDoor(canvas: Canvas, rect: Rect, lights: readonly Light[]): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 5, y - 5, width + 10, height + 5, at(STEEL, 1));
  canvas.hline(x - 5, y - 5, width + 10, at(STEEL, 3));
  canvas.paint(x, y, width, height, (px, py) => {
    const panel =
      px - x === 3 || px - x === width - 4 || py - y === 4 || py - y === height - 5 ? -0.8 : 0;
    const scuff = py > y + height - 18 && noise(13, px, py, 4) > 0.6 ? -0.6 : 0;
    return tone(STEEL, 2 + lightAt(lights, px, py) * 0.9 + panel + scuff, px, py);
  });
  for (let py = y + 8; py < y + height - 6; py += 14) {
    canvas.set(x + 1, py, at(STEEL, 5));
    canvas.set(x + width - 2, py, at(STEEL, 5));
  }
  // The violet of the club under the door.
  canvas.hline(x + 2, y + height - 1, width - 4, at(GLASS, 2));
  // The handle, the hasp on the frame, the chain looped between them, the padlock.
  const hy = y + 50;
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

/** The EXIT box over the door: green letters lit from inside, its steel case. */
export function drawExitSign(canvas: Canvas, x: number, y: number): void {
  const width = spell('EXIT', 1, 1, () => undefined) + 8;
  canvas.fill(x, y, width, 12, at(STEEL, 1));
  canvas.fill(x + 1, y + 1, width - 2, 10, at(EXIT, 0));
  const glow = new Mask(canvas.width, canvas.height);
  spell('EXIT', 1, 1, (px, py) => {
    glow.add(x + 4 + px, y + 1 + py);
  });
  drawHalo(canvas, glow, EXIT, 1.5);
  spell('EXIT', 1, 1, (px, py) => {
    canvas.set(x + 4 + px, y + 1 + py, at(EXIT, 3));
  });
}

/** A caged bulb on the wall: a warm bulb behind its bars, a ring of light on the brick. */
export function drawCagedLamp(canvas: Canvas, x: number, y: number): void {
  const bulb = new Mask(canvas.width, canvas.height);
  bulb.rect(x - 3, y, 7, 8);
  drawHalo(canvas, bulb, SODIUM, 7);
  canvas.fill(x - 6, y - 4, 13, 3, at(STEEL, 2));
  canvas.fill(x - 3, y, 7, 8, at(SODIUM, 3));
  canvas.fill(x - 1, y + 2, 3, 4, at(SODIUM, 4));
  for (const px of [x - 4, x, x + 4]) canvas.vline(px, y - 1, 10, at(STEEL, 1));
  canvas.hline(x - 4, y + 9, 9, at(STEEL, 1));
}

/** A sodium wall pack under the canopy: a dark box, its lens glowing down. */
export function drawWallPack(canvas: Canvas, cx: number, y: number): void {
  canvas.fill(cx - 9, y, 18, 8, at(STEEL, 2));
  canvas.hline(cx - 9, y, 18, at(STEEL, 4));
  const lens = new Mask(canvas.width, canvas.height);
  lens.rect(cx - 7, y + 8, 14, 3);
  drawHalo(canvas, lens, SODIUM, 6);
  drawTubes(canvas, lens, SODIUM);
}

/** The dumpster: a dark green box, its lids, a wheel, its lit edges; foot on row `foot`. */
export function drawDumpster(canvas: Canvas, x: number, foot: number, width: number): void {
  const height = 46;
  const top = foot - height;
  canvas.paint(x, top, width, height - 4, (px, py) => {
    const rib = (px - x) % 18 === 9 ? -0.9 : (px - x) % 18 === 10 ? 0.6 : 0;
    const dent = noise(29, px, py, 7) > 0.78 ? -0.5 : 0;
    const rust = noise(31, px, py * 2, 9) > 0.8 && py > top + 20;
    if (rust) return at(RUST, 1);
    return tone(DUMPSTER, 1.6 + rib + dent - (py - top) / height, px, py);
  });
  canvas.vline(x + width - 1, top, height - 4, at(DUMPSTER, 3));
  // The lids, slanted back, a gap where one is ajar.
  canvas.fill(x - 2, top - 5, width + 4, 5, at(DUMPSTER, 2));
  canvas.hline(x - 2, top - 5, width + 4, at(DUMPSTER, 3));
  canvas.fill(x + width / 2 - 1, top - 5, 2, 5, at(DUMPSTER, 0));
  for (const px of [x + 4, x + width - 12]) {
    canvas.fill(px, foot - 4, 8, 4, at(RUBBER, 1));
    canvas.set(px + 3, foot - 3, at(STEEL, 3));
  }
}

/**
 * The cat on the dumpster's lid (`foot`: the lid's row), frame 0 sitting, its tail curled; 1 its
 * tail flicking up; 2 startled by the bass, its back arched, its tail a bottle brush.
 */
export function drawCat(canvas: Canvas, x: number, foot: number, frame: number): void {
  const body = at(CAT, 0);
  const rim = at(CAT, 1);
  if (frame === 2) {
    // Arched: the back up in a hump, the legs straight, the tail up and thick.
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

/** Trash bags heaped by the dumpster: soft blobs, a gloss on each, a tied neck. */
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
        const edge = !mask.has(px, py - 1) ? 1 : !mask.has(px, py + 1) ? -1 : 0;
        canvas.set(px, py, at(BAG, 1 + gloss + edge));
      }
    }
  }
}

/** Height of a pallet seen from its end: top deck, blocks, bottom boards. */
const PALLET = 9;

/** A pallet seen from its end: its top deck, three blocks, its bottom boards; foot on `foot`. */
function drawPallet(canvas: Canvas, x: number, foot: number, width: number, seed: number): void {
  const top = foot - PALLET;
  canvas.paint(x, top, width, 3, (px, py) =>
    tone(WOOD, 2.2 + (py === top ? 1 : 0) + (noise(seed, px, py, 6) - 0.5), px, py),
  );
  for (const bx of [x + 1, x + width / 2 - 4, x + width - 9]) {
    canvas.fill(bx, top + 3, 8, 4, at(WOOD, 1));
  }
  canvas.fill(x, foot - 2, width, 2, at(WOOD, 1));
}

/** A stack of pallets, each a little off the one under it. */
export function drawPallets(canvas: Canvas, x: number, foot: number, count: number): void {
  for (let level = 0; level < count; level++) {
    const shift = [0, 2, -1, 3, 1, -2][level] ?? 0;
    drawPallet(canvas, x + shift, foot - level * PALLET, 58, 40 + level);
  }
}

/**
 * The freight lift's scissor gate in its opening: the dark shaft behind, a dim bulb, the gate's
 * lattice of flat bars crossing, pulled shut.
 */
export function drawLiftGate(canvas: Canvas, rect: Rect): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 6, y - 6, width + 12, height + 6, at(STEEL, 2));
  canvas.hline(x - 6, y - 6, width + 12, at(STEEL, 4));
  canvas.paint(x, y, width, height, (px, py) =>
    tone(STEEL, 0.4 + Math.max(0, 1 - Math.hypot(px - x - width / 2, py - y - 12) / 50), px, py),
  );
  canvas.fill(x + width / 2 - 2, y + 6, 4, 4, at(SODIUM, 2));
  const cell = 12;
  canvas.paint(x, y, width, height, (px, py) => {
    const u = (px - x + py - y) % cell;
    const v = (px - x - (py - y) + cell * 40) % cell;
    if ((px - x) % cell === 0) return at(STEEL, 4);
    if (u === 0 || v === 0) return at(STEEL, 3);
    return undefined;
  });
  canvas.fill(x, y, width, 3, at(STEEL, 4));
  canvas.fill(x, y + height - 3, width, 3, at(STEEL, 4));
}

/**
 * The chain-link gate across the alley: posts, a top rail, the mesh's diamonds wide and dim (fine
 * stripes would shimmer when the screen shakes, docs/flashs.md §3), barbed wire on top.
 */
export function drawFence(canvas: Canvas, left: number, right: number, top: number, foot: number) {
  const cell = 10;
  canvas.paint(left, top, right - left, foot - top, (px, py) => {
    const u = (px - left + py) % cell;
    const v = (px - left - py + cell * 60) % cell;
    return u === 0 || v === 0 ? at(STEEL, 2) : undefined;
  });
  canvas.fill(left, top, right - left, 3, at(STEEL, 3));
  canvas.hline(left, top, right - left, at(STEEL, 4));
  for (const px of [left, Math.round((left + right) / 2), right - 4]) {
    canvas.fill(px, top - 14, 4, foot - top + 14, at(STEEL, 3));
    canvas.vline(px, top - 14, foot - top + 14, at(STEEL, 4));
  }
  // The coil of barbed wire, loops along the top.
  for (let px = left; px < right; px++) {
    const a = ((px - left) / 9) * Math.PI * 2;
    canvas.set(px, Math.round(top - 8 + Math.sin(a) * 5), at(STEEL, 3));
    if ((px - left) % 9 === 4) canvas.set(px, top - 8 + Math.round(Math.cos(a) * 5), at(STEEL, 4));
  }
}

/** A sign plate: pale enamel, red words, two bolts. */
export function drawPlate(canvas: Canvas, rect: Rect, lines: readonly string[]): void {
  const { x, y, width, height } = rect;
  canvas.paint(x, y, width, height, (px, py) =>
    tone(PAPER, 2.2 - (py - y) / height + (noise(x, px, py, 5) - 0.5) * 0.5, px, py),
  );
  canvas.hline(x, y + height, width, at(STEEL, 0));
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

/** Rust bleeding down from a bolt or an edge: a thin streak, fading. */
export function drawStreak(canvas: Canvas, x: number, y: number, length: number): void {
  for (let i = 0; i < length; i++) {
    if (noise(x, x, y + i, 3) < 0.25) continue;
    canvas.set(
      x + (i > length * 0.6 && i % 5 === 0 ? 1 : 0),
      y + i,
      at(RUST, i < length / 2 ? 1 : 0),
    );
  }
}

/** Concrete's tone for a dock face or a stair: form lines, stains, the lights. */
export function concreteAt(x: number, y: number, base: number, lights: readonly Light[]): number {
  const form = x % 64 === 0 ? -0.7 : 0;
  const stain = (noise(23, x, y * 2, 26) - 0.5) * 0.55;
  return base + form + stain + lightAt(lights, x, y) * 0.7;
}
