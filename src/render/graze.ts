import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import type { HitStyle } from './hit-styles';

const POOL_SIZE = 12;
/** Streaks of one low blow. */
const STREAKS = 5;
/** Display frames a streak lives. */
const LIFE = 10;
/** Pixels per display frame at the start, and how much of its speed a streak keeps each frame. */
const SPEED = 2.6;
const DRAG = 0.82;
/** Streaks are drawn this long per pixel of speed (a motion blur), at least MIN_LENGTH. */
const STRETCH = 2.2;
const MIN_LENGTH = 1;

interface Streak {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  /** Display frames left; 0 once gone. */
  life: number;
}

/**
 * The grazing spark of a low blow (docs/combat-v2.md §9.3): instead of bursting up, a few thin
 * streaks skim along the floor from the shin, away from the attacker, in its colors, and
 * shorten as they slow down. A fixed pool, the oldest streak recycled: nothing is created during
 * a fight.
 */
export class Graze {
  private readonly streaks: Streak[];
  private next = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
  ) {
    this.streaks = Array.from({ length: POOL_SIZE }, () => ({
      shape: scene.add.rectangle(0, 0, 1, 1, 0xffffff).setDepth(DEPTH.sparks).setVisible(false),
      vx: 0,
      vy: 0,
      life: 0,
    }));
  }

  /**
   * Streaks from the impact at (x, y) (stage sub-pixels, y up from the ground), skimming `away`
   * (1: right), in the attacker's `style`.
   */
  play(style: HitStyle, x: number, y: number, away: 1 | -1): void {
    const screenX = Math.round(toPx(x));
    const screenY = Math.round(this.groundY - toPx(y));
    for (let i = 0; i < STREAKS; i++) {
      const streak = this.streaks[this.next];
      this.next = (this.next + 1) % this.streaks.length;
      if (!streak) continue;
      // A flat fan: the first streak, the brightest, straight along the blow, the others a
      // little faster or slower, a hair up or down (never into the floor).
      streak.vx = away * SPEED * (0.7 + 0.15 * i + Math.random() * 0.2);
      streak.vy = (i % 2 === 0 ? -1 : 1) * Math.random() * 0.25;
      streak.life = LIFE;
      streak.shape
        .setOrigin(away > 0 ? 1 : 0, 0.5)
        .setPosition(screenX, Math.min(screenY + (i % 3) - 1, this.groundY - 1))
        .setFillStyle(i === 0 ? style.core : i % 2 === 0 ? style.strike : style.energy)
        .setSize(Math.abs(streak.vx) * STRETCH, 1)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  /** Advances the streaks by one display frame. */
  update(): void {
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
}
