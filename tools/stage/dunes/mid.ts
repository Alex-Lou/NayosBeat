/**
 * The middle layer (docs/art/decor-dune-dusk.md §2.2): the dune. The crests left and right with
 * their shadows, the open plain with its dead tree, its tufts and its beetle; the sand that
 * streams over the crests, and the gust that sweeps the plain (the moment). Flat tones, simple
 * masses where the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the gust sweeps at GUST_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import { BEETLE, DEAD_TREE, GRASS, LIGHT_POOL, SAND, SAND_WET, SHADOW, STONE } from './palette.ts';

/** Row where the crests rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the gust at GUST_AT. */
export const CYCLE = 2400;
export const GUST_AT = 1200;

const TREE = { x: 560, y: BASE - 4 } as const;
const BEETLE_AT = { x: 880, y: BASE - 6 } as const;

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

/** The streams on the crests: three moments, faster as the gust sweeps. */
function sandAt(step: number, phase: number): number {
  const into = (((step - GUST_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 90) return 2;
  return Math.floor((step + phase) / 40) % 3;
}

/** The beetle: it walks a little, then stops. */
function beetleAt(step: number): number {
  return step % 480 < 120 ? Math.floor(step / 20) % 3 : 0;
}

/** A dune crest at `left` to `right`: the sand rising, its lit crest, its shadow side. */
function drawCrest(canvas: Canvas, left: number, right: number, high: number): void {
  canvas.paint(left, 0, right - left, BASE + 2, (x, y) => {
    const t = (x - left) / (right - left);
    const swell = Math.round(Math.sin(t * Math.PI) * high);
    const top = BASE - high + swell;
    if (y < top) return undefined;
    const lit = y === top || y === top + 1;
    return at(SAND, lit ? 3 : y < top + 3 ? 2 : 1);
  });
}

/** The sand streams on the crests: short dashes of lighter sand (`frame` 0 still, 1 and 2 wind). */
function drawStreams(canvas: Canvas, x: number, y: number, frame: number): void {
  if (frame === 0) return;
  for (let dash = 0; dash < 5; dash++) {
    const dx = dash * 14 + (frame === 2 ? 6 : 0);
    canvas.hline(x + dx, y + 4 + (dash % 2) * 3, 8 + frame * 3, at(SAND, 3));
  }
}

/** The dead tree: a bare trunk, two bare branches. */
function drawTree(canvas: Canvas): void {
  const { x, y } = TREE;
  canvas.fill(x - 6, y - 96, 12, 96, at(DEAD_TREE, 1));
  canvas.vline(x - 5, y - 96, 96, at(DEAD_TREE, 2));
  canvas.line(x - 4, y - 80, x - 40, y - 112, at(DEAD_TREE, 1), 5);
  canvas.line(x + 2, y - 88, x + 34, y - 116, at(DEAD_TREE, 1), 4);
  canvas.line(x + 30, y - 112, x + 48, y - 104, at(DEAD_TREE, 0), 3);
  canvas.ellipse(x - 12, y, 44, 10, at(SHADOW, 0));
}

/** The dry grass tufts, and the stones. */
function drawTufts(canvas: Canvas): void {
  for (const [x, y] of [
    [420, BASE - 2],
    [700, BASE - 4],
    [1000, BASE - 2],
    [1240, BASE - 4],
  ] as const) {
    canvas.vline(x, y - 10, 10, at(GRASS, 0));
    canvas.vline(x - 4, y - 8, 8, at(GRASS, 1));
    canvas.vline(x + 4, y - 7, 7, at(GRASS, 0));
  }
  for (const [x, y, w, h] of [
    [180, BASE - 8, 16, 9],
    [1260, BASE - 10, 20, 11],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
}

/** The beetle, walking (`frame` its steps). */
function drawBeetle(canvas: Canvas, frame: number): void {
  const { x, y } = BEETLE_AT;
  const step = frame;
  canvas.ellipse(x - 4, y - 5, 12, 8, at(BEETLE, 2));
  canvas.ellipse(x - 8, y - 7, 7, 6, at(BEETLE, 1));
  canvas.set(x + 3, y - 8, at(BEETLE, 0));
  for (const [dx, dy] of [
    [-5, 0],
    [-1, 1],
    [3, 1],
    [-3, -1],
    [1, -1],
    [5, 0],
  ] as const) {
    canvas.vline(x + dx, y + dy + (step % 2 === 0 ? 2 : 0), 2, at(BEETLE, 0));
  }
}

/** The gust: a sweep of sand across the plain, drawn at `x` (index.ts glides it). */
export function drawGust(canvas: Canvas, x: number): void {
  for (let row = 0; row < 8; row++) {
    const y = 140 + row * 36;
    for (let dash = 0; dash < 4; dash++) {
      const dx = x + dash * 44 + (row % 2) * 20;
      const dy = y + ((row * 9 + dash * 13) % 24);
      canvas.hline(dx, dy, 20 + (dash % 2) * 12, at(SAND, 3));
      canvas.hline(dx + 4, dy + 3, 10, at(SAND, 2));
    }
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'sand0',
    rect: { x: 0, y: 300, width: 320, height: 134 },
    frames: 3,
    timeline: timelineOf((step) => sandAt(step, 0)),
  },
  {
    name: 'sand1',
    rect: { x: 1120, y: 296, width: 320, height: 138 },
    frames: 3,
    timeline: timelineOf((step) => sandAt(step, 40)),
  },
  {
    name: 'beetle',
    rect: { x: BEETLE_AT.x - 18, y: BEETLE_AT.y - 14, width: 40, height: 18 },
    frames: 3,
    timeline: timelineOf(beetleAt),
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
  // The plain, the light the dusk lays, the shade of the crests.
  canvas.fill(0, BASE, width, height - BASE, at(SAND, 2));
  canvas.fill(0, BASE, width, 6, at(SAND, 1));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, height - BASE, at(SAND, 1));
  for (const x of [300, 640, 980, 1180]) {
    canvas.ellipse(x - 56, BASE + 2, 112, 20, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 32, BASE + 6, 64, 12, at(LIGHT_POOL, 2));
  }
  // The wet band where the rare rain fell.
  canvas.ellipse(720, BASE + 10, 300, 8, at(SAND_WET, 0));
  drawCrest(canvas, -20, 330, 96);
  drawCrest(canvas, 1110, 1460, 104);
  canvas.fill(0, BASE, 330, 5, at(SHADOW, 0));
  canvas.fill(1110, BASE, 330, 5, at(SHADOW, 0));
  drawStreams(canvas, 60, 320, frameOf('sand0'));
  drawStreams(canvas, 1180, 316, frameOf('sand1'));
  drawTree(canvas);
  drawTufts(canvas);
  drawBeetle(canvas, frameOf('beetle'));
  canvas.fill(0, GROUND, width, height - GROUND, at(SAND, 0));
  return canvas;
}
