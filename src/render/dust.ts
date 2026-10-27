import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';

const POOL_SIZE = 12;
/** Specks kicked up by one push-off. */
const SPECKS_PER_PUFF = 4;
/** Display frames a speck lives. */
const LIFE = 16;
const COLOR = 0xb9b2c8;
const ALPHA = 0.55;

interface Speck {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  /** Display frames left; 0 once gone. */
  life: number;
}

/**
 * The dust a dash kicks up where it sets off: a few specks thrown back from the feet, rising a
 * little and fading. A fixed pool, the oldest speck recycled: nothing is created during a fight.
 */
export class Dust {
  private readonly specks: Speck[];
  private next = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
  ) {
    this.specks = Array.from({ length: POOL_SIZE }, () => ({
      shape: scene.add.rectangle(0, 0, 2, 2, COLOR).setDepth(DEPTH.effects).setVisible(false),
      vx: 0,
      vy: 0,
      life: 0,
    }));
  }

  /** A puff at `x` (stage sub-pixels) on the ground, for a dash going `toward` (1: right). */
  puff(x: number, toward: 1 | -1): void {
    const screenX = toPx(x);
    for (let i = 0; i < SPECKS_PER_PUFF; i++) {
      const speck = this.specks[this.next];
      this.next = (this.next + 1) % this.specks.length;
      if (!speck) continue;
      // Thrown back against the push, a little fan of speeds and heights.
      speck.vx = -toward * (0.6 + 0.35 * i + Math.random() * 0.3);
      speck.vy = -(0.25 + Math.random() * 0.35);
      speck.life = LIFE;
      const size = i % 2 === 0 ? 3 : 2;
      speck.shape
        .setPosition(Math.round(screenX - toward * 4), this.groundY - 1)
        .setSize(size, size)
        .setAlpha(ALPHA)
        .setVisible(true);
    }
  }

  /** Advances the specks by one display frame. */
  update(): void {
    for (const speck of this.specks) {
      if (speck.life <= 0) continue;
      speck.life -= 1;
      // The air slows them down.
      speck.vx *= 0.9;
      speck.shape
        .setPosition(speck.shape.x + speck.vx, speck.shape.y + speck.vy)
        .setAlpha((ALPHA * speck.life) / LIFE);
      if (speck.life === 0) speck.shape.setVisible(false);
    }
  }
}
