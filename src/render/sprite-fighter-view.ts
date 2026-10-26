import type Phaser from 'phaser';
import { ANCHOR, CELL_SIZE, type FighterArt } from '../art/types';
import { activeMove, hitboxInWorld, hurtboxInWorld } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import type { FighterState, RoundState } from '../core/state';
import { clipFrameAt, clipIdOf, clipTickOf } from './animation';
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

/** A sprite placed by its feet anchor, which changes texture and frame only when needed. */
export class AnchoredSprite {
  private readonly sprite: Phaser.GameObjects.Sprite;
  /** Texture and frame on screen, to change them only when the animation moves on. */
  private shownKey = '';
  private shownFrame = -1;
  /** Texture key of each strip, computed once. */
  private readonly keys: Readonly<Record<string, string>>;

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
  ) {
    this.keys = Object.fromEntries(
      Object.keys(art.urls).map((sheet) => [sheet, textureKey(art, sheet)]),
    );
    const first = art.clips.idle;
    this.sprite = scene.add
      .sprite(0, 0, textureKey(art, first.sheet), first.frames[0])
      .setOrigin(ANCHOR.x / CELL_SIZE, ANCHOR.y / CELL_SIZE);
  }

  show(sheet: string, frame: number, x: number, y: number, flip: boolean): void {
    const key = this.keys[sheet] ?? textureKey(this.art, sheet);
    if (key !== this.shownKey || frame !== this.shownFrame) {
      this.sprite.setTexture(key, frame);
      this.shownKey = key;
      this.shownFrame = frame;
    }
    this.sprite.setPosition(x, y).setFlipX(flip).setVisible(true);
  }

  hide(): void {
    this.sprite.setVisible(false);
  }
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round), so the animation always matches the frame data. Boxes show in
 * debug.
 */
export class SpriteFighterView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
  private readonly hitbox: Phaser.GameObjects.Rectangle | undefined;
  private readonly hurtbox: Phaser.GameObjects.Graphics | undefined;

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly player: 0 | 1,
    private readonly groundY: number,
    showBoxes: boolean,
  ) {
    this.shadow = scene.add.ellipse(
      0,
      groundY,
      SHADOW_WIDTH,
      SHADOW_HEIGHT,
      0x000000,
      SHADOW_ALPHA,
    );
    this.body = new AnchoredSprite(scene, art);
    this.hitbox = showBoxes ? addHitbox(scene) : undefined;
    this.hurtbox = showBoxes ? scene.add.graphics().setDepth(1) : undefined;
  }

  update(fighter: FighterState, template: FighterTemplate, round: RoundState): void {
    const id = clipIdOf(fighter, this.player, round);
    const clip = this.art.clips[id];
    const frame = clip.frames[clipFrameAt(clip, clipTickOf(id, fighter, round))] ?? 0;

    const x = toPx(fighter.x);
    const height = toPx(fighter.y);
    this.body.show(clip.sheet, frame, x, this.groundY - height, fighter.facing < 0);
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
