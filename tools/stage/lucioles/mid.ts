/**
 * The middle layer (docs/art/decor-firefly-forest.md §2.2): the enchanted clearing. Two great
 * trees, left and right, their twisted branches and their vines; the open middle with its still
 * pond, its fireflies and its glowing mushrooms. Flat tones, simple masses where the fighters
 * stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the swarm sweeps at SWARM_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import {
  BARK,
  EARTH,
  FIREFLY,
  LEAF,
  LEAF_LIT,
  LIGHT_POOL,
  MOSS,
  POND,
  SHADOW,
  SHROOM,
  STONE,
} from './palette.ts';

/** Row where the roots rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the swarm at SWARM_AT. */
export const CYCLE = 2400;
export const SWARM_AT = 1200;

const LEFT_TREE = { x: 96, top: 88, crown: 150 } as const;
const RIGHT_TREE = { x: 1344, top: 78, crown: 170 } as const;
const POND_AT = { x: 720, y: 428, width: 220, height: 30 } as const;

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

/** The fireflies' drift: four moments, each held 20 steps at least. */
function firefliesAt(step: number): number {
  return Math.floor(step / 40) % 4;
}

/** The mushrooms' glow: a slow breath, each state held 20 steps at least. */
function glowAt(step: number): number {
  return Math.floor(step / 50) % 3;
}

/** The vines' sway: one way, then the other, slowly. */
function vinesAt(step: number): number {
  return Math.floor(step / 90) % 2;
}

/** A great tree: its trunk, its roots, its crown, its twisted branches; `sway` moves the vines. */
function drawTree(
  canvas: Canvas,
  tree: { x: number; top: number; crown: number },
  sway: number,
): void {
  const { x, top, crown } = tree;
  canvas.fill(x - 14, top + crown * 0.5, 28, BASE - top - crown * 0.5, at(BARK, 1));
  canvas.vline(x - 12, top + crown * 0.5, BASE - top - crown * 0.5, at(BARK, 3));
  for (const [dx, , len] of [
    [-40, 2, 60],
    [34, 6, 66],
    [-18, 12, 44],
  ] as const) {
    canvas.line(x + dx, BASE - 2, x + dx + len, BASE - 2 - 8, at(BARK, 0), 6);
  }
  // The crown, and its twisted branches reaching out.
  const masses = [
    { dx: -crown * 0.5, dy: 0, w: crown * 0.75 },
    { dx: crown * 0.15, dy: -crown * 0.18, w: crown * 0.7 },
    { dx: -crown * 0.1, dy: -crown * 0.42, w: crown * 0.62 },
    { dx: crown * 0.4, dy: -crown * 0.35, w: crown * 0.55 },
  ] as const;
  for (const [index, mass] of masses.entries()) {
    const cx = x + mass.dx;
    const cy = top + mass.dy;
    canvas.ellipse(cx - mass.w / 2, cy, mass.w, mass.w * 0.8, at(LEAF, 2 - (index % 2)));
    canvas.ellipse(cx - mass.w / 4, cy + mass.w * 0.1, mass.w * 0.5, mass.w * 0.4, at(LEAF, 1));
    for (let tip = 0; tip < 3; tip++) {
      canvas.fill(cx - mass.w * 0.3 + tip * mass.w * 0.25, cy + 6, 3, 2, at(LEAF_LIT, tip % 2));
    }
  }
  // A twisted branch, and the vines hanging from it.
  canvas.line(x, top + crown * 0.3, x + crown * 0.7, top + crown * 0.45, at(BARK, 1), 5);
  canvas.line(x, top + crown * 0.3, x + crown * 0.7, top + crown * 0.45, at(BARK, 2), 2);
  for (const [dx, len] of [
    [crown * 0.1, 60],
    [crown * 0.28, 46],
    [crown * 0.45, 70],
  ] as const) {
    const vx = x + dx;
    const vy = top + crown * 0.42;
    canvas.vline(vx + sway, vy, len, at(BARK, 1));
    canvas.set(vx + sway, vy + len - 2, at(LEAF_LIT, 0));
  }
}

