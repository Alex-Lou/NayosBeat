import type Phaser from 'phaser';
import type { WorldBox } from '../core/boxes';
import { activeMove, hitboxInWorld, hurtboxInWorld } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import { pushboxOf } from '../core/fighter';
import type { FighterState } from '../core/state';

const EYE_SIZE = 4;
const EYE_INSET = 3;

const COLORS = {
  eye: 0xffffff,
  hit: 0xffffff,
  block: 0x8a8aa0,
  down: 0x5a5a6e,
  hitbox: 0xff3b3b,
  hurtbox: 0x3bff6b,
} as const;

/**
 * Grey-box display of a fighter: its pushbox (tinted by state), an "eye" showing which way
 * it faces, and its active hitbox. Hurtboxes are outlined in debug mode.
 */
export class FighterView {
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly eye: Phaser.GameObjects.Rectangle;
  private readonly hitbox: Phaser.GameObjects.Rectangle;
  /** Graphics, not a stroked Rectangle: Phaser 4 strokes resized rectangles incorrectly. */
  private readonly hurtbox: Phaser.GameObjects.Graphics | undefined;

  constructor(
    scene: Phaser.Scene,
    private readonly color: number,
    private readonly groundY: number,
    showHurtbox: boolean,
  ) {
    this.body = scene.add.rectangle(0, 0, 1, 1, color).setOrigin(0.5, 1);
    this.eye = scene.add.rectangle(0, 0, EYE_SIZE, EYE_SIZE, COLORS.eye).setOrigin(0.5, 0);
    this.hitbox = scene.add.rectangle(0, 0, 1, 1, COLORS.hitbox, 0.7).setOrigin(0, 1);
    this.hurtbox = showHurtbox ? scene.add.graphics().setDepth(1) : undefined;
  }

  update(fighter: FighterState, template: FighterTemplate): void {
    const box = pushboxOf(fighter, template);
    const width = toPx(box.width);
    const height = toPx(box.height);
    const x = toPx(fighter.x);
    const feetY = this.groundY - toPx(fighter.y);

    this.body.setPosition(x, feetY).setSize(width, height).setFillStyle(this.bodyColor(fighter));
    const eyeOffset = width / 2 - EYE_INSET - EYE_SIZE / 2;
    this.eye.setPosition(x + fighter.facing * eyeOffset, feetY - height + EYE_INSET);

    const move = activeMove(fighter, template);
    this.hitbox.setVisible(move !== null);
    if (move?.hitbox) this.place(this.hitbox, hitboxInWorld(fighter, move.hitbox));
    if (this.hurtbox) this.outline(this.hurtbox, hurtboxInWorld(fighter, template));
  }

  private bodyColor(fighter: FighterState): number {
    switch (fighter.action) {
      case 'hitstun':
      case 'airHit':
        return COLORS.hit;
      case 'blockstun':
        return COLORS.block;
      case 'knockdown':
      case 'ko':
        return COLORS.down;
      default:
        return this.color;
    }
  }

  private outline(graphics: Phaser.GameObjects.Graphics, box: WorldBox): void {
    const top = this.groundY - toPx(box.bottom + box.height);
    graphics
      .clear()
      .lineStyle(1, COLORS.hurtbox, 0.8)
      .strokeRect(toPx(box.left) + 0.5, top + 0.5, toPx(box.width) - 1, toPx(box.height) - 1);
  }

  private place(rectangle: Phaser.GameObjects.Rectangle, box: WorldBox): void {
    rectangle
      .setPosition(toPx(box.left), this.groundY - toPx(box.bottom))
      .setSize(toPx(box.width), toPx(box.height));
  }
}
