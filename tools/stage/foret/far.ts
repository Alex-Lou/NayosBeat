/**
 * The far layer (docs/art/decor-forest-dance.md §2.1): the back of the forest at dawn, with real
 * depth. The sky from a cold blue-grey overhead to the warm glow behind the trees; a veil of haze
 * between each plane, so the farthest trees recede and nothing looks pasted on; the trees grow
 * denser and darker as they come near. Opaque everywhere. Flat tones where the fighters stand
 * (docs/art/proprete.md); the sky's gradient and the haze's edges are the only dither. Image
 * pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CLOUD, HAZE, SKY, SUNGLOW, TREE_FAR, TREE_MID, TREE_NEAR } from './palette.ts';

/** The horizon's row: the trees from here down. */
export const HORIZON = 300;
const SEED = 151;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / HORIZON, 0), 1);
  return (SKY.length - 1) * t ** 1.25;
}

/** A low cloud, a long flat band, its underside lit. */
function drawCloud(canvas: Canvas, x: number, y: number, width: number, height: number): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const edge = Math.hypot((px - x) / width - 0.5, (py - y) / height - 0.5);
    if (edge > 0.5) return undefined;
    return at(CLOUD, py > y + height - 2 ? 2 : 1);
  });
}

/**
 * A tree of a plane, with volume: its trunk, its crown of layered masses, a lit side and a dark
 * side, and a rim of the dawn where the crown breaks the sky. The farthest planes are simpler and
 * closer to the haze.
 */
function drawTree(
  canvas: Canvas,
  trunk: readonly number[],
  crown: readonly number[],
  crownLit: readonly number[],
  x: number,
  trunkTop: number,
  trunkWidth: number,
  crownWidth: number,
  height: number,
  detail: boolean,
): void {
  // The trunk, its shadow side and its lit edge.
  canvas.fill(x, trunkTop, trunkWidth, height, at(trunk, 0));
  if (trunkWidth > 3) {
    canvas.vline(x, trunkTop, height, at(trunk, 1));
    canvas.vline(x + trunkWidth - 1, trunkTop, height, at(trunk, 2));
  }
  // The crown: five masses, the lit ones toward the dawn, gaps between them.
  const cy = trunkTop - crownWidth * 0.3;
  const masses = [
    { dx: -crownWidth * 0.42, dy: 0, w: crownWidth * 0.52, lit: false },
    { dx: -crownWidth * 0.1, dy: -crownWidth * 0.18, w: crownWidth * 0.58, lit: true },
    { dx: crownWidth * 0.28, dy: -crownWidth * 0.08, w: crownWidth * 0.48, lit: false },
    { dx: crownWidth * 0.02, dy: -crownWidth * 0.4, w: crownWidth * 0.5, lit: true },
    { dx: crownWidth * 0.44, dy: -crownWidth * 0.32, w: crownWidth * 0.4, lit: false },
  ] as const;
  for (const mass of masses) {
    const cx = x + trunkWidth / 2 + mass.dx;
    const top = cy + mass.dy;
    canvas.ellipse(cx - mass.w / 2, top, mass.w, mass.w * 0.72, at(crown, mass.lit ? 1 : 0));
    // The lit masses catch the dawn: a warm rim along their upper edge, and darker folds inside.
    if (mass.lit) {
      canvas.ellipse(
        cx - mass.w * 0.3,
        top + mass.w * 0.06,
        mass.w * 0.5,
        mass.w * 0.36,
        at(crownLit, 0),
      );
    } else if (detail) {
      canvas.ellipse(
        cx - mass.w * 0.34,
        top + mass.w * 0.1,
        mass.w * 0.44,
        mass.w * 0.3,
        at(crown, 0),
      );
    }
  }
}

/** A plane of trees: their positions and heights from the seed, the same every run. */
function drawPlane(
  canvas: Canvas,
  trunk: readonly number[],
  crown: readonly number[],
  crownLit: readonly number[],
  seed: number,
  baseHeight: number,
  spacing: number,
  detail: boolean,
): void {
  for (let x = -24; x < canvas.width + 24; x += spacing) {
    const tall = noise(seed, x, 0, baseHeight * 0.5);
    const trunkTop = Math.round(HORIZON - baseHeight * 0.55 - tall);
    const trunkWidth = 5 + Math.round(noise(seed + 1, x, 0, 5));
    const crownWidth = 44 + Math.round(noise(seed + 2, x, 0, 30));
    drawTree(
      canvas,
      trunk,
      crown,
      crownLit,
      x,
      trunkTop,
      trunkWidth,
      crownWidth,
      canvas.height - trunkTop,
      detail,
    );
  }
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, HORIZON, (x, y) => tone(SKY, skyLevel(y), x, y));
  // The dawn's glow behind the trees, and the clouds.
  canvas.fill(0, HORIZON - 46, width, 30, at(SUNGLOW, 0));
  canvas.fill(0, HORIZON - 20, width, 12, at(SUNGLOW, 1));
  canvas.hline(0, HORIZON - 8, width, at(SUNGLOW, 2));
  drawCloud(canvas, 160, 90, 320, 9);
  drawCloud(canvas, 700, 140, 260, 8);
  drawCloud(canvas, 980, 60, 180, 7);
  // The forest floor, dark.
  canvas.fill(0, HORIZON, width, height - HORIZON, at(TREE_FAR, 0));
  // The farthest plane: pale, half drowned in the haze.
  drawPlane(canvas, TREE_FAR, TREE_FAR, TREE_MID, SEED, 130, 64, false);
  // A veil of haze over the far plane's base, so the nearer planes stand away from it.
  canvas.fill(0, HORIZON - 52, width, 26, at(HAZE, 0));
  canvas.fill(0, HORIZON - 38, width, 12, at(HAZE, 1));
  canvas.hline(0, HORIZON - 30, width, at(HAZE, 2));
  // The middle and the near planes, denser and darker.
  drawPlane(canvas, TREE_MID, TREE_MID, TREE_NEAR, SEED + 30, 104, 88, true);
  drawPlane(canvas, TREE_NEAR, TREE_NEAR, TREE_NEAR, SEED + 60, 76, 116, true);
  return canvas;
}
