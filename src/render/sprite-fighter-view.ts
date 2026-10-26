import type Phaser from 'phaser';
import { ANCHOR, CELL_SIZE, type FighterArt } from '../art/types';
import { activeMove, hitboxInWorld, hurtboxInWorld } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import type { FighterState } from '../core/state';
import { clipFrameAt, clipIdOf } from './animation';
import { addHitbox, outlineBox, placeBox } from './fighter-view';

const SHADOW_WIDTH = 36;
const SHADOW_HEIGHT = 6;
const SHADOW_ALPHA = 0.35;
/** Jump height (px) at which the shadow has shrunk to half its size. */
const SHADOW_HALF_HEIGHT = 120;

export function textureKey(art: FighterArt, sheet: string): string {
  return `${art.key}/${sheet}`;
}

/** Loads every strip of `art` that is not already in the texture cache. */
export function loadArt(scene: Phaser.Scene, art: FighterArt): void {
  for (const [sheet, url] of Object.entries(art.urls)) {
    const key = textureKey(art, sheet);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, url, { frameWidth: CELL_SIZE, frameHeight: CELL_SIZE });
  }
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move), so the animation always matches the frame data. Boxes show in debug.
 */
export class SpriteFighterView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly hitbox: Phaser.GameObjects.Rectangle | undefined;
  private readonly hurtbox: Phaser.GameObjects.Graphics | undefined;
  /** Texture and frame on screen, to change them only when the animation moves on. */
  private shownKey = '';
  private shownFrame = -1;
  /** Texture key of each strip, computed once. */
  private readonly keys: Readonly<Record<string, string>>;

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly groundY: number,
    showBoxes: boolean,
  ) {
    this.keys = Object.fromEntries(
      Object.keys(art.urls).map((sheet) => [sheet, textureKey(art, sheet)]),
    );
    this.shadow = scene.add.ellipse(
      0,
      groundY,
      SHADOW_WIDTH,
      SHADOW_HEIGHT,
      0x000000,
      SHADOW_ALPHA,
    );
    const first = art.clips.idle;
    this.sprite = scene.add
      .sprite(0, 0, textureKey(art, first.sheet), first.frames[0])
      .setOrigin(ANCHOR.x / CELL_SIZE, ANCHOR.y / CELL_SIZE);
    this.hitbox = showBoxes ? addHitbox(scene) : undefined;
    this.hurtbox = showBoxes ? scene.add.graphics().setDepth(1) : undefined;
  }

  update(fighter: FighterState, template: FighterTemplate): void {
    const clip = this.art.clips[clipIdOf(fighter)];
    const frame = clip.frames[clipFrameAt(clip, fighter.actionFrame)] ?? 0;
    const key = this.keys[clip.sheet] ?? textureKey(this.art, clip.sheet);
    if (key !== this.shownKey || frame !== this.shownFrame) {
      this.sprite.setTexture(key, frame);
      this.shownKey = key;
      this.shownFrame = frame;
    }

    const x = toPx(fighter.x);
    const height = toPx(fighter.y);
    this.sprite.setPosition(x, this.groundY - height).setFlipX(fighter.facing < 0);
    const shrink = SHADOW_HALF_HEIGHT / (SHADOW_HALF_HEIGHT + height);
    this.shadow.setPosition(x, this.groundY).setScale(shrink);

    if (this.hitbox) {
      const move = activeMove(fighter, template);
      this.hitbox.setVisible(move !== null);
      if (move?.hitbox) placeBox(this.hitbox, hitboxInWorld(fighter, move.hitbox), this.groundY);
    }
    if (this.hurtbox) outlineBox(this.hurtbox, hurtboxInWorld(fighter, template), this.groundY);
  }
}
