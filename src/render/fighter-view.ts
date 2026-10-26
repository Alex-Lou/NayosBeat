import type Phaser from 'phaser';
import type { FighterStats } from '../core/config';
import { SUBPIXELS_PER_PIXEL } from '../core/constants';
import { pushboxOf } from '../core/fighter';
import type { FighterState } from '../core/state';

const EYE_SIZE = 4;
const EYE_INSET = 3;
const EYE_COLOR = 0xffffff;

/** Grey-box display of a fighter: its pushbox plus an "eye" showing which way it faces. */
export class FighterView {
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly eye: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    color: number,
    private readonly groundY: number,
  ) {
    this.body = scene.add.rectangle(0, 0, 1, 1, color).setOrigin(0.5, 1);
    this.eye = scene.add.rectangle(0, 0, EYE_SIZE, EYE_SIZE, EYE_COLOR).setOrigin(0.5, 0);
  }

  update(fighter: FighterState, stats: FighterStats): void {
    const box = pushboxOf(fighter, stats);
    const width = box.width / SUBPIXELS_PER_PIXEL;
    const height = box.height / SUBPIXELS_PER_PIXEL;
    const x = fighter.x / SUBPIXELS_PER_PIXEL;
    const feetY = this.groundY - fighter.y / SUBPIXELS_PER_PIXEL;

    this.body.setPosition(x, feetY).setSize(width, height);
    const eyeOffset = width / 2 - EYE_INSET - EYE_SIZE / 2;
    this.eye.setPosition(x + fighter.facing * eyeOffset, feetY - height + EYE_INSET);
  }
}
