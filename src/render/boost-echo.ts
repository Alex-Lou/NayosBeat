import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import { AnchoredSprite } from './anchored-sprite';
import { DEPTH } from './depth';

/** The Boost's platine: the silhouettes are white whoever spends. */
const COLOR = 0xffffff;
/** How many ticks behind each echo is, and how strongly it shows (docs/combos-v3.md §1.8.7). */
const ECHOES = [
  { back: 3, alpha: 0.35 },
  { back: 6, alpha: 0.18 },
] as const;
/** Poses remembered: as far back as the last echo. */
const HISTORY = 7;

/**
 * The two echoes of a Boost move: white silhouettes of the fighter as it was 3 and 6 ticks
 * before, while it plays a move that spends the gauge (a Remix, the Rewind, the super). They
 * count the match clock's ticks, so they freeze with the hitstop and the flash. Everything is
 * created up front, and a frame without a Boost move only hides them.
 */
export class BoostEcho {
  private readonly images: readonly AnchoredSprite[];
  /** The poses of the last ticks, by clock tick modulo HISTORY, and the tick each one is of. */
  private readonly ticks = new Array<number>(HISTORY).fill(-1);
  private readonly sheets = new Array<string>(HISTORY).fill('');
  private readonly frames = new Array<number>(HISTORY).fill(0);
  private readonly xs = new Array<number>(HISTORY).fill(0);
  private readonly ys = new Array<number>(HISTORY).fill(0);
  private readonly flips = new Array<boolean>(HISTORY).fill(false);

  constructor(scene: Phaser.Scene, art: FighterArt) {
    this.images = ECHOES.map(() => {
      const image = new AnchoredSprite(scene, art).setDepth(DEPTH.trail).fill(COLOR);
      image.hide();
      return image;
    });
  }

  /**
   * `clock`: the match clock, in ticks; `boosting`: whether the fighter plays a Boost move; the
   * rest is the pose it shows.
   */
  update(
    clock: number,
    boosting: boolean,
    sheet: string,
    frame: number,
    x: number,
    y: number,
    flip: boolean,
  ): void {
    const slot = clock % HISTORY;
    this.ticks[slot] = clock;
    this.sheets[slot] = sheet;
    this.frames[slot] = frame;
    this.xs[slot] = x;
    this.ys[slot] = y;
    this.flips[slot] = flip;

    for (let index = 0; index < ECHOES.length; index++) {
      const image = this.images[index];
      const echo = ECHOES[index];
      if (!image || !echo) continue;
      const tick = clock - echo.back;
      const past = tick % HISTORY;
      // Only a pose of that very tick: nothing older shows (a new round restarts the clock).
      if (!boosting || tick < 0 || this.ticks[past] !== tick) {
        image.hide();
        continue;
      }
      image
        .setAlpha(echo.alpha)
        .show(
          this.sheets[past] ?? sheet,
          this.frames[past] ?? frame,
          this.xs[past] ?? x,
          this.ys[past] ?? y,
          this.flips[past] ?? flip,
        );
    }
  }
}
