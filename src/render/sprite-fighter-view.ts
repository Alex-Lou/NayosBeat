import type Phaser from 'phaser';
import { cellOf, type FighterArt } from '../art/types';
import { activeMove } from '../core/combat';
import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import { isActiveFrame } from '../core/moves';
import type { FighterState, RoundState } from '../core/state';
import { AnchoredSprite, stripName, textureKey, type Layer } from './anchored-sprite';
import { clipFrameAt, clipIdOf, clipTickOf } from './animation';
import { DashTrail } from './dash-trail';
import { DEPTH } from './depth';
import { addHitbox, hitboxOf, outlineHurtboxes, placeBox } from './fighter-view';

const SHADOW_WIDTH = 36;
const SHADOW_HEIGHT = 6;
const SHADOW_ALPHA = 0.35;
/** Jump height (px) at which the shadow has shrunk to half its size. */
const SHADOW_HALF_HEIGHT = 120;

/** Loads every strip of `art`, effects included, that is not already in the texture cache. */
export function loadArt(scene: Phaser.Scene, art: FighterArt): void {
  const strips: [string, string, Layer][] = [
    ...Object.entries(art.urls).map(([sheet, url]): [string, string, Layer] => [
      sheet,
      url,
      'body',
    ]),
    ...Object.entries(art.fx ?? {}).map(([sheet, url]): [string, string, Layer] => [
      sheet,
      url,
      'fx',
    ]),
  ];
  for (const [sheet, url, layer] of strips) {
    const key = textureKey(art, sheet, layer);
    if (scene.textures.exists(key)) continue;
    const cell = cellOf(art, stripName(sheet, layer));
    scene.load.spritesheet(key, url, { frameWidth: cell.width, frameHeight: cell.height });
  }
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round), so the animation always matches the frame data. The strips that
 * have front effects play them in step, over both fighters; a dash leaves afterimages in the
 * fighter's energy color (`trailColor`). Boxes show in debug.
 */
export class SpriteFighterView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
  private readonly effects: AnchoredSprite | undefined;
  private readonly trail: DashTrail;
  private readonly hitbox: Phaser.GameObjects.Rectangle | undefined;
  private readonly hurtbox: Phaser.GameObjects.Graphics | undefined;

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly player: 0 | 1,
    private readonly groundY: number,
    trailColor: number,
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
    this.trail = new DashTrail(scene, art, trailColor);
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
    const gliding = isGliding(fighter, template);
    // The round clock counts ticks and stops with the hitstop: the afterimages do too.
    this.trail.update(round.phaseFrame, gliding, clip.sheet, frame, x, this.groundY - height, flip);
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
      if (move?.hitbox) placeBox(this.hitbox, hitboxOf(fighter, move.hitbox), this.groundY);
    }
    if (this.hurtbox) outlineHurtboxes(this.hurtbox, fighter, template, this.groundY);
  }
}

/** On a frame of a dash that moves the fighter (the "active" frames of a movement). */
function isGliding(fighter: FighterState, template: FighterTemplate): boolean {
  const move = fighter.move ? template.moves[fighter.move] : null;
  return move?.kind === 'movement' && isActiveFrame(move, fighter.actionFrame);
}