/** The pond, still, with the moon's glints; the fireflies drifting over it (`frame`). */
function drawPond(canvas: Canvas, frame: number): void {
  const { x, y, width, height } = POND_AT;
  canvas.ellipse(x, y, width, height, at(POND, 1));
  canvas.ellipse(x + 6, y + 3, width - 12, Math.max(4, height - 6), at(POND, 2));
  for (let dash = 0; dash < 4; dash++) {
    canvas.hline(
      x - width * 0.25 + dash * 30,
      y + 4 + (dash % 2) * 4,
      12 + (dash % 2) * 8,
      at(POND, 2),
    );
  }
  // The fireflies: a drift of small lights over the water.
  for (const [fx, fy, phase] of [
    [x - 80, y - 12, 0],
    [x - 30, y - 22, 2],
    [x + 30, y - 16, 1],
    [x + 80, y - 10, 3],
  ] as const) {
    const rise = (frame + phase) % 4;
    const lx = fx + ((rise * 7) % 16) - 8;
    const ly = fy - rise * 5;
    canvas.set(lx, ly, at(FIREFLY, 3));
    canvas.set(lx - 1, ly - 1, at(FIREFLY, 1));
  }
}

/** The glowing mushrooms at the trees' feet, their halos breathing (`frame`). */
function drawMushrooms(canvas: Canvas, frame: number): void {
  const glow = [0, 1, 2][frame] ?? 0;
  for (const x of [200, 1260] as const) {
    const y = BASE - 6;
    if (glow > 0) canvas.ellipse(x - 12, y - 26, 34, 20, at(SHROOM, 1));
    if (glow > 1) canvas.ellipse(x - 8, y - 22, 24, 14, at(SHROOM, 2));
    canvas.fill(x - 4, y - 10, 4, 10, at(BARK, 1));
    canvas.ellipse(x - 9, y - 16, 14, 8, at(SHROOM, 2));
    canvas.hline(x - 9, y - 16, 14, at(SHROOM, 4));
    canvas.fill(x + 7, y - 8, 3, 8, at(BARK, 1));
    canvas.ellipse(x + 3, y - 13, 11, 6, at(SHROOM, 1));
  }
}

/** The swarm: a band of fireflies crossing the clearing, drawn at `x` (index.ts glides it). */
export function drawSwarm(canvas: Canvas, x: number): void {
  for (let row = 0; row < 7; row++) {
    const y = 150 + row * 36;
    for (let firefly = 0; firefly < 3; firefly++) {
      const fx = x + firefly * 46 + (row % 2) * 20;
      const fy = y + ((row * 11 + firefly * 17) % 26);
      canvas.set(fx, fy, at(FIREFLY, 3));
      canvas.set(fx + 2, fy + 2, at(FIREFLY, 1));
    }
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'fireflies',
    rect: { x: POND_AT.x - 130, y: POND_AT.y - 70, width: 260, height: 80 },
    frames: 4,
    timeline: timelineOf(firefliesAt),
  },
  {
    name: 'glow',
    rect: { x: 180, y: BASE - 40, width: 60, height: 40 },
    frames: 3,
    timeline: timelineOf(glowAt),
  },
  {
    name: 'glow1',
    rect: { x: 1240, y: BASE - 40, width: 60, height: 40 },
    frames: 3,
    timeline: timelineOf((step) => glowAt(step + 50)),
  },
  {
    name: 'vines',
    rect: { x: LEFT_TREE.x - 10, y: LEFT_TREE.top + 40, width: 200, height: 90 },
    frames: 2,
    timeline: timelineOf(vinesAt),
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
  // The earth of the clearing, the moss, the shade and the moon's light.
  canvas.fill(0, BASE, width, height - BASE, at(EARTH, 2));
  canvas.fill(0, BASE, width, 6, at(EARTH, 1));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, height - BASE, at(EARTH, 1));
  canvas.fill(0, BASE - 8, width, 8, at(MOSS, 0));
  for (const x of [300, 640, 980, 1180]) {
    canvas.ellipse(x - 50, BASE + 2, 100, 18, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 28, BASE + 6, 56, 10, at(LIGHT_POOL, 2));
  }
  canvas.fill(LEFT_TREE.x - 60, BASE, 120, 4, at(SHADOW, 0));
  canvas.fill(RIGHT_TREE.x - 60, BASE, 120, 4, at(SHADOW, 0));
  drawTree(canvas, LEFT_TREE, frameOf('vines') === 1 ? 1 : 0);
  drawTree(canvas, RIGHT_TREE, 0);
  drawPond(canvas, frameOf('fireflies'));
  drawMushrooms(canvas, frameOf('glow'));
  // The second mushrooms' glow, drawn from its own frame.
  const glow1 = frameOf('glow1');
  if (glow1 > 0) canvas.ellipse(1252, BASE - 32, 34, 20, at(SHROOM, 1));
  if (glow1 > 1) canvas.ellipse(1256, BASE - 28, 24, 14, at(SHROOM, 2));
  // The stones at the edges.
  for (const [x, y, w, h] of [
    [160, BASE - 10, 18, 10],
    [1300, BASE - 12, 22, 12],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
  canvas.fill(0, GROUND, width, height - GROUND, at(EARTH, 0));
  return canvas;
}
