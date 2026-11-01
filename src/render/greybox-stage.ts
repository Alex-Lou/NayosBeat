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

/** Its large colors, the sky and the ground: what a veil over it must not change too much. */
export const GREYBOX_COLORS: readonly number[] = [COLORS.background, COLORS.ground];

/**
 * The look a stage drawn by hand starts from (tools/sprites/stage-drawn.ts): the sky, the ground
 * and its first marks, dots. The grey box itself now measures its floor (`FLOOR`); the drawn
 * stage's start is left as it was until the Warehouse is drawn (phase 6).
 */
export const GREYBOX = {
  colors: COLORS,
  groundHeight: GROUND_HEIGHT,
  markSpacing: GROUND_MARK_SPACING,
  markSize: GROUND_MARK_SIZE,
} as const;

/**
 * What the floor measures (docs/polish/AUDIT-ET-PLAN.md P9), in world pixels: a light horizon on
 * the ground line (2.61:1 on the sky, where the ground alone gave 1.56:1); hanging from it, a
 * short tick every 16 px (about a third of a Direct's reach) and a long one every 64 (about where
 * close range ends), 2.13:1 on the ground.
 */
export const FLOOR = {
  horizon: 0x5a5a88,
  tick: 0x6a6a9a,
  minor: { every: 16, width: 1, height: 4 },
  major: { every: 64, width: 2, height: 6 },
} as const;

/**
 * The stage's ends, where the fighters are cornered: a wall 6 px wide, its edge light on the
 * stage's side, and the floor darkening toward it, from nothing 24 px away to 25 % black at its
 * foot.
 */
export const WALL = {
  width: 6,
  color: 0x4a4870,
  edge: 0x8888aa,
  shade: { width: 24, darkest: 0.25 },
} as const;

/** What the grey box draws besides its sky, its ground, its marks and its walls. */
export interface GreyboxLook {
  /** The 1 px screen border, to spot scaling artifacts: in the debug view only (`?debug`). */
  readonly debug: boolean;
}

/**
 * The static grey-box stage, `stageWidth` world pixels wide (until the stages of phase 6): drawn
 * once, never redrawn, never flashing.
 */
export function drawGreyboxStage(scene: Phaser.Scene, stageWidth: number, look: GreyboxLook): void {
  scene.cameras.main.setBackgroundColor(COLORS.background);

  const stage = scene.add.graphics();
  stage.fillStyle(COLORS.ground);
  stage.fillRect(0, GROUND_Y, stageWidth, GROUND_HEIGHT);
  drawFloorMarks(stage, stageWidth);
  drawWalls(stage, stageWidth);

  if (look.debug) {
    const border = scene.add.graphics().setScrollFactor(0).setDepth(1);
    border.lineStyle(1, COLORS.border);
    border.strokeRect(0.5, 0.5, VIEW_SIZE.width - 1, VIEW_SIZE.height - 1);
  }
}

/** The horizon on the ground line, and the ticks hanging from it every 16 and 64 px. */
function drawFloorMarks(stage: Phaser.GameObjects.Graphics, stageWidth: number): void {
  stage.fillStyle(FLOOR.horizon);
  stage.fillRect(0, GROUND_Y, stageWidth, 1);
  stage.fillStyle(FLOOR.tick);
  for (let x = 0; x < stageWidth; x += FLOOR.minor.every) {
    const { width, height } = x % FLOOR.major.every === 0 ? FLOOR.major : FLOOR.minor;
    stage.fillRect(x, GROUND_Y + 1, width, height);
  }
}

/** A wall at each end, and the floor darkening at its foot. */
function drawWalls(stage: Phaser.GameObjects.Graphics, stageWidth: number): void {
  const { width, shade } = WALL;
  for (let i = 0; i < shade.width; i++) {
    stage.fillStyle(0x000000, (shade.darkest * (shade.width - i)) / shade.width);
    stage.fillRect(i, GROUND_Y, 1, GROUND_HEIGHT);
    stage.fillRect(stageWidth - 1 - i, GROUND_Y, 1, GROUND_HEIGHT);
  }
  stage.fillStyle(WALL.color);
  stage.fillRect(0, 0, width - 1, GROUND_Y);
  stage.fillRect(stageWidth - width + 1, 0, width - 1, GROUND_Y);
  stage.fillStyle(WALL.edge);
  stage.fillRect(width - 1, 0, 1, GROUND_Y);
  stage.fillRect(stageWidth - width, 0, 1, GROUND_Y);
}
