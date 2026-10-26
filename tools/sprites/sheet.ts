import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { CELL_SIZE } from '../../src/art/types.ts';
import { drawNayo } from './nayo/look.ts';
import { NAYO_POSES } from './nayo/poses.ts';
import { PixelCanvas } from './raster.ts';
import { solve } from './skeleton.ts';

/** Draws one strip: one cell per pose, outlined as a whole. */
export function drawSheet(sheet: NayoSheet): PixelCanvas {
  const poses = NAYO_POSES[sheet];
  const frames = NAYO_SHEETS[sheet].frames;
  if (poses.length !== frames) {
    throw new Error(`${sheet}: ${poses.length} poses for a strip of ${frames} frames`);
  }
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  poses.forEach((pose, frame) => {
    drawNayo(canvas, solve(pose), frame * CELL_SIZE);
  });
  canvas.outline();
  return canvas;
}
