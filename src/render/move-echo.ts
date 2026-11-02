import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import { AnchoredSprite } from './anchored-sprite';
import { DEPTH } from './depth';
import { addAlphaFor } from './luminance';
import type { RenderMode } from './render-mode';
import type { MoveEchoSpec } from './signatures';
import { CALM_DELTA, VEIL_DELTA } from './veils';

/** Afterimages per fighter: a fixed pool, the oldest one recycled. */
const IMAGES = 6;

/**
 * The afterimages of a signature special (docs/art/nayo-vfx.md §3): silhouettes of the fighter in
 * its energy, added over what is behind it as neon would be, left every few ticks of the move's
 * frames (`MoveEchoSpec`) and fading. They count the match clock's ticks: they freeze with the
 * hitstop, and a quiet frame writes nothing. Never a flash: those showing together, added up,
 * raise the stage by VEIL_DELTA at most (CALM_DELTA with the flashes calm), over every one of its
 * colors, the newest the brightest. Drawn without tints (`mode` simple), none shows.
 */
export class MoveEcho {
  /** Read every frame, so the pause's options apply at once. */
  calm = false;
  private readonly images: readonly AnchoredSprite[];
  /** Clock tick each afterimage was left on; null once it has faded. */
  private readonly born: (number | null)[];
  private next = 0;
  private lastLeft: number | null = null;
  /** Ticks the afterimages of the last move fade over. */
  private life = 9;
  /** The most opacity all the afterimages showing may add up to, normal and calm. */
  private readonly total: readonly [number, number];

  constructor(
    scene: Phaser.Scene,
    art: FighterArt,
    color: number,
    stage: readonly number[],
    mode: RenderMode,
  ) {
    this.total = [addAlphaFor(color, stage, VEIL_DELTA), addAlphaFor(color, stage, CALM_DELTA)];
    this.images = Array.from({ length: IMAGES }, () => {
      const image = new AnchoredSprite(scene, art, 'body', mode)
        .setDepth(DEPTH.trail)
        .fill(color)
        .added();
      image.hide();
      return image;
    });
    this.born = this.images.map(() => null);
  }

  /**
   * `clock`: the match clock, in ticks; `spec`: the afterimages of the move played (null: none),
   * at action frame `frame`; the rest is the pose it shows.
   */
  update(
    clock: number,
    spec: MoveEchoSpec | null,
    frame: number,
    sheet: string,
    cell: number,
    x: number,
    y: number,
    flip: boolean,
  ): void {
    // A new round restarts the clock: what was left before is gone (see the ages below).
    if (this.lastLeft !== null && clock < this.lastLeft) this.lastLeft = null;
    const due = this.lastLeft === null || clock - this.lastLeft >= (spec?.every ?? 1);
    if (spec && frame >= spec.from && frame <= spec.to && due) {
      this.images[this.next]?.show(sheet, cell, x, y, flip);
      this.born[this.next] = clock;
      this.next = (this.next + 1) % this.images.length;
      this.lastLeft = clock;
    }
    if (spec) this.life = spec.life;
    const { life } = this;
    // What each one's opacity is against the newest's: their sum shares the total.
    let weights = 0;
    for (const born of this.born) {
      if (born !== null && clock - born >= 0 && clock - born < life) {
        weights += 1 - (clock - born) / life;
      }
    }
    const total = this.total[this.calm ? 1 : 0];
    for (let i = 0; i < this.images.length; i++) {
      const born = this.born[i];
      if (born === undefined || born === null) continue;
      const age = clock - born;
      const image = this.images[i];
      if (age < 0 || age >= life) {
        image?.hide();
        this.born[i] = null;
      } else {
        image?.setAlpha((total * (1 - age / life)) / Math.max(1, weights));
      }
    }
  }
}
