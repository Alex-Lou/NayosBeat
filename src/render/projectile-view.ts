import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { SUBPIXELS_PER_PIXEL } from '../core/constants';
import { projectileBox } from '../core/projectiles';
import type { ProjectileState } from '../core/state';

/** At most one projectile per player is alive at a time. */
const POOL_SIZE = 2;
const COLOR = 0xffb347;

/** Draws projectiles from a fixed pool of rectangles: nothing is created during the fight. */
export class ProjectileView {
  private readonly pool: Phaser.GameObjects.Rectangle[];

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly groundY: number,
  ) {
    this.pool = Array.from({ length: POOL_SIZE }, () =>
      scene.add.rectangle(0, 0, 1, 1, COLOR).setOrigin(0, 1).setVisible(false),
    );
  }

  update(projectiles: readonly ProjectileState[]): void {
    this.pool.forEach((rectangle, index) => {
      const projectile = projectiles[index];
      rectangle.setVisible(projectile !== undefined);
      if (!projectile) return;
      const box = projectileBox(projectile, this.config);
      rectangle
        .setPosition(toPx(box.left), this.groundY - toPx(box.bottom))
        .setSize(toPx(box.width), toPx(box.height));
    });
  }
}

function toPx(subpixels: number): number {
  return subpixels / SUBPIXELS_PER_PIXEL;
}
