/**
 * The middle layer (docs/art/decor-temple.md §2.2): the temple's courtyard. On the left, the hall:
 * its lacquered pillars on a stone base, its great roof, its lanterns under the eaves, a wind chime
 * at its corner, the ema and the omikuji by its steps. In the middle, the gate: two red pillars, its
 * beams, its sacred rope and paper streamers, two stone foxes at its feet. Two stone lanterns; a
 * string of paper lanterns to the cherry tree on the right. The courtyard's wall behind, its tiled
 * cap, the sea past it (the far layer). Flat tones, firm edges, few details where the fighters
 * stand (docs/art/proprete.md). Image pixels (STAGE_SCALE): the wall's foot is row BASE.
 *
 * What the wind's gust shakes loops over GUST_CYCLE, with it.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import {
  BARK,
  BIB,
  BLOSSOM,
  BRONZE,
  LACQUER,
  LANTERN,
  MOSS,
  PAPER,
  ROPE,
  SNOW_BLOSSOM,
  SNOW_MOSS,
  SNOW_STONE,
  SNOW_TILE,
  STONE,
  TILE,
  WOOD,
} from './palette.ts';

/** Row of the courtyard's wall foot: the back of the ground. */
export const BASE = 410;
/** Last row the layer draws: just past the ground line, under the floor. */
const FLOOR_END = 470;
/** The wall behind the courtyard: its cap's top, its foot. */
const WALL = { top: 330, cap: 316 } as const;
const HALL = { left: 24, right: 470, base: 352, eave: 214, ridge: 128 } as const;
const GATE = { left: 584, right: 788, pillar: 18, top: 150, beam: 196 } as const;
const STONE_LANTERNS = [884, 1006] as const;
const TREE = { x: 1236, foot: 418 } as const;
/** The string of paper lanterns, from the gate's right pillar to the tree. */
const STRING = { left: GATE.right - 6, right: 1150, y: 208, sag: 22 } as const;
const PAPER_LANTERNS = [842, 930, 1018, 1100] as const;

/** The warm pools of the lanterns on what is near them. */
const LIGHTS: readonly Light[] = [
  ...STONE_LANTERNS.map((x): Light => ({ x, y: 330, radius: 90, strength: 1.4, squash: 0.8 })),
  { x: 250, y: 280, radius: 170, strength: 1.2, squash: 0.8 },
];

/** Steps of 1/60 s. The wind's cycle: every 40 s a gust, from GUST_AT, for GUST steps. */
export const GUST_CYCLE = 2400;
export const GUST_AT = 1200;
export const GUST = 300;

/** Whether the gust blows at `step` of its cycle. */
export function gusting(step: number): boolean {
  return step >= GUST_AT && step < GUST_AT + GUST;
}

/** An animation of the layer: what it covers, and how it draws each of its frames. */
export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

/** A timeline over GUST_CYCLE: the frame at each step, runs of the same frame merged. */
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

/** A level of `ramp` lit by the lanterns, flat: whole steps, no dither (docs/art/proprete.md). */
function lit(ramp: readonly number[], level: number, x: number, y: number): number {
  return at(ramp, Math.round(level + lightAt(LIGHTS, x, y)));
}

// --- The wall, the ground behind. ---------------------------------------------------------------

/** The courtyard's wall: plaster panels between stone posts, its tiled cap (snow on it, hidden). */
function drawWall(canvas: Canvas): void {
  canvas.paint(0, WALL.top, canvas.width, BASE - WALL.top, (x, y) => {
    const post = x % 160 < 12;
    const foot = y > BASE - 10;
    if (post) return lit(STONE, x % 160 < 3 ? 4 : 2, x, y);
    return lit(STONE, foot ? 2 : 3, x, y);
  });
  canvas.paint(0, WALL.cap, canvas.width, WALL.top - WALL.cap, (x, y) => {
    if (y < WALL.cap + 6) return at(SNOW_TILE, y < WALL.cap + 2 ? 4 : 2);
    const course = (y - WALL.cap) % 5 === 0;
    return at(TILE, course ? 1 : x % 14 === 0 ? 1 : 2);
  });
  // Moss along its foot.
  for (let x = 0; x < canvas.width; x++) {
    const tall = Math.round(noise(31, x, 0, 30) * 5);
    if (tall > 1) canvas.vline(x, BASE - tall, tall, at(MOSS, 1));
  }
}

