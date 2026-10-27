import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { MAX_CLOSE_UP } from './camera-framing';
import { DEPTH } from './depth';
import type { HitStyle } from './hit-styles';
import { COMIC_FONT } from './onomatopoeia';
import { VIEW_SIZE } from './view';

/**
 * What a stamp says (docs/combat-v2.md §4.5): a tech broke free, a grab caught a fighter
 * recovering. In the comic font, which has the accented capitals the pixel font lacks.
 */
export const STAMP_TEXTS = { tech: 'DÉGAGEMENT !', punish: 'PUNITION !' } as const;
export type StampKind = keyof typeof STAMP_TEXTS;

const POOL_SIZE = 4;
const SIZE = 15;
/** Display frames a stamp stays: it slams in, holds, then fades. */
const LIFE = 54;
const SLAM_FRAMES = 5;
const FADE_FRAMES = 14;
/** Above the point of the grab, in world pixels. */
const OVER = 46;
const TILT = -0.07;
const DROP = 2;
const INK = '#150b24';

interface Stamp {
  readonly text: Phaser.GameObjects.Text;
  life: number;
}

/**
 * The stamps of the hold, « DÉGAGEMENT ! » and « PUNITION ! »: slammed over the pair in the
 * colors of who earned it, then faded. A fixed pool, each text drawn once per stamp: nothing is
 * created during a fight.
 */
export class Stamps {
  private readonly stamps: Stamp[];
  /** Device pixels per world pixel of the texts (the shadow offset is not scaled). */
  private readonly resolution: number;
  private next = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly styles: readonly [HitStyle, HitStyle],
  ) {
    this.resolution = Math.ceil((scene.scale.width / VIEW_SIZE.width) * MAX_CLOSE_UP);
    this.stamps = Array.from({ length: POOL_SIZE }, () => ({
      text: scene.add
        .text(0, 0, '', {
          fontFamily: COMIC_FONT,
          fontSize: SIZE,
          color: '#ffffff',
          stroke: INK,
          strokeThickness: 4,
          resolution: this.resolution,
          padding: { right: DROP, bottom: DROP },
        })
        .setOrigin(0.5, 1)
        .setRotation(TILT)
        .setDepth(DEPTH.words)
        .setVisible(false),
      life: 0,
    }));
  }

  /**
   * Stamps `kind` for `at.by` over (at.x, at.y) (simulation units), inside the simulation
   * camera whose left edge is `viewLeft` (world pixels).
   */
  show(
    kind: StampKind,
    at: { readonly by: 0 | 1; readonly x: number; readonly y: number },
    viewLeft: number,
  ): void {
    const stamp = this.stamps[this.next];
    if (!stamp) return;
    this.next = (this.next + 1) % this.stamps.length;
    const style = this.styles[at.by];
    const { text } = stamp;
    // Restyled without a redraw, then drawn once with its words.
    const offset = DROP * this.resolution;
    const drop = hex(style.energy);
    const shadow = { offsetX: offset, offsetY: offset, color: drop, stroke: true, fill: false };
    text.style.setStyle({ color: hex(style.core), shadow }, false);
    if (text.text === STAMP_TEXTS[kind]) text.updateText();
    else text.setText(STAMP_TEXTS[kind]);
    const half = text.width / 2 + 2;
    const x = Math.min(Math.max(toPx(at.x), viewLeft + half), viewLeft + VIEW_SIZE.width - half);
    text.setPosition(Math.round(x), Math.round(this.groundY - toPx(at.y) - OVER));
    stamp.life = LIFE;
    this.place(stamp);
  }

  /** Advances the stamps by one step of 1/60 s. */
  update(): void {
    for (const stamp of this.stamps) {
      if (stamp.life === 0) continue;
      stamp.life--;
      this.place(stamp);
    }
  }

  private place(stamp: Stamp): void {
    const { text, life } = stamp;
    if (life === 0) {
      text.setVisible(false);
      return;
    }
    const age = LIFE - life;
    // Slammed down from big, like an ink stamp, then still.
    const scale = age < SLAM_FRAMES ? 1.6 - 0.6 * (age / SLAM_FRAMES) : 1;
    text
      .setScale(scale)
      .setAlpha(Math.min(1, life / FADE_FRAMES))
      .setVisible(true);
  }
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
