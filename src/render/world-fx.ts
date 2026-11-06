import type Phaser from 'phaser';
import type { Clip, FighterArt, WorldEffect } from '../art/types';
import { toPx } from '../core/constants';
import type { GameState } from '../core/state';
import { clipFrameAt } from './animation';
import { AnchoredSprite } from './anchored-sprite';
import { DEPTH } from './depth';
import type { RenderMode } from './render-mode';

/** One effect playing: where it opened, the side it faces and how many ticks it has played. */
interface Playing {
  clip: Clip;
  x: number;
  flip: boolean;
  age: number;
}

/**
 * The effects moves leave fixed in the world (`FighterArt.worldFx`: Feline's portals), standing
 * on the floor where each opened while the fighter moves on. Read in the state on each tick,
 * never written back (D17), played on the match clock: frozen with the hitstop, as the bodies
 * are, nothing interpolated between ticks (D23). Like the body they come from, they ask no flash
 * budget. Every sprite is made with the fight: nothing during it.
 */
export class WorldFx {
  private readonly sprites: readonly [AnchoredSprite[], AnchoredSprite[]];
  private readonly playing: [(Playing | null)[], (Playing | null)[]] = [[], []];
  /** The action frame each player showed on the last tick: an effect opens once, as it is reached. */
  private readonly shownMove: [string | null, string | null] = [null, null];
  private readonly shownFrame: [number, number] = [-1, -1];

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly arts: readonly [FighterArt | undefined, FighterArt | undefined],
    mode: RenderMode,
  ) {
    const spritesOf = (art: FighterArt | undefined): AnchoredSprite[] => {
      if (!art?.worldFx) return [];
      const most = Math.max(...Object.values(art.worldFx).map((effects) => effects.length));
      return Array.from({ length: most }, () => {
        const sprite = new AnchoredSprite(scene, art, 'body', mode).setDepth(DEPTH.effects);
        sprite.hide();
        return sprite;
      });
    };
    this.sprites = [spritesOf(arts[0]), spritesOf(arts[1])];
  }

  /** Reads the tick's state (call once a simulation tick): plays on, opens what it reaches. */
  tick(state: GameState): void {
    for (const by of [0, 1] as const) {
      const effects = this.arts[by]?.worldFx;
      if (!effects) continue;
      const playing = this.playing[by];
      if (state.hitstop === 0) {
        for (const effect of playing) if (effect) effect.age += 1;
      }
      const fighter = state.fighters[by];
      const { move, actionFrame } = fighter;
      const reached = move !== this.shownMove[by] || actionFrame !== this.shownFrame[by];
      this.shownMove[by] = move;
      this.shownFrame[by] = actionFrame;
      if (move && reached) {
        (effects[move] ?? []).forEach((effect: WorldEffect, slot) => {
          if (effect.frame !== actionFrame) return;
          const x = toPx(fighter.x) + fighter.facing * effect.reach;
          playing[slot] = { clip: effect.clip, x, flip: fighter.facing < 0, age: 0 };
        });
      }
      this.show(by);
    }
  }

  private show(by: 0 | 1): void {
    this.sprites[by].forEach((sprite, slot) => {
      const effect = this.playing[by][slot];
      const length = effect ? effect.clip.ticks.reduce((sum, ticks) => sum + ticks, 0) : 0;
      if (!effect || effect.age >= length) {
        this.playing[by][slot] = null;
        sprite.hide();
        return;
      }
      const cell = effect.clip.frames[clipFrameAt(effect.clip, effect.age)] ?? 0;
      sprite.show(effect.clip.sheet, cell, effect.x, this.groundY, effect.flip);
    });
  }
}
