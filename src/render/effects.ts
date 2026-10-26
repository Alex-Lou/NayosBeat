import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { VIEW_SIZE } from './view';

/** Every spark comes from this fixed pool: nothing is created or destroyed during a fight. */
const SPARK_POOL_SIZE = 32;

export interface BurstStyle {
  readonly color: number;
  readonly count: number;
  /** Initial speed, in pixels per frame. */
  readonly speed: number;
  readonly size: number;
  /** Lifetime, in display frames. */
  readonly life: number;
}

export const BURSTS = {
  lightHit: { color: 0xfff1a8, count: 6, speed: 2.2, size: 2, life: 10 },
  heavyHit: { color: 0xffd04a, count: 12, speed: 3.2, size: 3, life: 14 },
  block: { color: 0x8fd3ff, count: 5, speed: 1.6, size: 2, life: 8 },
  ko: { color: 0xffffff, count: 20, speed: 4, size: 3, life: 22 },
} as const satisfies Record<string, BurstStyle>;

interface Spark {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/** Hit sparks, screen shake and screen flash. Purely visual, driven by fight events. */
export class Effects {
  private readonly sparks: Spark[];
  private readonly flashOverlay: Phaser.GameObjects.Rectangle;
  private nextSpark = 0;
  private shakeFrames = 0;
  private shakeAmplitude = 0;
  private flashFrames = 0;
  private flashDuration = 1;
  /** Whole-pixel camera offset for the current frame (keeps pixel art crisp). */
  private offsetX = 0;
  private offsetY = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
  ) {
    this.sparks = Array.from({ length: SPARK_POOL_SIZE }, () => ({
      shape: scene.add.rectangle(0, 0, 1, 1, 0xffffff).setDepth(5).setVisible(false),
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
    }));
    this.flashOverlay = scene.add
      .rectangle(0, 0, VIEW_SIZE.width, VIEW_SIZE.height, 0xffffff)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0);
  }

  /** Spawns sparks at a point in stage coordinates (sub-pixels, y up from the ground). */
  burst(x: number, y: number, style: BurstStyle): void {
    const screenX = toPx(x);
    const screenY = this.groundY - toPx(y);
    for (let i = 0; i < style.count; i++) {
      // The oldest spark is recycled when the pool is full.
      const spark = this.sparks[this.nextSpark];
      this.nextSpark = (this.nextSpark + 1) % this.sparks.length;
      if (!spark) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = style.speed * (0.5 + Math.random() * 0.7);
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.life = style.life;
      spark.maxLife = style.life;
      spark.shape
        .setPosition(screenX, screenY)
        .setSize(style.size, style.size)
        .setFillStyle(style.color)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  shake(frames: number, amplitude: number): void {
    // A stronger shake is never cut short by a weaker one.
    if (amplitude >= this.shakeAmplitude || this.shakeFrames === 0) {
      this.shakeFrames = frames;
      this.shakeAmplitude = amplitude;
    }
  }

  flash(frames: number): void {
    this.flashFrames = frames;
    this.flashDuration = frames;
  }

  /** Advances effects by one display frame. */
  update(): void {
    for (const spark of this.sparks) {
      if (spark.life <= 0) continue;
      spark.life -= 1;
      spark.vy += 0.15;
      spark.shape
        .setPosition(spark.shape.x + spark.vx, spark.shape.y + spark.vy)
        .setAlpha(spark.life / spark.maxLife);
      if (spark.life <= 0) spark.shape.setVisible(false);
    }

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
