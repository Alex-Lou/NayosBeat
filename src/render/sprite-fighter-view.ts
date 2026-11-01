import type Phaser from 'phaser';
import { clipOf, effectsOf, type FighterArt } from '../art/types';
import type { FighterTemplate, MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import type { FinisherState } from '../core/finisher';
import { isActiveFrame, moveOf, tierOf } from '../core/moves';
import type { FighterState, GameState } from '../core/state';
import { AnchoredSprite } from './anchored-sprite';
import { clipFrameAt, showFighter, type Shown } from './animation';
import { BoostEcho } from './boost-echo';
import { DashTrail } from './dash-trail';
import { DEPTH } from './depth';
import type { DissolveStyle } from './dissolve';
import { FinisherHalo } from './finisher-halo';
import { FxGate, type FlashBudget } from './flash-budget';
import { FxDissolve } from './fx-dissolve';
import { FxPixels } from './fx-pixels';

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
}

/**
 * A fighter drawn with its sprites. The frame comes from the simulation state alone (action,
 * frame counter, move, round, and the opponent holding or throwing it), so the animation always
 * matches the frame data. The strips that
 * have front effects play them in step, over both fighters; a dash leaves afterimages in the
 * fighter's energy color (`trailColor`), a Boost move white echoes (`BoostEcho`). What the
 * effects of a special, a Remix or a super stop showing dissolves (`FxDissolve`). A clip of
 * effects that would flash beyond the budget plays dark (`FxGate`, docs/flashs.md §4). Its
 * Finisher ready, a halo glows on the floor under its feet (`FinisherHalo`). Its boxes show in
 * the debug view (BoxOverlay).
 */
export class SpriteFighterView {
  private readonly halo: FinisherHalo;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body: AnchoredSprite;
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
    this.trail = new DashTrail(scene, art, trailColor, look.stage);
    this.echo = new BoostEcho(scene, art);
    this.body = new AnchoredSprite(scene, art).setDepth(DEPTH.fighterBack);
    this.effects = art.fx
      ? new AnchoredSprite(scene, art, 'fx').setDepth(DEPTH.effects)
      : undefined;
    this.effects?.hide();
    this.dissolve = art.fx
      ? new FxDissolve(scene, art, look.dissolve, trailColor, false, this.pixels)
      : undefined;
  }

  /**
   * The player's comfort options, at once (the pause's options): `calm`, the flashes reduced or
   * off (one fainter echo, fainter afterimages); `still`, the screen keeping still (the
   * dissolving effects do not drift); either, the Finisher's halo holds its breath.
   */
  setComfort(calm: boolean, still: boolean): void {
    this.echo.calm = calm;
    this.trail.calm = calm;
    this.halo.calm = calm || still;
    if (this.dissolve) this.dissolve.still = still;
  }

  /** Draws this fighter over the other one, or under it. */
  setFront(front: boolean): void {
    this.body.setDepth(front ? DEPTH.fighterFront : DEPTH.fighterBack);
  }

  /**
   * `frames`: display frames of 1/60 s since the last update (the dissolves go by them);
   * `finisher`: the fighter's Finisher signal (finisher-signal.ts).
   */
  update(state: GameState, frames = 1, finisher: FinisherState = 'off'): void {
    const fighter = state.fighters[this.player];
    const template = this.config.fighters[this.player];
    const round = state.round;
    const shown = this.shown;
    showFighter(state, this.player, this.config, this.art, shown);
    const clip = clipOf(this.art, shown.clip);
    const index = clipFrameAt(clip, shown.tick);
    const frame = clip.frames[index] ?? 0;

    const x = toPx(shown.x);
    const height = toPx(fighter.y);
    const flip = fighter.facing < 0;
    this.body.show(clip.sheet, frame, x, this.groundY - height, flip);
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
