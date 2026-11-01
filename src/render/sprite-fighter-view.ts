import type Phaser from 'phaser';
import { clipOf, effectsOf, type FighterArt } from '../art/types';
import type { FighterTemplate, MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import type { FinisherState } from '../core/finisher';
import { isActiveFrame, moveOf, tierOf } from '../core/moves';
import type { FighterState, GameState } from '../core/state';
import { AnchoredSprite } from './anchored-sprite';
import { clipFrameAt, SHOW_NOW, showFighter, type ShowContext, type Shown } from './animation';
import { BoostEcho } from './boost-echo';
import { DashTrail } from './dash-trail';
import { DEPTH } from './depth';
import type { DissolveStyle } from './dissolve';
import { FinisherHalo } from './finisher-halo';
import { UNSTAGED, type StagedLook } from './finisher-scripts';
import { FxGate, type FlashBudget } from './flash-budget';
import { FxDissolve } from './fx-dissolve';
import { FxPixels } from './fx-pixels';
import { hitShakeOf } from './hit-shake';
import type { RenderMode } from './render-mode';
import type { ShakeMode } from './shake';

/** Where the 1 px outline of a silhouette is drawn: the body, filled, a world pixel each way. */
const OUTLINE = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
/** Just under its body. */
const OUTLINE_DEPTH = 0.01;

const SHADOW_WIDTH = 36;
const SHADOW_HEIGHT = 6;
const SHADOW_ALPHA = 0.35;
/** Jump height (px) at which the shadow has shrunk to half its size. */
const SHADOW_HALF_HEIGHT = 120;

export interface SpriteFighterLook {
  /** How its effects dissolve. */
  readonly dissolve: DissolveStyle;
  /** The stage's large colors: what its effects light, what its calm afterimages stay under. */
  readonly stage: readonly number[];
  /** The fight's flash budget, which its front effects ask (docs/flashs.md §4). */
  readonly budget: FlashBudget;
  /** How the game is drawn: without tints, nothing tinted shows (render-mode.ts). */
  readonly mode: RenderMode;
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round, and the opponent holding or throwing it), so the animation always
 * matches the frame data; struck, the body trembles through the impact freeze (hit-shake.ts).
 * The strips that have front effects play them in step, over both fighters; a dash leaves
 * afterimages in the fighter's energy color (`trailColor`), a Boost move white echoes
 * (`BoostEcho`). What the effects of a special, a Remix or a super stop showing dissolves
 * (`FxDissolve`). A clip of effects that would flash beyond the budget plays dark (`FxGate`,
 * docs/flashs.md §4). Its Finisher ready, a halo glows on the floor under its feet
 * (`FinisherHalo`). The Finisher's scene may impose a pose on its own clock, lifted, and turn it
 * into a black silhouette, outlined in its energy (`StagedLook`, finisher-scene.ts); its effects
 * and their dissolve follow the pose shown. Its boxes show in the debug view (BoxOverlay).
 */
export class SpriteFighterView {
  private readonly halo: FinisherHalo;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
  /** The silhouette's outline: the body filled, drawn around it. */
  private readonly outline: readonly AnchoredSprite[];
  private outlineColor: number | null = null;
  private readonly effects: AnchoredSprite | undefined;
  private readonly trail: DashTrail;
  private readonly echo: BoostEcho;
  private readonly dissolve: FxDissolve | undefined;
  private readonly pixels: FxPixels;
  private readonly gate = new FxGate();
  private readonly budget: FlashBudget;
  /** Reused every frame. */
  private readonly shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  /** Where the body stood the frame before: its effects' pixels compare only in place. */
  private readonly before = { x: Number.NaN, y: Number.NaN, flip: false };
  /** The player's « Tremblement de l'écran »: how far a struck body trembles. */
  private shake: ShakeMode = 'normal';

  constructor(
    scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly player: 0 | 1,
    private readonly groundY: number,
    trailColor: number,
    private readonly config: MatchConfig,
    look: SpriteFighterLook,
  ) {
    this.budget = look.budget;
    this.pixels = new FxPixels(scene, art, look.stage);
    // Under the shadow: the glow shows around the feet.
    this.halo = new FinisherHalo(scene, groundY, trailColor, look.stage);
    this.shadow = scene.add.ellipse(
      0,
      groundY,
      SHADOW_WIDTH,
      SHADOW_HEIGHT,
      0x000000,
      SHADOW_ALPHA,
    );
    const { mode } = look;
    this.trail = new DashTrail(scene, art, trailColor, look.stage, mode);
    this.echo = new BoostEcho(scene, art, mode);
    this.body = new AnchoredSprite(scene, art, 'body', mode).setDepth(DEPTH.fighterBack);
    this.outline = OUTLINE.map(() => {
      const sprite = new AnchoredSprite(scene, art, 'body', mode).setDepth(
        DEPTH.fighterBack - OUTLINE_DEPTH,
      );
      sprite.hide();
      return sprite;
    });
    this.effects = art.fx
      ? new AnchoredSprite(scene, art, 'fx', mode).setDepth(DEPTH.effects)
      : undefined;
    this.effects?.hide();
    this.dissolve = art.fx
      ? new FxDissolve(scene, art, look.dissolve, trailColor, false, mode, this.pixels)
      : undefined;
  }

  /**
   * The player's comfort options, at once (the pause's options): `calm`, the flashes reduced or
   * off (one fainter echo, fainter afterimages); `shake`, how far things shake (a struck body
   * trembles less, or not at all), off keeping the screen still (the dissolving effects do not
   * drift either); calm or still, the Finisher's halo holds its breath.
   */
  setComfort(calm: boolean, shake: ShakeMode): void {
    this.echo.calm = calm;
    this.trail.calm = calm;
    const still = shake === 'off';
    this.shake = shake;
    this.halo.calm = calm || still;
    if (this.dissolve) this.dissolve.still = still;
  }

  /** Draws this fighter over the other one, or under it. */
  setFront(front: boolean): void {
    const depth = front ? DEPTH.fighterFront : DEPTH.fighterBack;
    this.body.setDepth(depth);
    for (const sprite of this.outline) sprite.setDepth(depth - OUTLINE_DEPTH);
  }

  /**
   * `frames`: display frames of 1/60 s since the last update (the dissolves go by them);
   * `finisher`: the fighter's Finisher signal (finisher-signal.ts); `context`: the animation's
   * options and the fight's memory (FightScene); `staged`: what the Finisher's scene imposes.
   */
  update(
    state: GameState,
    frames = 1,
    finisher: FinisherState = 'off',
    context: ShowContext = SHOW_NOW,
    staged: StagedLook = UNSTAGED,
  ): void {
    const fighter = state.fighters[this.player];
    const template = this.config.fighters[this.player];
    const round = state.round;
    const shown = this.shown;
    showFighter(state, this.player, this.config, this.art, shown, context);
    // The scene's pose prevails over the death, the reaction and the rest.
    if (staged.pose) {
      shown.clip = staged.pose.clip;
      shown.tick = staged.pose.tick;
    }
    const clip = clipOf(this.art, shown.clip);
    const index = clipFrameAt(clip, shown.tick);
    const frame = clip.frames[index] ?? 0;

    const x = toPx(shown.x);
    const height = toPx(fighter.y) + (staged.pose?.lift ?? 0);
    const flip = fighter.facing < 0;
    // The body alone trembles: its shadow, afterimages and effects stay where the game has it.
    const trembling = hitShakeOf(state, this.player, context, this.shake);
    this.body.show(clip.sheet, frame, x + trembling, this.groundY - height, flip);
    this.body.shade(staged.silhouette);
    this.showOutline(staged, clip.sheet, frame, x + trembling, this.groundY - height, flip);
    const gliding = isGliding(fighter, template);
    // The round clock counts ticks and stops with the hitstop: the afterimages do too.
    const y = this.groundY - height;
    this.trail.update(round.phaseFrame, gliding, clip.sheet, frame, x, y, flip);
    this.echo.update(
      round.phaseFrame,
      isBoosting(fighter, template),
      clip.sheet,
      frame,
      x,
      y,
      flip,
    );
    if (this.effects) {
      const effects = effectsOf(clip);
      const shows = this.art.fx?.[effects] !== undefined;
      // Whether they would flash is asked of the frame shown, contact or not (a super blocked):
      // what it lights anew over the frame before, all it lights if the body moved or turned.
      const before = this.before;
      const still = before.x === x && before.y === y && before.flip === flip;
      const lit = (from: number): number =>
        this.pixels.lightsAnew(effects, still ? from : -1, frame) ?? 0;
      const dark = this.gate.show(this.budget, shows ? effects : null, index, frame, lit);
      if (shows) this.effects.dark(dark).show(effects, frame, x, y, flip);
      else this.effects.hide();
      const move = fighter.move ? moveOf(template, fighter.move) : null;
      this.dissolve?.follow(
        shows ? { sheet: effects, frame, x, y, flip } : null,
        move !== null && tierOf(move) >= 1,
        frames,
        dark,
      );
    }
    this.before.x = x;
    this.before.y = y;
    this.before.flip = flip;
    const shrink = SHADOW_HALF_HEIGHT / (SHADOW_HALF_HEIGHT + height);
    this.shadow.setPosition(x, this.groundY).setScale(shrink);
    this.halo.update(x, finisher, state.frame);
  }

  /** The silhouette's outline, as dark as the body is: around its pose, in `staged.outline`. */
  private showOutline(
    staged: StagedLook,
    sheet: string,
    frame: number,
    x: number,
    y: number,
    flip: boolean,
  ): void {
    const { outline, silhouette } = staged;
    if (outline === null || silhouette <= 0) {
      for (const sprite of this.outline) sprite.hide();
      return;
    }
    if (outline !== this.outlineColor) {
      for (const sprite of this.outline) sprite.fill(outline);
      this.outlineColor = outline;
    }
    this.outline.forEach((sprite, index) => {
      const [dx, dy] = OUTLINE[index] ?? [0, 0];
      sprite.setAlpha(silhouette).show(sheet, frame, x + dx, y + dy, flip);
    });
  }
}

/** Playing a move that spends the Boost gauge (a Remix, the Rewind, the super). */
function isBoosting(fighter: FighterState, template: FighterTemplate): boolean {
  return fighter.move !== null && (moveOf(template, fighter.move).boostCost ?? 0) > 0;
}

/** On a frame of a dash that moves the fighter (the "active" frames of a movement). */
function isGliding(fighter: FighterState, template: FighterTemplate): boolean {
  const move = fighter.move ? moveOf(template, fighter.move) : null;
  return move?.kind === 'movement' && isActiveFrame(move, fighter.actionFrame);
}