/** The ground between the wall and the ground line: packed earth and stone, a step darker. */
function drawGround(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    const near = (y - BASE) / (FLOOR_END - BASE);
    if (y < BASE + 3) return at(STONE, 1);
    const snow = noise(37, x, y, 90) > 0.12;
    return snow ? lit(SNOW_STONE, 2 + near, x, y) : lit(STONE, 2 + near, x, y);
  });
}

// --- The hall. ----------------------------------------------------------------------------------

/** A roof: a curved slab of tiles from its ridge to its eave, flaring up at both ends. */
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
    const lift = edge < 0.12 ? Math.round(flare * (1 - edge / 0.12) ** 2) : 0;
    const top = ridge;
    const inset = Math.round((1 - Math.min(edge / 0.2, 1)) * (eave - ridge) * 0.55);
    for (let y = top + inset; y < eave - lift; y++) {
      // The snow on its slope, hidden; the tiles' runs; the eave's dark lip.
      if (y < top + inset + 8) {
        canvas.set(x, y, at(SNOW_TILE, y < top + inset + 3 ? 4 : 3));
        continue;
      }
      if (y > eave - lift - 5) {
        canvas.set(x, y, at(TILE, y === eave - lift - 1 ? 0 : 3));
        continue;
      }
      canvas.set(x, y, at(TILE, x % 9 === 0 ? 1 : 2));
    }
  }
  // The ridge's beam and its two end tiles.
  canvas.fill(left + width * 0.2, ridge - 6, width * 0.6, 6, at(TILE, 3));
  canvas.hline(left + width * 0.2, ridge - 6, width * 0.6, at(SNOW_TILE, 4));
  canvas.fill(left + width * 0.2 - 6, ridge - 14, 8, 14, at(TILE, 3));
  canvas.fill(left + width * 0.8 - 2, ridge - 14, 8, 14, at(TILE, 3));
}

/** A paper lantern hanging at x, its top at y, swung `swing` pixels at its foot. */
function drawPaperLantern(canvas: Canvas, x: number, y: number, swing: number): void {
  const body = new Mask(canvas.width, canvas.height);
  const cx = x + swing;
  body.ellipse(cx - 9, y + 4, 18, 24);
  canvas.line(x, y - 6, cx, y + 4, at(ROPE, 1));
  canvas.paint(cx - 12, y - 2, 24, 34, (px, py) => {
    if (!body.has(px, py)) return undefined;
    const rib = (py - y) % 6 === 0;
    const side = px < cx - 5 ? 2 : px > cx + 4 ? 2 : 3;
    return at(LANTERN, rib ? side - 1 : side);
  });
  canvas.fill(cx - 6, y + 2, 12, 3, at(WOOD, 1));
  canvas.fill(cx - 6, y + 26, 12, 3, at(WOOD, 1));
  canvas.vline(cx, y + 29, 5, at(ROPE, 2));
}

