import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { CELL_SIZE } from '../../src/art/types.ts';
import { drawEffect, drawNayo } from './nayo/look.ts';
import { NAYO_POSES, NAYO_PROJECTILE } from './nayo/poses.ts';
import { PixelCanvas } from './raster.ts';
import { solve } from './skeleton.ts';

/**
 * Draws one strip, one cell per frame, outlined as a whole. The pixels hold palette slots:
 * the same strip is saved once per colorway, with that colorway's palette.
 */
export function drawSheet(sheet: NayoSheet): PixelCanvas {
  const frames = NAYO_SHEETS[sheet].frames;
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  if (sheet === 'projectile') {
    expectFrames(sheet, NAYO_PROJECTILE.length, frames);
    NAYO_PROJECTILE.forEach((effect, frame) => {
      drawEffect(canvas, effect, frame * CELL_SIZE);
    });
  } else {
    const poses = NAYO_POSES[sheet];
    expectFrames(sheet, poses.length, frames);
    poses.forEach((pose, frame) => {
      drawNayo(canvas, solve(pose), frame * CELL_SIZE);
    });
  }
  canvas.outline();
  return canvas;
}

function expectFrames(sheet: NayoSheet, drawn: number, frames: number): void {
  if (drawn !== frames) throw new Error(`${sheet}: ${drawn} frames drawn for a strip of ${frames}`);
}
