/**
 * The middle layer (docs/art/decor-neon-dusk.md §2.2): the street under the neons. A noodle stand
 * on the left, a wall of vending machines and a breathing sign on the right; the open middle with
 * its steaming manhole, a passer-by under an umbrella, a cat; cables and warm bulbs overhead. Flat
 * tones, simple masses where the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the low flying car passes at CAR_AT (far.ts, index.ts).
 */

import { Canvas, at } from '../kit/canvas.ts';
import { spellHan } from '../kit/font.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, STANDING } from '../rue/people.ts';
import {
  CRATE,
  FIGURE_RAMPS,
  GOODS,
  GREEN_POOL,
  LIGHT_POOL,
  NEON_GREEN,
  NEON_ORANGE,
  PAPER,
  PERSON,
  RIM,
  SHADOW,
  SIGN_BOARD,
  STEAM,
  STONE,
  TIN,
  WOOD,
} from './palette.ts';

/** Row where the stalls' feet rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the low flying car at CAR_AT. */
export const CYCLE = 2400;
export const CAR_AT = 1200;

const LEFT = { left: 56, right: 430, roof: 180, counter: 384 } as const;
const MACHINES = { left: 1000, right: 1360, top: 336 } as const;
const SIGN = { x: 1180, y: 262 } as const;
const MANHOLE = { x: 720, y: 424 } as const;
const WALKER = { x: 560, y: BASE - 2 } as const;
const CAT = { x: 884, y: BASE - 8 } as const;

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

/** A timeline over CYCLE: the frame at each step, runs of the same frame merged. */
export function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

/** The neon's breath: each state held 20 steps at least (never a blink). */
function neonAt(step: number): number {
  return Math.floor(step / 25) % 4;
}

