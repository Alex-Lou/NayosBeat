import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import { AnchoredSprite } from './anchored-sprite';
import { DEPTH } from './depth';

/** Afterimages per fighter: a fixed pool, the oldest one recycled. */
const AFTERIMAGES = 3;
/** One afterimage is left every this many ticks of the glide... */
const SPACING_TICKS = 3;
/** ...and fades out over this many ticks. */
const LIFE_TICKS = 9;
const ALPHA = 0.45;

/**
 * The afterimages a dash leaves behind it: silhouettes of the fighter in its energy color, left
 * on the frames the dash glides and fading out. They count the match clock's ticks, so they
 * freeze with the hitstop, and a quiet frame writes nothing.
 */
export class DashTrail {
  private readonly images: readonly AnchoredSprite[];
  /** Clock tick each afterimage was left on; null once it has faded. */
  private readonly born: (number | null)[];
  private next = 0;
  private lastLeft: number | null = null;

  constructor(scene: Phaser.Scene, art: FighterArt, color: number) {
    this.images = Array.from({ length: AFTERIMAGES }, () => {
      const image = new AnchoredSprite(scene, art).setDepth(DEPTH.trail).fill(color);
      image.hide();
      return image;
    });
    this.born = this.images.map(() => null);
  }

  /**
   * `clock`: the match clock, in ticks; `gliding`: whether the fighter is on a frame of a dash
   * that moves it; the rest is the pose it shows.
   */
  update(
    clock: number,
    gliding: boolean,
    sheet: string,
    frame: number,
    x: number,
    y: number,
    flip: boolean,
  ): void {
    // A new round restarts the clock: what was left before is gone (see the ages below).
    if (this.lastLeft !== null && clock < this.lastLeft) this.lastLeft = null;
    const due = this.lastLeft === null || clock - this.lastLeft >= SPACING_TICKS;
    if (gliding && due) {
      this.images[this.next]?.show(sheet, frame, x, y, flip);
      this.born[this.next] = clock;
      this.next = (this.next + 1) % this.images.length;
      this.lastLeft = clock;
    }

    for (let i = 0; i < this.images.length; i++) {
      const born = this.born[i];
      if (born === undefined || born === null) continue;
      const age = clock - born;
      const image = this.images[i];
      if (age < 0 || age >= LIFE_TICKS) {
        image?.hide();
        this.born[i] = null;
      } else {
        image?.setAlpha(ALPHA * (1 - age / LIFE_TICKS));
      }
    }
  }
}