/** The hall: its stone base and steps, its pillars and dark doors, its roof, its lanterns. */
function drawHall(canvas: Canvas, swing: number, chime: number): void {
  const { left, right, base, eave, ridge } = HALL;
  // The stone base and its steps.
  canvas.paint(left - 10, base, right - left + 20, BASE - base + 6, (x, y) =>
    lit(STONE, y === base ? 5 : y < base + 4 ? 4 : 3, x, y),
  );
  for (let step = 0; step < 4; step++) {
    const y = base + 14 + step * 12;
    canvas.fill(
      right - 40 - step * 10,
      y,
      60 + step * 20,
      12,
      lit(STONE, 4 - (step % 2), right, y),
    );
    canvas.hline(right - 40 - step * 10, y, 60 + step * 20, at(STONE, 5));
  }
  // The walls between the pillars: dark wood doors, a warm light behind their paper.
  canvas.paint(left + 20, eave, right - left - 40, base - eave, (x, y) => {
    const panel = (x - left) % 32 < 2 || (y - eave) % 30 < 2;
    if (y > eave + 30 && y < base - 30 && x > left + 120 && x < left + 300) {
      return at(PAPER, panel ? 0 : 1);
    }
    return at(WOOD, panel ? 2 : 0);
  });
  // The lacquered pillars.
  for (let x = left + 20; x <= right - 40; x += 92) {
    canvas.paint(x, eave - 4, 16, base - eave + 4, (px, py) =>
      lit(LACQUER, px - x < 4 ? 4 : px - x > 12 ? 1 : 3, px, py),
    );
  }
  // The beam under the eave, and the roof over all.
  canvas.fill(left, eave - 10, right - left, 10, at(LACQUER, 2));
  canvas.hline(left, eave - 10, right - left, at(LACQUER, 4));
  drawRoof(canvas, left - 40, right + 40, ridge, eave - 8, 22);
  // Two paper lanterns under the eave, the wind chime at its right corner.
  drawPaperLantern(canvas, left + 110, eave + 2, swing);
  drawPaperLantern(canvas, left + 330, eave + 2, swing);
  const corner = right + 26;
  canvas.vline(corner, eave - 14, 18, at(ROPE, 1));
  canvas.fill(corner - 4, eave + 4, 9, 7, at(BRONZE, 3));
  canvas.vline(corner + ([0, 2, -2][chime % 3] ?? 0), eave + 11, 12, at(PAPER, 2));
}

/** The ema rack and the omikuji line by the hall's steps: small, at the edge, out of the way. */
function drawVotives(canvas: Canvas): void {
  const x = 498;
  canvas.fill(x, 352, 4, BASE - 352, at(WOOD, 2));
  canvas.fill(x + 60, 352, 4, BASE - 352, at(WOOD, 2));
  canvas.fill(x - 4, 350, 72, 4, at(WOOD, 3));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) canvas.fill(x + 6 + i * 9, 358 + row * 14, 7, 9, at(WOOD, 4));
  }
  canvas.hline(x + 2, 392, 60, at(ROPE, 1));
  for (let i = 0; i < 7; i++) canvas.fill(x + 6 + i * 8, 392, 3, 4, at(PAPER, 2));
}

// --- The gate, the foxes. -----------------------------------------------------------------------

/** The sacred rope between the gate's pillars and its paper streamers, fluttering (`flutter`). */
function drawRope(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, beam } = GATE;
  const y0 = beam + 24;
  for (let x = left + pillar; x < right; x++) {
    const t = (x - left - pillar) / (right - left - pillar);
    const y = y0 + Math.round(Math.sin(t * Math.PI) * 10);
    canvas.fill(x, y, 1, 5, at(ROPE, (x + y) % 6 < 3 ? 2 : 1));
  }
  // The streamers: zigzags of paper hanging from it.
  for (let i = 1; i < 5; i++) {
    const x = left + pillar + Math.round(((right - left - pillar) * i) / 5);
    const t = i / 5;
    const top = y0 + 5 + Math.round(Math.sin(t * Math.PI) * 10);
    const lean = flutter === 0 ? 0 : flutter === 1 ? 2 : 4;
    for (let seg = 0; seg < 4; seg++) {
      const sx = x + (seg % 2 === 0 ? 0 : 3) + Math.round((lean * seg) / 3);
      canvas.fill(sx, top + seg * 5, 4, 5, at(PAPER, seg % 2 === 0 ? 2 : 1));
    }
  }
}