/** The steam: a steady loop, stronger as the car passes (the moment). */
function steamAt(step: number): number {
  const into = (((step - CAR_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 60) return 3;
  if (into < 120) return 2;
  const loop = step % 160;
  return loop < 32 ? 0 : loop < 96 ? 1 : 2;
}

/** The walker's umbrella: it rises and falls as the drizzle comes and goes. */
function walkerAt(step: number): number {
  return step % 300 < 40 ? 1 : 0;
}

/** The cat's tail: a slow flick. */
function catAt(step: number): number {
  return step % 240 < 24 ? 1 : 0;
}

// --- The stalls. --------------------------------------------------------------------------------

/** The noodle stand's tin awning, its posts, its counter, its steam pot. */
function drawStand(canvas: Canvas): void {
  const { left, right, roof, counter } = LEFT;
  canvas.paint(left, roof, right - left, 52, (x, y) => {
    const point = Math.abs(((x - left) % 16) - 8);
    if (y >= roof + 48 - point) return undefined;
    const panel = Math.floor((x - left) / 16) % 2;
    return at(TIN, y < roof + 4 ? 2 : panel === 0 ? 1 : 0);
  });
  canvas.hline(left, roof, right - left, at(TIN, 2));
  for (const post of [left + 8, right - 16])
    canvas.fill(post, roof + 48, 8, counter - roof - 48, at(WOOD, 1));
  canvas.fill(left, counter, right - left, BASE - counter, at(WOOD, 2));
  canvas.hline(left, counter, right - left, at(WOOD, 3));
  for (let x = left + 18; x < right - 8; x += 20)
    canvas.vline(x, counter + 5, BASE - counter - 5, at(WOOD, 1));
  // The steam pot, and the bowls on the counter.
  canvas.fill(right - 110, counter - 34, 40, 34, at(STONE, 1));
  canvas.hline(right - 110, counter - 34, 40, at(GOODS, 3));
  canvas.fill(right - 106, counter - 42, 32, 8, at(STONE, 2));
  for (let index = 0; index < 4; index++) {
    const x = left + 30 + index * 40;
    canvas.fill(x, counter - 12, 26, 12, at(GOODS, 2));
    canvas.hline(x, counter - 12, 26, at(GOODS, 3));
  }
}

/** The wall of vending machines, and the breathing sign above it. */
function drawMachines(canvas: Canvas, frame: number): void {
  const { left, top } = MACHINES;
  for (let index = 0; index < 3; index++) {
    const x = left + index * 122;
    canvas.fill(x, top, 114, BASE - top, at(TIN, 1));
    canvas.hline(x, top, 114, at(TIN, 2));
    canvas.fill(x + 8, top + 10, 98, 56, at(SIGN_BOARD, 2));
    canvas.hline(x + 8, top + 10, 98, at(NEON_GREEN, 2));
    canvas.fill(x + 16, top + 20, 60, 20, at(NEON_GREEN, 1));
    canvas.fill(x + 20, top + 24, 40, 8, at(NEON_ORANGE, 2));
    canvas.fill(x + 8, top + 76, 98, 30, at(SIGN_BOARD, 0));
    canvas.fill(x + 30, top + 82, 46, 16, at(NEON_ORANGE, 1));
  }
  // The sign above: its core stays lit, its halo breathes (frames 0 to 3, dim to bright).
  const { x, y } = SIGN;
  const glow = [0, 1, 2, 3][frame] ?? 0;
  canvas.vline(x, y + 8, 10, at(STONE, 2));
  canvas.fill(x - 54, y - 24, 108, 34, at(SIGN_BOARD, 2));
  canvas.hline(x - 54, y - 24, 108, at(NEON_ORANGE, 2));
  if (glow > 0) {
    canvas.ellipse(x - 46, y - 18, 92, 22, at(NEON_ORANGE, 1));
    if (glow > 1) canvas.ellipse(x - 38, y - 14, 76, 14, at(NEON_ORANGE, 1));
    if (glow > 2) canvas.ellipse(x - 30, y - 10, 60, 6, at(NEON_ORANGE, 2));
  }
  spellHan('ネオン', 1, 1, (px, py) => {
    canvas.set(x - 22 + px, y - 8 + py, at(NEON_ORANGE, 4));
  });
}

/** The open middle: the steaming manhole, the walker, the cat on its crate. */
function drawStreet(canvas: Canvas, walkerFrame: number, catFrame: number): void {
  // The manhole and its light.
  canvas.ellipse(MANHOLE.x - 18, MANHOLE.y - 10, 36, 14, at(STONE, 0));
  canvas.ellipse(MANHOLE.x - 14, MANHOLE.y - 9, 28, 10, at(STONE, 2));
  for (let bar = 0; bar < 3; bar++) {
    canvas.hline(MANHOLE.x - 12, MANHOLE.y - 7 + bar * 3, 24, at(STONE, 3));
  }
  // The walker under the umbrella, the cat on a crate.
  drawFigure(
    canvas,
    {
      ...WALKER,
      height: 76,
      shoulders: 22,
      facing: 1,
      head: 'cap',
      coat: 'long',
      pose: STANDING,
      rim: { side: 1, above: true, ramp: RIM },
    },
    FIGURE_RAMPS,
  );
  const tilt = walkerFrame === 1 ? 3 : 0;
  canvas.vline(WALKER.x, WALKER.y - 92, 84, at(STONE, 1));
  canvas.ellipse(WALKER.x - 16, WALKER.y - 94 + tilt, 36, 16, at(PERSON, 3));
  canvas.hline(WALKER.x - 16, WALKER.y - 94 + tilt, 36, at(PERSON, 4));
  canvas.fill(CAT.x - 24, BASE - 30, 44, 30, at(CRATE, 2));
  canvas.hline(CAT.x - 24, BASE - 30, 44, at(CRATE, 1));
  drawCat(canvas, catFrame);
}

/** The cat on its crate: a pale shape, its tail flicking (`frame` 1). */
function drawCat(canvas: Canvas, frame: number): void {
  const x = CAT.x;
  const y = CAT.y - 30;
  canvas.ellipse(x - 9, y - 14, 18, 15, at(PAPER, 1));
  canvas.ellipse(x - 6, y - 23, 12, 10, at(PAPER, 2));
  canvas.line(x - 5, y - 27, x - 4, y - 32, at(PAPER, 1), 2);
  canvas.line(x + 1, y - 27, x + 2, y - 32, at(PAPER, 1), 2);
  canvas.set(x - 2, y - 21, at(STONE, 0));
  canvas.set(x + 2, y - 21, at(STONE, 0));
  const tail = frame === 1 ? 5 : 0;
  canvas.line(x + 8, y - 10, x + 15 + tail, y - 16 - tail, at(PAPER, 0), 2);
}

/** The steam over the manhole: wisps rising, `frame` 1 to 3, stronger with the frame. */
function drawSteam(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  for (let i = 0; i < 4; i++) {
    const x = MANHOLE.x - 12 + i * 8;
    const rise = 40 - frame * 8 + i * 4;
    const height = 26 + frame * 8 - i * 3;
    const sway = Math.round(Math.sin(i * 1.7 + frame) * 3);
    canvas.ellipse(
      x - 3 + sway,
      MANHOLE.y - 8 - height - rise,
      6 + frame * 2,
      height,
      at(STEAM, Math.min(3, frame)),
    );
  }
}

/** The cables and the strings of warm bulbs overhead. */
function drawCables(canvas: Canvas): void {
  for (const [from, to, sag, step] of [
    [{ x: 0, y: 90 }, { x: canvas.width, y: 104 }, 24, 150],
    [{ x: 0, y: 150 }, { x: canvas.width, y: 162 }, 18, 200],
  ] as const) {
    for (let x = from.x; x <= to.x; x++) {
      const t = (x - from.x) / (to.x - from.x);
      const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
      canvas.set(x, y, at(STONE, 2));
    }
    for (let x = 60; x < canvas.width; x += step) {
      const t = (x - from.x) / (to.x - from.x);
      const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
      canvas.vline(x, y, 4, at(STONE, 1));
      canvas.fill(x - 3, y + 4, 7, 6, at(NEON_ORANGE, 2));
      canvas.fill(x - 1, y + 5, 3, 3, at(NEON_ORANGE, 4));
    }
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'neon',
    rect: { x: SIGN.x - 60, y: SIGN.y - 30, width: 120, height: 48 },
    frames: 4,
    timeline: timelineOf(neonAt),
  },
  {
    name: 'steam',
    rect: { x: MANHOLE.x - 40, y: MANHOLE.y - 150, width: 80, height: 150 },
    frames: 4,
    timeline: timelineOf(steamAt),
  },
  {
    name: 'walker',
    rect: { x: WALKER.x - 22, y: WALKER.y - 100, width: 44, height: 102 },
    frames: 2,
    timeline: timelineOf(walkerAt),
  },
  {
    name: 'cat',
    rect: { x: CAT.x - 16, y: CAT.y - 68, width: 40, height: 46 },
    frames: 2,
    timeline: timelineOf(catAt),
  },
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
  // The asphalt, its joints, the shade of the stalls, the light the neons lay.
  canvas.fill(0, BASE, width, height - BASE, at(STONE, 2));
  canvas.fill(0, BASE, width, 6, at(STONE, 1));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, height - BASE, at(STONE, 1));
  canvas.fill(LEFT.left, BASE, LEFT.right - LEFT.left, 5, at(SHADOW, 0));
  canvas.fill(MACHINES.left, BASE, MACHINES.right - MACHINES.left, 5, at(SHADOW, 0));
  for (const [x, ramp] of [
    [300, LIGHT_POOL],
    [640, LIGHT_POOL],
    [1180, GREEN_POOL],
  ] as const) {
    canvas.ellipse(x - 64, BASE + 2, 128, 22, at(ramp, 1));
    canvas.ellipse(x - 42, BASE + 6, 84, 16, at(ramp, 2));
  }
  drawStand(canvas);
  drawMachines(canvas, frameOf('neon'));
  drawStreet(canvas, frameOf('walker'), frameOf('cat'));
  drawSteam(canvas, frameOf('steam'));
  drawCables(canvas);
  canvas.fill(0, GROUND, width, height - GROUND, at(STONE, 0));
  return canvas;
}
