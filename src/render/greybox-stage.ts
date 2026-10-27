import type Phaser from 'phaser';
import { VIEW_SIZE } from './view';

const GROUND_HEIGHT = 40;
/** Screen row of the ground line, where the fighters' feet stand (world pixels). */
export const GROUND_Y = VIEW_SIZE.height - GROUND_HEIGHT;
const GROUND_MARK_SPACING = 32;
const GROUND_MARK_SIZE = 2;

const COLORS = {
  background: 0x1b1b2f,
  ground: 0x3a3a5c,
  groundMark: 0x50507a,
  border: 0x8888aa,
} as const;

/**
 * The static grey-box stage, `stageWidth` world pixels wide (until the stages of phase 6): drawn
 * once, never redrawn. The 1 px screen border makes scaling artifacts easy to spot.
 */
export function drawGreyboxStage(scene: Phaser.Scene, stageWidth: number): void {
  scene.cameras.main.setBackgroundColor(COLORS.background);

  const ground = scene.add.graphics();
  ground.fillStyle(COLORS.ground);
  ground.fillRect(0, GROUND_Y, stageWidth, GROUND_HEIGHT);
  ground.fillStyle(COLORS.groundMark);
  for (let x = 0; x <= stageWidth; x += GROUND_MARK_SPACING) {
    ground.fillRect(x, GROUND_Y + GROUND_MARK_SIZE, GROUND_MARK_SIZE, GROUND_MARK_SIZE);
  }

  const border = scene.add.graphics().setScrollFactor(0).setDepth(1);
  border.lineStyle(1, COLORS.border);
  border.strokeRect(0.5, 0.5, VIEW_SIZE.width - 1, VIEW_SIZE.height - 1);
}
