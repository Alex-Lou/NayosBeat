import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import { FxRandom } from './fx-random';
import type { HitStyle } from './hit-styles';

/** How hard a low blow lands: a sweep (heavy) throws more, longer streaks than a jab. */
export type GrazeWeight = 'light' | 'heavy';

interface Spark {
  /** Streaks thrown along the floor. */
  readonly streaks: number;
  /** Pixels per display frame of the first streaks. */
  readonly speed: number;
  /** Width of the flat flash at the shin, in pixels. */
  readonly flash: number;
}

const SPARKS: Readonly<Record<GrazeWeight, Spark>> = {
  light: { streaks: 5, speed: 2.6, flash: 8 },
  heavy: { streaks: 8, speed: 3.6, flash: 14 },
};
/** Two heavy blows on the same tick (a trade) still show every streak. */
const STREAK_POOL = 16;
const FLASH_POOL = 2;
/** Display frames a streak lives, and the flash. */
const LIFE = 10;
const FLASH_LIFE = 4;
/** How much of its speed a streak keeps each frame. */
const DRAG = 0.82;
/** Streaks are drawn this long per pixel of speed (a motion blur), at least MIN_LENGTH. */
const STRETCH = 2.2;
const MIN_LENGTH = 1;
/** The flash is a flat bar this tall, its bottom row at least one pixel above the floor. */
const FLASH_HEIGHT = 2;

interface Streak {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  /** Display frames left; 0 once gone. */
  life: number;
}

interface Flash {
  readonly shape: Phaser.GameObjects.Rectangle;
  width: number;
  life: number;
}

/**
 * The grazing spark of a low blow (docs/combat-v2.md §9.3), in place of the burst of a blow
 * higher up: a flat flash at the shin, then thin streaks skimming along the floor away from the
 * attacker, in its colors, shortening as they slow down. Nothing of it ever goes below the floor
 * line. Fixed pools, the oldest shape recycled: nothing is created during a fight.
 */
export class Graze {
  private readonly streaks: Streak[];
  private readonly flashes: Flash[];
  private nextStreak = 0;
  private nextFlash = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    /** The effects' seeded randomness (fx-random.ts), the feedback's. */
    private readonly random: FxRandom = new FxRandom(),
  ) {
    const rectangle = (): Phaser.GameObjects.Rectangle =>
      scene.add.rectangle(0, 0, 1, 1, 0xffffff).setDepth(DEPTH.sparks).setVisible(false);
    this.streaks = Array.from({ length: STREAK_POOL }, () => ({
      shape: rectangle(),
      vx: 0,
      vy: 0,
      life: 0,
    }));
    this.flashes = Array.from({ length: FLASH_POOL }, () => ({
      shape: rectangle(),
      width: 0,
      life: 0,
    }));
  }

  /**
   * The spark of a `weight` blow landing at (x, y) (stage sub-pixels, y up from the ground),
   * skimming `away` (1: right), in the attacker's `style`.
   */
  play(style: HitStyle, weight: GrazeWeight, x: number, y: number, away: 1 | -1): void {
    const spark = SPARKS[weight];
    const screenX = Math.round(toPx(x));
    const floor = this.groundY - 1;
    const screenY = Math.min(Math.round(this.groundY - toPx(y)), floor);
    this.flash(style, spark.flash, screenX, screenY);
    for (let i = 0; i < spark.streaks; i++) {
      const streak = this.streaks[this.nextStreak];
      this.nextStreak = (this.nextStreak + 1) % this.streaks.length;
      if (!streak) continue;
      // A flat fan: the first streak, the brightest, straight along the blow, the others a
      // little faster or slower, a hair up or down (never into the floor).
      streak.vx = away * spark.speed * (0.7 + 0.15 * (i % 5) + this.random.next() * 0.2);
      streak.vy = (i % 2 === 0 ? -1 : 1) * this.random.next() * 0.25;
      streak.life = LIFE;
      streak.shape
        .setOrigin(away > 0 ? 1 : 0, 0.5)
        .setPosition(screenX, Math.min(screenY + (i % 3) - 1, floor))
        .setFillStyle(i === 0 ? style.core : i % 2 === 0 ? style.strike : style.energy)
        .setSize(Math.abs(streak.vx) * STRETCH, 1)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  /** Advances the flashes and the streaks by one display frame. */
  update(): void {
    for (const flash of this.flashes) {
      if (flash.life <= 0) continue;
      flash.life -= 1;
      // It narrows to a sliver as it goes out.
      flash.shape.setSize(Math.max(1, (flash.width * flash.life) / FLASH_LIFE), FLASH_HEIGHT);
      if (flash.life === 0) flash.shape.setVisible(false);
    }
    for (const streak of this.streaks) {
      if (streak.life <= 0) continue;
      streak.life -= 1;
      streak.vx *= DRAG;
      const shape = streak.shape;
      shape
        .setPosition(shape.x + streak.vx, Math.min(shape.y + streak.vy, this.groundY - 1))
        .setSize(Math.max(MIN_LENGTH, Math.abs(streak.vx) * STRETCH), 1)
        .setAlpha(streak.life / LIFE);
      if (streak.life === 0) shape.setVisible(false);
    }
  }

  /** The flat flash at the shin: a white-hot bar, its bottom row above the floor line. */
  private flash(style: HitStyle, width: number, screenX: number, screenY: number): void {
    const flash = this.flashes[this.nextFlash];
    this.nextFlash = (this.nextFlash + 1) % this.flashes.length;
    if (!flash) return;
    flash.width = width;
    flash.life = FLASH_LIFE;
    flash.shape
      .setOrigin(0.5, 1)
      .setPosition(screenX, Math.min(screenY + FLASH_HEIGHT / 2, this.groundY - 1))
      .setFillStyle(style.core)
      .setSize(width, FLASH_HEIGHT)
      .setVisible(true);
  }
}
