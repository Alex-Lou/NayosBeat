import type Phaser from 'phaser';
import { ART_SCALE, cellOf, playedSheets, type FighterArt } from '../art/types';
import { activeMove, hitboxInWorld, hurtboxInWorld } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import type { FighterState, RoundState } from '../core/state';
import { clipFrameAt, clipIdOf, clipTickOf } from './animation';
import { DEPTH } from './depth';
import { addHitbox, outlineBox, placeBox } from './fighter-view';

const SHADOW_WIDTH = 36;
const SHADOW_HEIGHT = 6;
const SHADOW_ALPHA = 0.35;
/** Jump height (px) at which the shadow has shrunk to half its size. */
const SHADOW_HALF_HEIGHT = 120;

/** A fighter's strips: its body, or the front effects drawn over both fighters. */
export type Layer = 'body' | 'fx';

/** Name of a strip's image: the strip itself, or `fx/` and the strip for its front effects. */
export function stripName(sheet: string, layer: Layer = 'body'): string {
  return layer === 'fx' ? `fx/${sheet}` : sheet;
}

export function textureKey(art: FighterArt, sheet: string, layer: Layer = 'body'): string {
  return `${art.key}/${stripName(sheet, layer)}`;
}

/** Image URL of each strip of one layer that a clip plays, by sheet (the others never show). */
function playedUrls(art: FighterArt, layer: Layer): [sheet: string, url: string][] {
  const played = playedSheets(art);
  const urls = layer === 'fx' ? (art.fx ?? {}) : art.urls;
  return Object.entries(urls).filter(([sheet]) => played.has(sheet));
}

/**
 * Loads every strip of `art` that a clip plays, effects included, that is not already in the
 * texture cache.
 */
export function loadArt(scene: Phaser.Scene, art: FighterArt): void {
  for (const layer of ['body', 'fx'] as const) {
    for (const [sheet, url] of playedUrls(art, layer)) {
      const key = textureKey(art, sheet, layer);
      if (scene.textures.exists(key)) continue;
      const cell = cellOf(art, stripName(sheet, layer));
      scene.load.spritesheet(key, url, { frameWidth: cell.width, frameHeight: cell.height });
    }
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
    private readonly layer: Layer = 'body',
  ) {
    const sheets = playedUrls(art, layer).map(([sheet]) => sheet);
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

  setDepth(depth: number): this {
    this.sprite.setDepth(depth);
    return this;
  }
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round), so the animation always matches the frame data. The strips that
 * have front effects play them in step, over both fighters. Boxes show in debug.
 */
export class SpriteFighterView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
  private readonly effects: AnchoredSprite | undefined;
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
    this.body = new AnchoredSprite(scene, art).setDepth(DEPTH.fighterBack);
    this.effects = art.fx
      ? new AnchoredSprite(scene, art, 'fx').setDepth(DEPTH.effects)
      : undefined;
    this.effects?.hide();
    this.hitbox = showBoxes ? addHitbox(scene).setDepth(DEPTH.debug) : undefined;
    this.hurtbox = showBoxes ? scene.add.graphics().setDepth(DEPTH.debug) : undefined;
  }

  /** Draws this fighter over the other one, or under it. */
  setFront(front: boolean): void {
    this.body.setDepth(front ? DEPTH.fighterFront : DEPTH.fighterBack);
  }

  update(fighter: FighterState, template: FighterTemplate, round: RoundState): void {
    const id = clipIdOf(fighter, this.player, round);
    const clip = this.art.clips[id];
    const frame = clip.frames[clipFrameAt(clip, clipTickOf(id, fighter, round))] ?? 0;

    const x = toPx(fighter.x);
    const height = toPx(fighter.y);
    const flip = fighter.facing < 0;
    this.body.show(clip.sheet, frame, x, this.groundY - height, flip);
    if (this.effects) {
      if (this.art.fx?.[clip.sheet] !== undefined) {
        this.effects.show(clip.sheet, frame, x, this.groundY - height, flip);
      } else {
        this.effects.hide();
      }
    }
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
