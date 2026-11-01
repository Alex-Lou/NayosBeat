import type Phaser from 'phaser';
import { DEPTH } from './depth';
import { alphaOver } from './veils';
import { VIEW_SIZE } from './view';

/**
 * What the Finisher's scene draws on the stage (docs/finisher.md §2.5, §2.6, §3.5, §3.6), never a
 * flash: the flat over the stage behind the fighters (not a veil of `Effects`: COLOR_GAP would
 * drop it after the super's dark), the cold light falling on Nayo, the needle's scratch across
 * Riff's flat, and her studs flying off on her KO. Everything is made once, hidden until shown.
 */

/** The cold light on Nayo (§2.5): 60 world px wide at the floor, ΔL ≤ 0.05 over the flat. */
const CONE = { color: 0xc9d6e8, bottom: 60, top: 18, height: 120, delta: 0.05 } as const;
/** Riff's studs (§3.6): 8 diamonds of 5 × 5 px, in her strike's color (silver, crimson). */
const SHARD_SIZE = 5;
const SHARD_LIFE = 34;
const SHARD_GRAVITY = 0.12;
/** Where each stud flies: a fixed fan, never chance (degrees up from the floor, px a frame). */
const SHARDS = [
  { angle: 20, speed: 2.6 },
  { angle: 45, speed: 2.2 },
  { angle: 70, speed: 2.8 },
  { angle: 95, speed: 2.4 },
  { angle: 115, speed: 3 },
  { angle: 140, speed: 2.1 },
  { angle: 160, speed: 2.7 },
  { angle: 35, speed: 3.2 },
] as const;
/** The needle's scratch: 1 world px of silver. */
const NEEDLE_COLOR = 0xd8e0ec;

/** Where on the screen a scratch crosses the flat: from the view's top left to its bottom right. */
export interface Scratch {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

interface Shard {
  readonly graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export class FinisherProps {
  private readonly flat: Phaser.GameObjects.Rectangle;
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly needle: Phaser.GameObjects.Graphics;
  private readonly shards: readonly Shard[];
  private shardSize = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    stageWidth: number,
  ) {
    const { width, height } = VIEW_SIZE;
    this.flat = scene.add
      .rectangle(-width, -height, stageWidth + 2 * width, 3 * height, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH.flat)
      .setVisible(false);
    this.cone = scene.add
      .graphics()
      .setDepth(DEPTH.flat + 0.03)
      .setVisible(false);
    this.needle = scene.add
      .graphics()
      .setDepth(DEPTH.flat + 0.02)
      .setVisible(false);
    this.shards = SHARDS.map(() => ({
      graphics: scene.add.graphics().setDepth(DEPTH.sparks).setVisible(false),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: SHARD_LIFE,
    }));
  }

  /** The flat in `color`, `alpha` opaque (0: gone). */
  showFlat(color: number, alpha: number): void {
    this.flat
      .setFillStyle(color)
      .setAlpha(alpha)
      .setVisible(alpha > 0);
  }

  /** The cold light over world x `x`, its opacity a share `amount` of its own over `flat`. */
  showCone(x: number, amount: number, flat: number): void {
    if (amount <= 0) {
      this.cone.setVisible(false);
      return;
    }
    const alpha = alphaOver(CONE.color, [flat], CONE.delta) * amount;
    const { bottom, top, height } = CONE;
    // A trapezoid, as two triangles: narrow above the screen, 60 px wide on the floor.
    this.cone
      .clear()
      .fillStyle(CONE.color, alpha)
      .fillTriangle(-top / 2, -height, top / 2, -height, bottom / 2, 0)
      .fillTriangle(-top / 2, -height, bottom / 2, 0, -bottom / 2, 0)
      .setPosition(Math.round(x), this.groundY)
      .setVisible(true);
  }

  /** The needle's scratch, `drawn` of its way along `scratch` (0 to 1; 0: none). */
  showNeedle(scratch: Scratch | null, drawn: number): void {
    if (!scratch || drawn <= 0) {
      this.needle.setVisible(false);
      return;
    }
    const { x1, y1, x2, y2 } = scratch;
    this.needle
      .clear()
      .lineStyle(1, NEEDLE_COLOR)
      .lineBetween(x1, y1, x1 + (x2 - x1) * drawn, y1 + (y2 - y1) * drawn)
      .setVisible(true);
  }

  /** The studs fly off from world (x, y), `size` times their size, in `color`, away from the blow. */
  burst(x: number, y: number, away: 1 | -1, color: number, size: number): void {
    this.shardSize = size;
    const half = (SHARD_SIZE * size) / 2;
    this.shards.forEach((shard, index) => {
      const fly = SHARDS[index] ?? { angle: 90, speed: 2 };
      const angle = (fly.angle * Math.PI) / 180;
      shard.x = x;
      shard.y = y;
      shard.vx = Math.cos(angle) * fly.speed * size * away;
      shard.vy = -Math.sin(angle) * fly.speed * size;
      shard.age = 0;
      // A diamond, as two triangles.
      shard.graphics
        .clear()
        .fillStyle(color)
        .fillTriangle(0, -half, half, 0, -half, 0)
        .fillTriangle(-half, 0, half, 0, 0, half);
    });
  }

  /** One step of 1/60 s for the studs: they live on the visual clock, under a held image too. */
  update(): void {
    for (const shard of this.shards) {
      if (shard.age >= SHARD_LIFE) {
        shard.graphics.setVisible(false);
        continue;
      }
      shard.age += 1;
      shard.vy += SHARD_GRAVITY * this.shardSize;
      shard.x += shard.vx;
      shard.y = Math.min(this.groundY, shard.y + shard.vy);
      const fade = 1 - shard.age / SHARD_LIFE;
      shard.graphics
        .setPosition(shard.x, shard.y)
        .setAlpha(fade)
        .setVisible(fade > 0);
    }
  }

  /** Everything gone: the scene is over. */
  hide(): void {
    this.flat.setVisible(false);
    this.cone.setVisible(false);
    this.needle.setVisible(false);
    for (const shard of this.shards) {
      shard.age = SHARD_LIFE;
      shard.graphics.setVisible(false);
    }
  }
}