/** The gate: two lacquered pillars, its two beams, the top one curving up at its ends. */
function drawGate(canvas: Canvas, flutter: number): void {
  const { left, right, pillar, top, beam } = GATE;
  for (const x of [left, right - pillar]) {
    canvas.paint(x, top + 10, pillar, BASE + 4 - top - 10, (px) =>
      at(LACQUER, px - x < 5 ? 4 : px - x > pillar - 4 ? 1 : 3),
    );
    // Its black foot.
    canvas.fill(x - 2, BASE - 18, pillar + 4, 22, at(WOOD, 0));
    canvas.hline(x - 2, BASE - 18, pillar + 4, at(WOOD, 3));
  }
  canvas.fill(left - 10, beam, right - left + 20, 10, at(LACQUER, 3));
  canvas.hline(left - 10, beam, right - left + 20, at(LACQUER, 4));
  // The top beam: dark, wider, its ends sweeping up.
  for (let x = left - 40; x < right + 40; x++) {
    const t = (x - (left - 40)) / (right - left + 80);
    const up = Math.round(((t - 0.5) * 2) ** 4 * 14);
    canvas.fill(x, top - up, 1, 10, at(WOOD, 1));
    canvas.set(x, top - up, at(SNOW_TILE, 4));
    canvas.fill(x, top + 10 - up, 1, 6, at(LACQUER, 2));
  }
  drawRope(canvas, flutter);
}

/** A stone fox guardian on its pedestal, its red bib, facing `facing`. */
function drawFox(canvas: Canvas, x: number, facing: -1 | 1): void {
  const foot = BASE + 2;
  canvas.fill(x - 16, foot - 18, 32, 18, at(STONE, 3));
  canvas.hline(x - 16, foot - 18, 32, at(STONE, 5));
  const body = new Mask(canvas.width, canvas.height);
  body.ellipse(x - 9, foot - 46, 18, 28);
  body.ellipse(x - 7 + facing * 4, foot - 60, 14, 14);
  body.polygon([
    [x - 4 + facing * 4, foot - 60],
    [x - 1 + facing * 4, foot - 72],
    [x + 2 + facing * 4, foot - 60],
  ]);
  body.limb(x - facing * 8, foot - 22, x - facing * 14, foot - 50, 3);
  canvas.paint(x - 20, foot - 76, 40, 58, (px, py) => {
    if (!body.has(px, py)) return undefined;
    const rim = !body.has(px - facing, py) || !body.has(px, py - 1);
    return lit(STONE, rim ? 5 : 3, px, py);
  });
  canvas.fill(x - 6 + facing * 3, foot - 50, 12, 5, at(BIB, 1));
  canvas.fill(x - 4 + facing * 3, foot - 45, 8, 3, at(BIB, 0));
}

// --- The lanterns, the tree. --------------------------------------------------------------------

/** A stone lantern: its base, its post, its firebox lit (`flame`), its roof (snow on it). */
function drawStoneLantern(canvas: Canvas, x: number, flame: number): void {
  const foot = BASE + 2;
  canvas.fill(x - 14, foot - 10, 28, 10, at(STONE, 3));
  canvas.fill(x - 6, foot - 58, 12, 48, at(STONE, 3));
  canvas.vline(x - 6, foot - 58, 48, at(STONE, 5));
  canvas.fill(x - 16, foot - 64, 32, 6, at(STONE, 4));
  // The firebox: its openings lit.
  canvas.fill(x - 12, foot - 86, 24, 22, at(STONE, 2));
  canvas.fill(x - 7, foot - 82, 14, 14, at(LANTERN, flame === 0 ? 2 : 3));
  canvas.fill(x - 3, foot - 79, 6, 8, at(LANTERN, 4));
  // Its roof, flaring, its jewel.
  for (let row = 0; row < 10; row++) {
    const half = 8 + row * 1.6;
    canvas.hline(
      Math.round(x - half),
      foot - 98 + row,
      Math.round(half * 2),
      at(STONE, row < 3 ? 5 : 4),
    );
  }
  canvas.hline(x - 10, foot - 99, 20, at(SNOW_STONE, 7));
  canvas.fill(x - 3, foot - 106, 6, 7, at(STONE, 4));
}

