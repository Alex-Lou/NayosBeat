import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import type { FighterTemplate, MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { isActiveFrame } from '../core/moves';
import type { FighterState, GameState } from '../core/state';
import { AnchoredSprite } from './anchored-sprite';
import { clipFrameAt, showFighter, type Shown } from './animation';
import { DashTrail } from './dash-trail';
import { DEPTH } from './depth';

const SHADOW_WIDTH = 36;
const SHADOW_HEIGHT = 6;
const SHADOW_ALPHA = 0.35;
/** Jump height (px) at which the shadow has shrunk to half its size. */
const SHADOW_HALF_HEIGHT = 120;

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round, and the opponent holding or throwing it), so the animation always
 * matches the frame data. The strips that
 * have front effects play them in step, over both fighters; a dash leaves afterimages in the
 * fighter's energy color (`trailColor`). Its boxes show in the debug view (BoxOverlay).
 */
export class SpriteFighterView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
  private readonly effects: AnchoredSprite | undefined;
  private readonly trail: DashTrail;
  /** Reused every frame. */
  private readonly shown: Shown = { clip: 'idle', tick: 0, x: 0 };

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly player: 0 | 1,
    private readonly groundY: number,
    trailColor: number,
    private readonly config: MatchConfig,
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
  }

  /** Draws this fighter over the other one, or under it. */
  setFront(front: boolean): void {
    this.body.setDepth(front ? DEPTH.fighterFront : DEPTH.fighterBack);
  }

  update(state: GameState): void {
    const fighter = state.fighters[this.player];
    const template = this.config.fighters[this.player];
    const round = state.round;
    const shown = this.shown;
    showFighter(state, this.player, this.config, this.art, shown);
    const clip = this.art.clips[shown.clip];
    const frame = clip.frames[clipFrameAt(clip, shown.tick)] ?? 0;

    const x = toPx(shown.x);
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
  }
}

/** On a frame of a dash that moves the fighter (the "active" frames of a movement). */
function isGliding(fighter: FighterState, template: FighterTemplate): boolean {
  const move = fighter.move ? template.moves[fighter.move] : null;
  return move?.kind === 'movement' && isActiveFrame(move, fighter.actionFrame);
}
