import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import { FxRandom } from './fx-random';

/** Arcade-style blood: a few dark-red drops, never gore. Three tones, darkest to lightest. */
const TONES = [0x7a0f1a, 0xb81d2b, 0xe8384a] as const;

const DROP_POOL_SIZE = 24;
const SPLAT_POOL_SIZE = 12;
/** Pixels per display frame squared. */
const GRAVITY = 0.22;
/** How long a splat stays on the floor, then how long it takes to fade, in display frames. */
const SPLAT_STAY = 150;
const SPLAT_FADE = 60;

export interface BleedStyle {
  readonly drops: number;
  /** Horizontal speed away from the attacker, in pixels per frame. */
  readonly speed: number;
}

export const BLEEDS = {
  heavyHit: { drops: 5, speed: 1.6 },
  ko: { drops: 9, speed: 2.1 },
} as const satisfies Record<string, BleedStyle>;

interface Drop {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  alive: boolean;
}

interface Splat {
  readonly shape: Phaser.GameObjects.Rectangle;
  /** Display frames left before it is gone. */
  life: number;
}

/**
 * Drops thrown from a heavy blow, away from the attacker; those reaching the floor leave a small
 * splat that fades after a few seconds. Everything comes from fixed pools: nothing is created
 * during a fight, the oldest drop or splat is recycled when a pool is full.
 */
export class Blood {
  private readonly drops: Drop[];
  private readonly splats: Splat[];
  private nextDrop = 0;
  private nextSplat = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    /** The effects' seeded randomness (fx-random.ts), the feedback's. */
    private readonly random: FxRandom = new FxRandom(),
  ) {
    this.drops = Array.from({ length: DROP_POOL_SIZE }, () => ({
      shape: scene.add.rectangle(0, 0, 1, 1, TONES[1]).setDepth(DEPTH.blood).setVisible(false),
      vx: 0,
      vy: 0,
      alive: false,
    }));
    // Splats lie on the floor's top row.
    this.splats = Array.from({ length: SPLAT_POOL_SIZE }, () => ({
      shape: scene.add.rectangle(0, 0, 1, 1, TONES[0]).setOrigin(0.5, 0).setVisible(false),
      life: 0,
    }));
  }

  /**
   * Throws drops from a point in stage coordinates (sub-pixels, y up from the ground).
   * `away` is the direction the blow pushes the defender.
   */
  bleed(x: number, y: number, away: 1 | -1, style: BleedStyle): void {
    const screenX = toPx(x);
    const screenY = this.groundY - toPx(y);
    for (let i = 0; i < style.drops; i++) {
      const drop = this.drops[this.nextDrop];
      this.nextDrop = (this.nextDrop + 1) % this.drops.length;
      if (!drop) continue;
      drop.vx = away * style.speed * (0.4 + this.random.next() * 0.9);
      drop.vy = -(0.8 + this.random.next() * 1.6);
      drop.alive = true;
      const size = this.random.next() < 0.7 ? 2 : 1;
      drop.shape
        .setPosition(Math.round(screenX), Math.round(screenY))
        .setSize(size, size)
        .setFillStyle(TONES[1 + (i % 2)] ?? TONES[1])
        .setVisible(true);
    }
  }

  /** Advances drops and splats by one display frame. */
  update(): void {
    for (const drop of this.drops) {
      if (!drop.alive) continue;
      drop.vy += GRAVITY;
      const x = drop.shape.x + drop.vx;
      const y = drop.shape.y + drop.vy;
      if (y >= this.groundY) {
        drop.alive = false;
        drop.shape.setVisible(false);
        this.splat(x);
      } else {
        drop.shape.setPosition(x, y);
      }
    }
    for (const splat of this.splats) {
      if (splat.life <= 0) continue;
      splat.life -= 1;
      splat.shape.setAlpha(Math.min(1, splat.life / SPLAT_FADE));
      if (splat.life <= 0) splat.shape.setVisible(false);
    }
  }

  private splat(x: number): void {
    const splat = this.splats[this.nextSplat];
    this.nextSplat = (this.nextSplat + 1) % this.splats.length;
    if (!splat) return;
    splat.life = SPLAT_STAY + SPLAT_FADE;
    splat.shape
      .setPosition(Math.round(x), this.groundY)
      .setSize(2 + Math.floor(this.random.next() * 3), 1)
      .setAlpha(1)
      .setVisible(true);
  }
}
