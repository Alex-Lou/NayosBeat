/**
 * The far layer (docs/art/decor-firefly-forest.md §2.1): the back of the enchanted forest. The
 * night sky from a deep indigo to a pale green glow behind the trees, the moon through the
 * branches, and three planes of trees, the farthest pale. Opaque everywhere. Flat tones
 * (docs/art/proprete.md): the sky's gradient is the only dither. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, MOON, SKY, TREE_FAR, TREE_MID, TREE_NEAR } from './palette.ts';

/** The horizon's row: the trees from here down. */
export const HORIZON = 300;
const SEED = 233;
const MOON_AT = { x: 250, y: 92, radius: 17 } as const;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.25;
}

/** A low cloud, a long flat band. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/** A tree: its trunk rising from the ground, its crown a round mass. */
function drawTree(
  canvas: Canvas,
  ramp: readonly number[],
  x: number,
  trunkTop: number,
  trunkWidth: number,
  crownWidth: number,
): void {
  canvas.fill(x, trunkTop, trunkWidth, canvas.height - trunkTop, at(ramp, 0));
  canvas.ellipse(
    x - (crownWidth - trunkWidth) / 2,
    trunkTop - crownWidth * 0.55,
    crownWidth,
    crownWidth,
    at(ramp, 1),
  );
  canvas.ellipse(
    x - (crownWidth - trunkWidth) / 2 + crownWidth * 0.15,
    trunkTop - crownWidth * 0.55 + crownWidth * 0.15,
    crownWidth * 0.7,
    crownWidth * 0.7,
    at(ramp, 2),
  );
}

/** A plane of trees: their positions and heights from the seed, the same every run. */
function drawPlane(
  canvas: Canvas,
  ramp: readonly number[],
  seed: number,
  baseHeight: number,
  spacing: number,
): void {
  for (let x = -20; x < canvas.width + 20; x += spacing) {
    const tall = noise(seed, x, 0, baseHeight * 0.5);
    const trunkTop = Math.round(HORIZON - baseHeight * 0.6 - tall);
    const trunkWidth = 6 + Math.round(noise(seed + 1, x, 0, 4));
    const crownWidth = 40 + Math.round(noise(seed + 2, x, 0, 26));
    drawTree(canvas, ramp, x, trunkTop, trunkWidth, crownWidth);
  }
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  // The pale glow behind the trees, and the moon through the branches.
  canvas.fill(0, HORIZON - 36, width, 26, at(TREE_FAR, 0));
  canvas.fill(0, HORIZON - 14, width, 8, at(TREE_FAR, 2));
  const { x: mx, y: my, radius } = MOON_AT;
  canvas.paint(mx - radius - 10, my - radius - 10, radius * 2 + 20, radius * 2 + 20, (x, y) => {
    const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
    if (d > radius + 8) return undefined;
    if (d > radius) return d < radius + 3 ? at(MOON, 0) : undefined;
    return at(MOON, d < radius - 6 ? 2 : 1);
  });
  drawCloud(canvas, 420, 80, 300, 9);
  drawCloud(canvas, 900, 130, 240, 8);
  canvas.fill(0, HORIZON, width, height - HORIZON, at(TREE_FAR, 0));
  drawPlane(canvas, TREE_FAR, SEED, 130, 66);
  drawPlane(canvas, TREE_MID, SEED + 30, 100, 90);
  drawPlane(canvas, TREE_NEAR, SEED + 60, 74, 120);
  return canvas;
}
