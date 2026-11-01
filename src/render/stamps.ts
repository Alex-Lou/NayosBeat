import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { textResolution } from './camera-framing';
import { DEPTH } from './depth';
import { COMIC_FONT, comicDrop, comicFill, INK } from './comic-lettering';
import type { HitStyle } from './hit-styles';
import { VIEW_SIZE } from './view';

/**
 * What a stamp says (docs/combat-v2.md §4.5, §7.4): a tech broke free; a blow or a grab caught
 * a fighter recovering (PUNITION), a blow caught one attacking (CONTRE); a Remix (docs/combos-v3.md
 * §1.8.7). The Rewind and the super say their own names (`boostStamp`). In the comic font of
 * the sound words, which has the accented capitals the pixel font lacks.
 */
export const STAMP_TEXTS = {
  tech: 'DÉGAGEMENT !',
  punish: 'PUNITION !',
  counter: 'CONTRE !',
  remix: 'REMIX !',
} as const;
export type StampKind = keyof typeof STAMP_TEXTS;

/** The stamp of a Boost move that says its name: « REWIND ! », « POGO ! », « MÉGABASSE ! ». */
export function boostStamp(name: string): string {
  return `${name.toUpperCase()} !`;
}

const POOL_SIZE = 4;
/**
 * Its size in world pixels; calm (the flashes reduced or off, or a stamp the flash budget held
 * back), smaller: none flashes on its own close up (docs/flashs.md §4).
 */
export const STAMP_SIZE = 15;
export const CALM_STAMP_SIZE = 11;
/** Display frames a stamp stays: it slams in, holds, then fades. */
const LIFE = 54;
const SLAM_FRAMES = 5;
const FADE_FRAMES = 14;
/** How big a stamp slams down from; calm, it does not: it fades in at its size. */
export const SLAM_FROM = 1.6;
const CALM_FADE_IN = 3;
/** Above the point of the impact, in world pixels: over the sound word that pops there. */
const OVER = 46;
const TILT = -0.07;
/** Its inked outline and comic drop, in world pixels. */
export const STAMP_INK = { stroke: 4, drop: 2 } as const;

type Metrics = Phaser.Types.GameObjects.Text.TextMetrics;

/** How a stamp is drawn besides its words: its size over its own, its tilt (radians). */
export interface StampLook {
  readonly size?: number;
  readonly tilt?: number;
}

interface Stamp {
  readonly text: Phaser.GameObjects.Text;
  /** Its size over its own (the Finisher's close up draws them smaller). */
  size: number;
  /** Frames it waits, hidden, before it slams down (after a blow the flash budget muted). */
  wait: number;
  /** Shown this display frame: its wait starts with the next one (`settle`). */
  fresh: boolean;
  /** It fades in at its calm size instead of slamming down. */
  calm: boolean;
  life: number;
}

/**
 * The stamps, « DÉGAGEMENT ! », « PUNITION ! », « CONTRE ! » and the Boost's: slammed over the
 * impact (over the fighter who spends its gauge) in the colors of who earned it, lettered like
 * the sound words, then faded; calm (docs/flashs.md §4), smaller, fading in. A fixed pool, each
 * text drawn once per stamp: nothing is created during a fight.
 */
