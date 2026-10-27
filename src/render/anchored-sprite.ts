import Phaser from 'phaser';
import { ART_SCALE, cellOf, type FighterArt } from '../art/types';

/** A fighter's strips: its body, or the front effects drawn over both fighters. */
export type Layer = 'body' | 'fx';

/** Name of a strip's image: the strip itself, or `fx/` and the strip for its front effects. */
export function stripName(sheet: string, layer: Layer = 'body'): string {
  return layer === 'fx' ? `fx/${sheet}` : sheet;
}

export function textureKey(art: FighterArt, sheet: string, layer: Layer = 'body'): string {
  return `${art.key}/${stripName(sheet, layer)}`;
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
    private readonly layer: Layer = 'body',
  ) {
    const sheets = Object.keys(layer === 'fx' ? (art.fx ?? {}) : art.urls);
    this.keys = Object.fromEntries(sheets.map((sheet) => [sheet, textureKey(art, sheet, layer)]));
    const first = sheets[0] ?? art.clips.idle.sheet;
    this.sprite = scene.add
      .sprite(0, 0, textureKey(art, first, layer), 0)
      // Positions are in world pixels; each sprite pixel is 1 / ART_SCALE of one.
      .setScale(1 / ART_SCALE);
    this.anchorOn(first);
  }

  show(sheet: string, frame: number, x: number, y: number, flip: boolean): void {
    const key = this.keys[sheet] ?? textureKey(this.art, sheet, this.layer);
    if (key !== this.shownKey || frame !== this.shownFrame) {
      this.sprite.setTexture(key, frame);
      if (key !== this.shownKey) this.anchorOn(sheet);
      this.shownKey = key;
      this.shownFrame = frame;
    }
    this.sprite.setPosition(x, y).setFlipX(flip).setVisible(true);
  }

  /** Each strip is cropped differently: its anchor sets the sprite's origin. */
  private anchorOn(sheet: string): void {
    const cell = cellOf(this.art, stripName(sheet, this.layer));
    this.sprite.setOrigin(cell.anchor.x / cell.width, cell.anchor.y / cell.height);
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  setAlpha(alpha: number): this {
    this.sprite.setAlpha(alpha);
    return this;
  }

  /** Draws the sprite as a flat silhouette of `color` (an afterimage). */
  fill(color: number): this {
    this.sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    return this;
  }

  setDepth(depth: number): this {
    this.sprite.setDepth(depth);
    return this;
  }
}
