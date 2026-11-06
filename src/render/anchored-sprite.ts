import Phaser from 'phaser';
import { ART_SCALE, cellOf, HD_SCALE, type FighterArt } from '../art/types';
import { anchorOrigin } from './anchor-origin';
import { hdTextureKey, playedUrls, stripName, textureKey, type Layer } from './art-textures';
import type { RenderMode } from './render-mode';
import { FX_DARK } from './veils';

/**
 * A sprite placed by its feet anchor, which changes texture and frame only when needed. Drawn
 * without tints (`mode` simple: render-mode.ts), its dark look and its flat silhouette are not
 * drawn at all: they would show lit, in its own colors.
 */
export class AnchoredSprite {
  private readonly sprite: Phaser.GameObjects.Sprite;
  /** Texture, frame and side on screen, to change them only when the animation moves on. */
  private shownKey = '';
  private shownFrame = -1;
  private shownFlip = false;
  private darkened = false;
  /** Its look is a tint the renderer cannot draw: it stays hidden while it is. */
  private untinted = false;
  /** Texture key of each strip, computed once: its HD image's when it has one (`FighterArt.hd`). */
  private readonly keys: Readonly<Record<string, string>>;
  /** The strips shown from their HD image, at 1 / HD_SCALE the scale. */
  private readonly hd: ReadonlySet<string>;
  private shownScale = 1 / ART_SCALE;

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly layer: Layer,
    private readonly mode: RenderMode,
  ) {
    const sheets = playedUrls(art, layer).map(([sheet]) => sheet);
    // Only the body has HD images; the front effects and the rest keep the strip's.
    this.hd = new Set(layer === 'body' ? sheets.filter((sheet) => art.hd?.[sheet]) : []);
    this.keys = Object.fromEntries(
      sheets.map((sheet) => [
        sheet,
        this.hd.has(sheet) ? hdTextureKey(art, sheet) : textureKey(art, sheet, layer),
      ]),
    );
    const first = sheets[0] ?? art.clips.idle.sheet;
    this.sprite = scene.add
      .sprite(0, 0, textureKey(art, first, layer), 0)
      // Positions are in world pixels; each sprite pixel is 1 / ART_SCALE of one.
      .setScale(1 / ART_SCALE);
    this.anchorOn(first, false);
  }

  show(sheet: string, frame: number, x: number, y: number, flip: boolean): void {
    const key = this.keys[sheet] ?? textureKey(this.art, sheet, this.layer);
    if (key !== this.shownKey || frame !== this.shownFrame) this.sprite.setTexture(key, frame);
    // An HD image is HD_SCALE times finer: shown at 1 / HD_SCALE the scale, the same size.
    const scale = this.hd.has(sheet) ? 1 / (ART_SCALE * HD_SCALE) : 1 / ART_SCALE;
    if (scale !== this.shownScale) {
      this.sprite.setScale(scale);
      this.shownScale = scale;
    }
    if (key !== this.shownKey || flip !== this.shownFlip) this.anchorOn(sheet, flip);
    this.shownKey = key;
    this.shownFrame = frame;
    this.shownFlip = flip;
    this.sprite.setPosition(x, y).setFlipX(flip).setVisible(!this.untinted);
  }

  /** Each strip is cropped differently: its anchor, on the side faced, sets the origin. */
  private anchorOn(sheet: string, flip: boolean): void {
    const origin = anchorOrigin(cellOf(this.art, stripName(sheet, this.layer)), flip);
    this.sprite.setOrigin(origin.x, origin.y);
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  setAlpha(alpha: number): this {
    this.sprite.setAlpha(alpha);
    return this;
  }

  /**
   * Draws front effects in their dark look (docs/flashs.md §4), or back in their colors. Without
   * tints, dark, they are not drawn: lit, they would flash beyond the budget.
   */
  dark(dark: boolean): this {
    if (dark === this.darkened) return this;
    this.darkened = dark;
    if (this.mode === 'simple') {
      this.untinted = dark;
      if (dark) this.sprite.setVisible(false);
    } else if (dark) this.sprite.setTint(FX_DARK);
    else this.sprite.clearTint();
    return this;
  }

  /**
   * Darkens the sprite toward a black silhouette (the Finisher's: 0, its colors; 1, black),
   * multiplied over its colors. Without tints, it keeps its colors: the fighter as it always is,
   * never lighter.
   */
  shade(dark: number): this {
    const level = Math.round(255 * (1 - Math.min(1, Math.max(0, dark))));
    if (level === 255) this.sprite.clearTint();
    else this.sprite.setTint(level * 0x010101).setTintMode(Phaser.TintModes.MULTIPLY);
    return this;
  }

  /**
   * Draws the sprite as a flat silhouette of `color` (an afterimage), for good. Without tints, it
   * is not drawn: it would show the fighter in its own colors.
   */
  fill(color: number): this {
    if (this.mode === 'simple') {
      this.untinted = true;
      this.sprite.setVisible(false);
    } else this.sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    return this;
  }

  /** Added onto what is behind it, as a light is (Phaser's ADD blend), for good. */
  added(): this {
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    return this;
  }

  setDepth(depth: number): this {
    this.sprite.setDepth(depth);
    return this;
  }

  /**
   * Its filters (WebGL only): `add` puts them on its internal list and returns the one to keep
   * (presence.ts). Canvas has none: nothing is added, undefined.
   */
  filtered<T>(add: (filters: Phaser.GameObjects.Components.FilterList) => T): T | undefined {
    if (this.mode === 'simple') return undefined;
    const { filters } = this.sprite.enableFilters();
    return filters ? add(filters.internal) : undefined;
  }

  /** Frees its sprite (and its filters). */
  destroy(): void {
    this.sprite.destroy();
  }

  /** Lit by the scene's live lights (light-show.ts), or not. WebGL only: Canvas ignores it. */
  setLighting(on: boolean): this {
    if (this.sprite.lighting !== on) this.sprite.setLighting(on);
    return this;
  }
}
