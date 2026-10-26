import type Phaser from 'phaser';
import { VIEW_SIZE } from './view';

/** Screen shake and screen flash. Purely visual, driven by fight events. */
export class Effects {
  private readonly flashOverlay: Phaser.GameObjects.Rectangle;
  private shakeFrames = 0;
  private shakeAmplitude = 0;
  private flashFrames = 0;
  private flashDuration = 1;
  /** Whole-pixel camera offset for the current frame (keeps pixel art crisp). */
  private offsetX = 0;
  private offsetY = 0;

  constructor(scene: Phaser.Scene) {
    this.flashOverlay = scene.add
      .rectangle(0, 0, VIEW_SIZE.width, VIEW_SIZE.height, 0xffffff)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
  }

  shake(frames: number, amplitude: number): void {
    // A stronger shake is never cut short by a weaker one.
    if (amplitude >= this.shakeAmplitude || this.shakeFrames === 0) {
      this.shakeFrames = frames;
      this.shakeAmplitude = amplitude;
    }
  }

  flash(frames: number, color = 0xffffff): void {
    this.flashFrames = frames;
    this.flashDuration = frames;
    this.flashOverlay.setFillStyle(color);
  }

  /** Advances effects by one display frame. */
  update(): void {
    if (this.shakeFrames > 0) this.shakeFrames -= 1;
    if (this.shakeFrames === 0) this.shakeAmplitude = 0;
    this.updateShakeOffset();

    if (this.flashFrames > 0) this.flashFrames -= 1;
    this.flashOverlay.setAlpha((this.flashFrames / this.flashDuration) * 0.7);
  }

  get shakeX(): number {
    return this.offsetX;
  }

  get shakeY(): number {
    return this.offsetY;
  }

  /** Alternates sides every frame, by whole pixels. */
  private updateShakeOffset(): void {
    if (this.shakeFrames === 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    const direction = this.shakeFrames % 2 === 0 ? 1 : -1;
    this.offsetX = direction * Math.max(1, Math.round(this.shakeAmplitude));
    this.offsetY = (this.shakeFrames % 3) - 1;
  }
}