export class Stamps {
  /** Read at each stamp, so the pause's options apply at once. */
  calm = false;
  private readonly stamps: Stamp[];
  /** Device pixels per world pixel of the texts (the shadow offset is not scaled). */
  private resolution: number;
  private readonly canvasWidth: number;
  /** Measured once per size, slammed then calm: restyling a stamp then redraws it only once. */
  private readonly metrics: readonly [Metrics, Metrics];
  private next = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly styles: readonly [HitStyle, HitStyle],
  ) {
    this.canvasWidth = scene.scale.width;
    this.resolution = textResolution(this.canvasWidth);
    this.stamps = Array.from({ length: POOL_SIZE }, () => ({
      text: scene.add
        .text(0, 0, '', {
          fontFamily: COMIC_FONT,
          fontSize: STAMP_SIZE,
          color: '#ffffff',
          stroke: INK,
          strokeThickness: STAMP_INK.stroke,
          resolution: this.resolution,
          padding: { right: STAMP_INK.drop, bottom: STAMP_INK.drop },
        })
        .setOrigin(0.5, 1)
        .setRotation(TILT)
        .setDepth(DEPTH.words)
        .setVisible(false),
      size: 1,
      wait: 0,
      fresh: false,
      calm: false,
      life: 0,
    }));
    const probe = this.stamps[0]?.text;
    if (!probe) throw new Error('Empty pool');
    this.metrics = [
      { ...probe.setFontSize(STAMP_SIZE).getTextMetrics() },
      { ...probe.setFontSize(CALM_STAMP_SIZE).getTextMetrics() },
    ];
  }

  /**
   * The closest zoom the stamps drawn from now on must stay sharp at (camera-framing.ts): the
   * fight's, or the Finisher's close up while its scene plays.
   */
  setCloseUp(closeUp: number): void {
    this.resolution = textResolution(this.canvasWidth, closeUp);
  }

  /** The stamp that says `words`, if one shows or waits: gone (the Finisher's name replaces it). */
  dismiss(words: string): void {
    for (const stamp of this.stamps) {
      if (stamp.text.text !== words || (stamp.life === 0 && stamp.wait === 0)) continue;
      stamp.life = 0;
      stamp.wait = 0;
      this.place(stamp);
    }
  }

  /**
   * Stamps `words` (a `STAMP_TEXTS` entry, or a Boost move's) for `at.by` over (at.x, at.y)
   * (simulation units), inside the simulation camera whose left edge is `viewLeft` (world
   * pixels), `delay` display frames from the next one (null: never, the flash budget found no
   * room for it); `calm`: at its calm size, fading in, whatever the options; `look`: its size
   * and tilt, when not its own (the Finisher's).
   */
  show(
    words: string,
    at: { readonly by: 0 | 1; readonly x: number; readonly y: number },
    viewLeft: number,
    delay: number | null = 0,
    calm = false,
    look: StampLook = {},
  ): void {
    if (delay === null) return;
    const stamp = this.stamps[this.next];
    if (!stamp) return;
    this.next = (this.next + 1) % this.stamps.length;
    const style = this.styles[at.by];
    const { text } = stamp;
    stamp.calm = calm || this.calm;
    stamp.size = look.size ?? 1;
    text.setRotation(look.tilt ?? TILT);
    text.style.resolution = this.resolution;
    const size = stamp.calm ? CALM_STAMP_SIZE : STAMP_SIZE;
    // Restyled without a redraw, then drawn once with its words.
    const shadow = comicDrop(STAMP_INK.drop, this.resolution, style);
    const metrics = this.metrics[stamp.calm ? 1 : 0];
    text.style.setStyle(
      { fontSize: size, color: comicFill(text, size, style), shadow, metrics },
      false,
    );
    if (text.text === words) text.updateText();
    else text.setText(words);
    const half = (text.width * stamp.size) / 2 + 2;
    const x = Math.min(Math.max(toPx(at.x), viewLeft + half), viewLeft + VIEW_SIZE.width - half);
    text.setPosition(Math.round(x), Math.round(this.groundY - toPx(at.y) - OVER));
    stamp.life = LIFE;
    stamp.wait = delay;
    stamp.fresh = delay > 0;
    this.place(stamp);
  }

  /**
   * Call once each display frame, after its updates (even none): the stamps it holds back start
   * waiting with the next one, on the frame of the visual clock the flash budget kept them for.
   */
  settle(): void {
    for (const stamp of this.stamps) stamp.fresh = false;
  }

  /** Advances the stamps by one step of 1/60 s. */
  update(): void {
    for (const stamp of this.stamps) {
      if (stamp.fresh) continue;
      if (stamp.wait > 0) stamp.wait--;
      else if (stamp.life > 0) stamp.life--;
      else continue;
      this.place(stamp);
    }
  }

  private place(stamp: Stamp): void {
    const { text, life } = stamp;
    if (life === 0 || stamp.wait > 0) {
      text.setVisible(false);
      return;
    }
    const age = LIFE - life;
    // Slammed down from big, like an ink stamp, then still; calm, it fades in at its size.
    const scale =
      !stamp.calm && age < SLAM_FRAMES ? SLAM_FROM - (SLAM_FROM - 1) * (age / SLAM_FRAMES) : 1;
    const fadeIn = stamp.calm ? (age + 1) / CALM_FADE_IN : 1;
    text
      .setScale(scale * stamp.size)
      .setAlpha(Math.min(1, fadeIn, life / FADE_FRAMES))
      .setVisible(true);
  }
}
