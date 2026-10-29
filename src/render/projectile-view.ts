import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { projectileBox } from '../core/projectiles';
import type { ProjectileState } from '../core/state';
import { clipFrameAt } from './animation';
import { DEPTH } from './depth';
import { AnchoredSprite } from './anchored-sprite';

const COLOR = 0xffb347;

/**
 * Draws projectiles, each player having at most one alive: with its owner's sprites for the move
 * that fired it (the Vinyle, its platine Remix) when they have some, as a rectangle otherwise.
 * Everything is created up front: nothing during the fight.
 */
export class ProjectileView {
  private readonly rectangles: readonly [
    Phaser.GameObjects.Rectangle,
    Phaser.GameObjects.Rectangle,
  ];
  private readonly sprites: readonly [AnchoredSprite | undefined, AnchoredSprite | undefined];

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly groundY: number,
    private readonly arts: readonly [FighterArt | undefined, FighterArt | undefined],
  ) {
    const rectangle = (): Phaser.GameObjects.Rectangle =>
      scene.add
        .rectangle(0, 0, 1, 1, COLOR)
        .setOrigin(0, 1)
        .setDepth(DEPTH.effects)
        .setVisible(false);
    this.rectangles = [rectangle(), rectangle()];
    const sprite = (art: FighterArt | undefined): AnchoredSprite | undefined => {
      if (!art?.projectiles) return undefined;
      const view = new AnchoredSprite(scene, art).setDepth(DEPTH.effects);
      view.hide();
      return view;
    };
    this.sprites = [sprite(arts[0]), sprite(arts[1])];
  }

  /** `frame` is the match clock: the projectile's loop plays on it. */
  update(projectiles: readonly ProjectileState[], frame: number): void {
    for (const player of [0, 1] as const) {
      let projectile: ProjectileState | undefined;
      for (const candidate of projectiles) if (candidate.owner === player) projectile = candidate;
      const sprite = this.sprites[player];
      const clip = projectile && this.arts[player]?.projectiles?.[projectile.move];
      if (projectile && sprite && clip) {
        const cell = clip.frames[clipFrameAt(clip, frame)] ?? 0;
        sprite.show(clip.sheet, cell, toPx(projectile.x), this.groundY, projectile.facing < 0);
        continue;
      }
      sprite?.hide();
      this.showRectangle(this.rectangles[player], projectile);
    }
  }

  private showRectangle(
    rectangle: Phaser.GameObjects.Rectangle,
    projectile: ProjectileState | undefined,
  ): void {
    rectangle.setVisible(projectile !== undefined);
    if (!projectile) return;
    const box = projectileBox(projectile, this.config);
    rectangle
      .setPosition(toPx(box.left), this.groundY - toPx(box.bottom))
      .setSize(toPx(box.width), toPx(box.height));
  }
}