/** The cherry tree: its dark trunk and branches, its canopy in flat clusters lit from above. */
function drawTree(canvas: Canvas): void {
  const { x, foot } = TREE;
  const wood = new Mask(canvas.width, canvas.height);
  wood.limb(x, foot, x - 6, foot - 140, 9);
  wood.limb(x - 6, foot - 140, x - 90, foot - 230, 6);
  wood.limb(x - 6, foot - 140, x + 70, foot - 250, 6);
  wood.limb(x - 50, foot - 200, x - 140, foot - 214, 3);
  canvas.paint(x - 160, foot - 280, 260, 290, (px, py) => {
    if (!wood.has(px, py)) return undefined;
    return at(BARK, wood.has(px + 2, py) ? 1 : 3);
  });
  const canopy = new Mask(canvas.width, canvas.height);
  const clusters = [
    [-120, -250, 90, 54],
    [-60, -290, 120, 70],
    [30, -300, 120, 76],
    [100, -258, 90, 58],
    [-150, -214, 70, 40],
    [-10, -240, 110, 56],
    [60, -214, 80, 40],
  ] as const;
  for (const [dx, dy, w, h] of clusters) canopy.ellipse(x + dx, foot + dy, w, h);
  canvas.paint(x - 170, foot - 310, 340, 140, (px, py) => {
    if (!canopy.has(px, py)) return undefined;
    // Flat tones: lit on top, a clean shadow under each cluster, snow on its top, hidden.
    if (!canopy.has(px, py - 2)) return at(SNOW_BLOSSOM, 4);
    if (!canopy.has(px, py - 6)) return at(BLOSSOM, 4);
    if (!canopy.has(px, py + 4)) return at(BLOSSOM, 1);
    return at(BLOSSOM, noise(41, px, py, 26) > 0.6 ? 3 : 2);
  });
}

/** Petals falling under the tree, `frame` 1 to 4 (a gust's 5 and 6: many, blown left). */
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

/** The string of paper lanterns, swung `swing` (-3 to 3) at their feet. */
function drawString(canvas: Canvas, swing: number): void {
  const { left, right, y, sag } = STRING;
  const rowAt = (x: number) =>
    y + Math.round(Math.sin(((x - left) / (right - left)) * Math.PI) * sag);
  for (let x = left; x < right; x++) canvas.set(x, rowAt(x), at(ROPE, 1));
  PAPER_LANTERNS.forEach((x, index) => {
    drawPaperLantern(canvas, x, rowAt(x) + 6, index % 2 === 0 ? swing : -swing);
  });
}

// --- The animations. ----------------------------------------------------------------------------

/** The petals' rectangles under the canopy, and the lanterns' string's. */
const PETAL_RECTS: readonly Rect[] = [
  { x: TREE.x - 190, y: TREE.foot - 200, width: 90, height: 190 },
  { x: TREE.x - 90, y: TREE.foot - 190, width: 90, height: 180 },
  { x: TREE.x + 10, y: TREE.foot - 200, width: 90, height: 190 },
];
const STRING_RECT: Rect = { x: 820, y: STRING.y, width: 310, height: STRING.sag + 50 };

/** The paper lanterns' swing: a slow sway, wide in the gust. */
function swingAt(step: number): number {
  if (gusting(step)) return [3, 2, -2, -3, -2, 2][Math.floor(step / 10) % 6] ?? 0;
  return [1, 0, -1, 0][Math.floor(step / 60) % 4] ?? 0;
}

/** The swing's frame: its pixel offset (-3 to 3) as a frame number (1 to 7, 4 at rest). */
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
    rect: { x: x - 7, y: BASE + 2 - 82, width: 14, height: 14 },
    frames: 2,
    // A slow breath of the fire, each state 40 steps at least: never a flash (docs/flashs.md).
    timeline: timelineOf((step) => (Math.floor((step + index * 80) / 40) % 3 === 0 ? 1 : 0)),
  })),
];

/**
 * The middle layer, `width` × `height` image pixels; `frameOf` gives each animation's frame (0 for
 * the still layer); drawn only inside `clip` when given.
 */
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
  drawVotives(canvas);
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
  // The ground's moss under the snow, hidden, along the wall's foot.
  canvas.paint(0, BASE - 2, width, 2, (x) =>
    noise(43, x, 0, 20) > 0.6 ? at(SNOW_MOSS, 2) : undefined,
  );
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
