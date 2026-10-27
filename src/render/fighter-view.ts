import type Phaser from 'phaser';
import { leftEdge } from '../core/boxes';
import { hurtboxesOf } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import type { FighterState, GameState } from '../core/state';
import { DEPTH } from './depth';

/** The "foot" that shows which way a grey box faces, in world pixels. */
const FOOT_WIDTH = 6;
const FOOT_HEIGHT = 4;

const COLORS = {
  foot: 0xe8e8f0,
  hit: 0xffffff,
  block: 0x8a8aa0,
  down: 0x5a5a6e,
} as const;

/**
 * Grey-box display of a fighter without art (docs/combat-v2.md §9.6): exactly its hurtboxes,
 * so what is drawn is what can be hit, tinted by state, and a 6 × 4 px "foot" on the ground at
 * its front edge, toward the side it faces. Lying down, its body on the floor. Its hitbox shows
 * in the debug view only (BoxOverlay). Two rectangles at most (a body has one or two bands),
 * created up front, moved every frame: nothing is allocated.
 */
export class FighterView {
  private readonly bands: readonly [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly foot: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    private readonly color: number,
    private readonly groundY: number,
    private readonly player: 0 | 1,
    private readonly template: FighterTemplate,
  ) {
    const band = (): Phaser.GameObjects.Rectangle =>
      scene.add.rectangle(0, 0, 1, 1, color).setOrigin(0, 1);
    this.bands = [band(), band()];
    this.foot = scene.add.rectangle(0, 0, FOOT_WIDTH, FOOT_HEIGHT, COLORS.foot).setOrigin(0, 1);
    this.setFront(false);
  }

  /** Draws this fighter over the other one, or under it. */
  setFront(front: boolean): void {
    const depth = front ? DEPTH.fighterFront : DEPTH.fighterBack;
    for (const band of this.bands) band.setDepth(depth);
    this.foot.setDepth(depth);
  }

  update(state: GameState): void {
    const fighter = state.fighters[this.player];
    const template = this.template;
    const color = this.bodyColor(fighter);
    const { x, y, facing } = fighter;
    if (fighter.action === 'knockdown') {
      // Down, nothing can hit it: the body lies on the floor, its lying pushbox.
      const { width, height } = template.lyingPushbox;
      this.place(0, x - width / 2, y, width, height, color);
      this.bands[1].setVisible(false);
      this.foot.setVisible(false);
      return;
    }
    const boxes = hurtboxesOf(fighter, template);
    for (let index = 0; index < this.bands.length; index++) {
      const box = boxes[index];
      if (box) this.place(index, leftEdge(box, x, facing), y + box.y, box.width, box.height, color);
      else this.bands[index]?.setVisible(false);
    }
    // On the floor of the first box (the legs), inside its front edge: the foot reaches no
    // farther than the body can be hit.
    const legs = boxes[0];
    if (!legs) return;
    const front = x + facing * (legs.x + legs.width);
    const left = toPx(front) - (facing === 1 ? FOOT_WIDTH : 0);
    this.foot.setPosition(left, this.groundY - toPx(y + legs.y)).setVisible(true);
  }

  /** Band `index` on a box in stage sub-pixels (left, bottom, size). */
  private place(
    index: number,
    left: number,
    bottom: number,
    width: number,
    height: number,
    color: number,
  ): void {
    this.bands[index]
      ?.setPosition(toPx(left), this.groundY - toPx(bottom))
      .setSize(toPx(width), toPx(height))
      .setFillStyle(color)
      .setVisible(true);
  }

  private bodyColor(fighter: FighterState): number {
    switch (fighter.action) {
      case 'hitstun':
      case 'airHit':
      case 'held':
        return COLORS.hit;
      case 'blockstun':
      case 'guard':
      case 'tech':
        return COLORS.block;
      case 'knockdown':
      case 'ko':
        return COLORS.down;
      default:
        return this.color;
    }
  }
}
