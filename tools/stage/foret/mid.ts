/**
 * The middle layer (docs/art/decor-forest-dance.md §2.2): the clearing. Two great trees, left and
 * right, their trunks and their dancing crowns; the open middle with its stump, its bird and its
 * dead leaves; the leaves that fall, and the gust that sweeps them (the moment). Flat tones, simple
 * masses where the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the gust sweeps at GUST_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import {
  BARK,
  BIRD,
  DEAD_LEAF,
  EARTH,
  LEAF,
  LEAF_LIT,
  LIGHT_POOL,
  MOSS,
  SHADOW,
  STONE,
} from './palette.ts';

/** Row where the trees' roots rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the gust at GUST_AT. */
export const CYCLE = 2400;
export const GUST_AT = 1200;

const LEFT_TREE = { x: 96, top: 96, crown: 150 } as const;
const RIGHT_TREE = { x: 1344, top: 86, crown: 170 } as const;
const STUMP = { x: 720, y: 424 } as const;

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

/** The crowns' dance: a slow sway, stronger as the gust sweeps (GUST_AT). */
function canopyAt(step: number, phase: number): number {
  const into = (((step - GUST_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 120) return (Math.floor(step / 30) % 2) + 1;
  return Math.floor((step + phase) / 60) % 2;
}

/** The falling leaves: a slow tumble, three moments. */
function leavesAt(step: number): number {
  const into = step % 150;
  return into < 30 ? 0 : into < 60 ? 1 : into < 110 ? 2 : 0;
}

/** The bird: a hop now and then. */
function birdAt(step: number): number {
  return step % 360 < 60 ? 1 : 0;
}

/** A great tree: its trunk, its roots, its crown of leaf masses, swayed by `sway` (−1, 0, 1). */
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
  // The crown: four masses of leaves, the lit tips on their edges.
  const masses = [
    { dx: -crown * 0.5, dy: 0, w: crown * 0.75 },
    { dx: crown * 0.15, dy: -crown * 0.18, w: crown * 0.7 },
    { dx: -crown * 0.1, dy: -crown * 0.42, w: crown * 0.62 },
    { dx: crown * 0.4, dy: -crown * 0.35, w: crown * 0.55 },
  ] as const;
  for (const [index, mass] of masses.entries()) {
    const cx = x + mass.dx + sway * (3 + index);
    const cy = top + mass.dy;
    canvas.ellipse(cx - mass.w / 2, cy, mass.w, mass.w * 0.8, at(LEAF, 2 + (index % 2)));
    canvas.ellipse(cx - mass.w / 4, cy + mass.w * 0.1, mass.w * 0.5, mass.w * 0.4, at(LEAF, 1));
    for (let tip = 0; tip < 5; tip++) {
      const tx = cx - mass.w * 0.35 + tip * mass.w * 0.2 + (tip % 2) * 3;
      const ty = cy + 4 + (tip % 3) * 5;
      canvas.fill(tx, ty, 3, 2, at(LEAF_LIT, tip % 2));
    }
  }
}

/** The stump: a cut trunk with its rings, the bird hopping on it (`frame`). */
function drawStump(canvas: Canvas, frame: number): void {
  const { x, y } = STUMP;
  canvas.fill(x - 16, y - 22, 32, 22, at(BARK, 1));
  canvas.hline(x - 16, y - 22, 32, at(BARK, 3));
  canvas.ellipse(x - 14, y - 30, 28, 14, at(BARK, 2));
  canvas.ellipse(x - 10, y - 29, 20, 10, at(BARK, 3));
  canvas.ellipse(x - 6, y - 28, 12, 6, at(DEAD_LEAF, 1));
  // The bird: a small round body, a beak, hopping on the stump.
  const hop = frame === 1 ? -5 : 0;
  canvas.ellipse(x - 8, y - 42 + hop, 14, 11, at(BIRD, 1));
  canvas.ellipse(x - 13, y - 46 + hop, 9, 9, at(BIRD, 2));
  canvas.fill(x - 20, y - 44 + hop, 4, 2, at(BIRD, 0));
  canvas.vline(x - 2, y - 34 + hop, 6, at(BIRD, 0));
  canvas.fill(x - 4, y - 28 + hop, 5, 2, at(BIRD, 0));
}

/** A leaf, tumbling at one of its moments: `frame` 0 high, 1 mid, 2 low. */
function drawLeaf(
  canvas: Canvas,
  x: number,
  y: number,
  frame: number,
  ramp: readonly number[],
): void {
  const drop = frame * 26;
  const tilt = (frame + ((x / 7) | 0)) % 2;
  canvas.fill(x - 2, y + drop, 4, 4, at(ramp, tilt === 0 ? 1 : 2));
  canvas.set(x - 2, y + drop, at(ramp, 2));
  canvas.set(x + 1, y + 1 + drop, at(ramp, 0));
}

/** The leaves that fall, and the litter under the trees. */
function drawLeaves(canvas: Canvas, frame: number): void {
  for (const [x, y, ramp] of [
    [520, 150, LEAF],
    [640, 190, DEAD_LEAF],
    [880, 130, LEAF],
    [1000, 210, DEAD_LEAF],
    [1120, 160, LEAF],
  ] as const) {
    drawLeaf(canvas, x, y, frame, ramp);
  }
  // The litter: scattered dead leaves on the path.
  for (const [x, y] of [
    [400, BASE - 6],
    [470, BASE - 10],
    [600, BASE - 4],
    [820, BASE - 8],
    [930, BASE - 5],
    [1060, BASE - 9],
  ] as const) {
    canvas.fill(x, y, 5, 3, at(DEAD_LEAF, (x + y) % 2 === 0 ? 1 : 2));
    canvas.set(x, y, at(DEAD_LEAF, 0));
  }
}

/** The gust: a sweep of leaves across the clearing, drawn at `x` (index.ts glides it). */
export function drawGust(canvas: Canvas, x: number): void {
  for (let row = 0; row < 9; row++) {
    const y = 120 + row * 34;
    for (let leaf = 0; leaf < 4; leaf++) {
      const lx = x + leaf * 42 + (row % 2) * 18;
      const ly = y + ((row * 7 + leaf * 11) % 26);
      canvas.fill(lx - 2, ly, 4, 4, at(DEAD_LEAF, (row + leaf) % 2 === 0 ? 2 : 1));
      canvas.set(lx + 1, ly + 2, at(LEAF, 1));
    }
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'canopy0',
    rect: { x: 0, y: 0, width: 320, height: 250 },
    frames: 3,
    timeline: timelineOf((step) => canopyAt(step, 0)),
  },
  {
    name: 'canopy1',
    rect: { x: 1120, y: 0, width: 320, height: 260 },
    frames: 3,
    timeline: timelineOf((step) => canopyAt(step, 60)),
  },
  {
    name: 'leaves',
    rect: { x: 480, y: 110, width: 680, height: 140 },
    frames: 3,
    timeline: timelineOf(leavesAt),
  },
  {
    name: 'bird',
    rect: { x: STUMP.x - 26, y: STUMP.y - 56, width: 52, height: 36 },
    frames: 2,
    timeline: timelineOf(birdAt),
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
  // The earth of the clearing, the moss, the shade and the light the dawn lays.
  canvas.fill(0, BASE, width, height - BASE, at(EARTH, 2));
  canvas.fill(0, BASE, width, 6, at(EARTH, 1));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, height - BASE, at(EARTH, 1));
  canvas.fill(0, BASE - 8, width, 8, at(MOSS, 0));
  for (const x of [300, 640, 980, 1180]) {
    canvas.ellipse(x - 56, BASE + 2, 112, 20, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 32, BASE + 6, 64, 12, at(LIGHT_POOL, 2));
  }
  canvas.fill(LEFT_TREE.x - 60, BASE, 120, 4, at(SHADOW, 0));
  canvas.fill(RIGHT_TREE.x - 60, BASE, 120, 4, at(SHADOW, 0));
  drawTree(canvas, LEFT_TREE, (frameOf('canopy0') - 1) * 2);
  drawTree(canvas, RIGHT_TREE, (frameOf('canopy1') - 1) * 2);
  drawStump(canvas, frameOf('bird'));
  drawLeaves(canvas, frameOf('leaves'));
  // The stones at the edges.
  for (const [x, y, w, h] of [
    [180, BASE - 10, 18, 10],
    [1250, BASE - 12, 22, 12],
  ] as const) {
    canvas.ellipse(x, y, w, h, at(STONE, 1));
    canvas.hline(x, y - h * 0.3, w, at(STONE, 2));
  }
  canvas.fill(0, GROUND, width, height - GROUND, at(EARTH, 0));
  return canvas;
}
