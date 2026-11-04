/**
 * The far layer (docs/art/decor-dojo.md §2.1): the back of the hall. The dark ceiling and its
 * beams, the wall of shōji screens softly lit, the tokonoma's alcove, the wainscot. Opaque
 * everywhere. Flat tones (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 */

import { Canvas, at } from '../kit/canvas.ts';
import { PAPER, PAPER_LIT, WALL, WOOD_DARK, WOOD_LIGHT } from './palette.ts';

/** The row where the wall meets the wainscot. */
export const WAINSCOT = 300;
const SCREENS = [80, 260, 440, 620, 800, 980, 1160] as const;
const SCREEN = { y: 96, width: 150, height: 150 } as const;
/** The tokonoma's alcove: where the scroll hangs (drawn by the middle layer). */
export const TOKONOMA = { x: 440, y: 96, width: 180, height: 150 } as const;

/** A shōji screen: its frame, its paper lit from within, its slats. */
function drawScreen(canvas: Canvas, x: number): void {
  const { y, width, height } = SCREEN;
  canvas.fill(x, y, width, height, at(PAPER, 1));
  canvas.hline(x, y, width, at(WOOD_LIGHT, 2));
  canvas.hline(x, y + height - 1, width, at(WOOD_LIGHT, 1));
  for (let slat = 0; slat < 3; slat++) {
    canvas.hline(x, y + 38 + slat * 42, width, at(WOOD_DARK, 2));
  }
  // The light within: a warmer heart.
  canvas.fill(x + 14, y + 14, width - 28, height - 28, at(PAPER, 2));
  canvas.ellipse(x + 40, y + 60, 80, 40, at(PAPER_LIT, 1));
}

/** The tokonoma's alcove, darker, its floor raised. */
function drawTokonoma(canvas: Canvas): void {
  const { x, y, width, height } = TOKONOMA;
  canvas.fill(x - 10, y - 10, width + 20, height + 10, at(WALL, 0));
  canvas.hline(x - 10, y - 10, width + 20, at(WOOD_DARK, 2));
  canvas.fill(x - 10, y + height - 6, width + 20, 6, at(WOOD_DARK, 2));
}

/** The far layer, `width` × `height` image pixels. */
export function drawFar(width: number, height: number): Canvas {
  const canvas = new Canvas(width, height);
  // The ceiling, and its beams.
  canvas.fill(0, 0, width, 92, at(WALL, 0));
  canvas.fill(0, 88, width, 8, at(WOOD_DARK, 2));
  for (let x = 60; x < width; x += 260) canvas.fill(x, 0, 10, 92, at(WOOD_DARK, 1));
  // The wall, its screens.
  canvas.fill(0, 92, width, WAINSCOT - 92, at(WALL, 1));
  for (const x of SCREENS) drawScreen(canvas, x);
  drawTokonoma(canvas);
  // The wainscot, dark wood.
  canvas.fill(0, WAINSCOT, width, height - WAINSCOT, at(WOOD_DARK, 1));
  canvas.hline(0, WAINSCOT, width, at(WOOD_DARK, 3));
  for (let x = 0; x < width; x += 96)
    canvas.vline(x, WAINSCOT + 4, height - WAINSCOT - 4, at(WOOD_DARK, 0));
  return canvas;
}
