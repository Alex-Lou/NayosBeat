import type Phaser from 'phaser';
import { leftEdge } from '../core/boxes';
import { activeMove, canBeGrabbed, canBeHit, hurtboxesOf } from '../core/combat';
import type { Box, MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { pushboxOf } from '../core/fighter';
import { moveOf } from '../core/moves';
import type { Facing, GameState } from '../core/state';
import { DEPTH } from './depth';

/** The debug view's colors (docs/combat-v2.md §9.6). */
const COLORS = {
  pushbox: 0x3b8bff,
  hurtbox: 0x3bff6b,
  hitbox: 0xff3b3b,
  invincible: 0xffffff,
  throwProof: 0xffe03a,
} as const;

const PLAYERS = [0, 1] as const;

/**
 * The debug view of the boxes, over everything (`?debug`, or the dev server): each fighter's
 * pushbox (blue; raised and slimmer in the air, flat lying down), its hurtboxes (green), tinted
 * white while blows go through it and outlined in yellow while grabs do, its active hitbox and
 * the projectiles' (red). Redrawn every frame, in debug only: one Graphics, cleared and drawn.
 */
export class BoxOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly groundY: number,
  ) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.debug);
  }

  update(state: GameState): void {
    const g = this.graphics.clear();
    for (const player of PLAYERS) {
      const fighter = state.fighters[player];
      const template = this.config.fighters[player];
      const { x, y, facing } = fighter;
      const pushbox = pushboxOf(fighter, template);
      const half = pushbox.width / 2;
      g.lineStyle(1, COLORS.pushbox, 0.9);
      this.stroke(x - half, y + (pushbox.lift ?? 0), pushbox.width, pushbox.height);

      const invincible = !canBeHit(fighter, template);
      const throwProof = !canBeGrabbed(fighter, template);
      for (const box of hurtboxesOf(fighter, template)) {
        const left = leftEdge(box, x, facing);
        if (invincible) {
          g.fillStyle(COLORS.invincible, 0.35);
          this.fill(left, y + box.y, box.width, box.height);
        }
        g.lineStyle(1, throwProof ? COLORS.throwProof : COLORS.hurtbox, 0.9);
        this.stroke(left, y + box.y, box.width, box.height);
      }

      const hitbox = activeMove(fighter, template)?.hitbox;
      if (hitbox) this.fillHitbox(hitbox, x, y, facing);
    }
    for (const projectile of state.projectiles) {
      const spec = moveOf(this.config.fighters[projectile.owner], projectile.move).projectile;
      if (spec) this.fillHitbox(spec.hitbox, projectile.x, 0, projectile.facing);
    }
  }

  private fillHitbox(box: Box, x: number, y: number, facing: Facing): void {
    this.graphics.fillStyle(COLORS.hitbox, 0.6);
    this.fill(leftEdge(box, x, facing), y + box.y, box.width, box.height);
  }

  /** A box in stage sub-pixels (left, bottom, size), outlined inside its edges. */
  private stroke(left: number, bottom: number, width: number, height: number): void {
    const top = this.groundY - toPx(bottom + height);
    this.graphics.strokeRect(toPx(left) + 0.5, top + 0.5, toPx(width) - 1, toPx(height) - 1);
  }

  private fill(left: number, bottom: number, width: number, height: number): void {
    const top = this.groundY - toPx(bottom + height);
    this.graphics.fillRect(toPx(left), top, toPx(width), toPx(height));
  }
}
