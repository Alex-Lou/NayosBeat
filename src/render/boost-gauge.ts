import type Phaser from 'phaser';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';

/** What the gauge writes: no accented capital, the pixel font has none. */
export const BOOST_WORD = 'BOOST';
/** The word, then three segments (docs/combos-v3.md §1.8.6), in view pixels. */
const WORD_WIDTH = 44;
const SEGMENT_WIDTH = 40;
const SEGMENT_HEIGHT = 4;
const SEGMENT_GAP = 3;
const BARS = BOOST_MAX / BOOST_BAR;
/** The gauge is repainted when it moves by this much: 1/20 of a bar. */
export const GAUGE_STEP = 50;
/** Full, the word blinks at 2 Hz (D21: 3 Hz at most): on, then off, for this many ticks. */
export const BLINK_TICKS = 15;

const COLORS = {
  empty: 0x2a2a3a,
  rim: 0xffffff,
  /** A full bar: the Boost's platine. */
  full: 0xffffff,
} as const;
/** The empty segment's rim: white at 25 %. */
const RIM_ALPHA = 0.25;

/** How full each segment is drawn, from the outer one: 0 to GAUGE_STEP steps of 1/20 of a bar. */
export function segmentSteps(boost: number, segment: number): number {
  const inBar = Math.min(BOOST_BAR, Math.max(0, boost - segment * BOOST_BAR));
  return Math.floor(inBar / GAUGE_STEP);
}

/** Whether the word of a full gauge shows on tick `frame`: it blinks. */
export function blinkOn(frame: number): boolean {
  return Math.floor(frame / BLINK_TICKS) % 2 === 0;
}

/**
 * One fighter's Boost gauge on the HUD, under its name on the outer side (docs/combos-v3.md
 * §1.8.6): the word, then three segments that fill away from it, the one filling in the
 * fighter's energy color, the full ones platine white rimmed with it; full, the word turns white
 * and blinks. One text and six rectangles, made once; repainted only when the gauge moves by a
 * step (1/20 of a bar) or the word blinks.
 */
export class BoostGauge {
  private readonly word: Phaser.GameObjects.Text;
  private readonly fills: readonly Phaser.GameObjects.Rectangle[];
  /** The step painted; -1 forces the first paint. */
  private shownStep = -1;
  private shownBlink = true;

  /**
   * `x`: the outer end of the gauge (where the word is), `side`: 1 when it runs right from
   * there (player 1), -1 when it runs left (player 2).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly side: 1 | -1,
    private readonly energy: number,
    wordStyle: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    this.word = fixed(
      scene.add
        .text(x, y, BOOST_WORD, { ...wordStyle, color: hex(energy) })
        .setOrigin(side === 1 ? 0 : 1, 0),
    );
    const fills: Phaser.GameObjects.Rectangle[] = [];
    for (let segment = 0; segment < BARS; segment++) {
      const offset = WORD_WIDTH + segment * (SEGMENT_WIDTH + SEGMENT_GAP);
      const left = side === 1 ? x + offset : x - offset - SEGMENT_WIDTH;
      fixed(
        scene.add
          .rectangle(left, y + 2, SEGMENT_WIDTH, SEGMENT_HEIGHT, COLORS.empty)
          .setStrokeStyle(1, COLORS.rim, RIM_ALPHA)
          .setOrigin(0, 0),
      );
      // Fills from the outer end of its segment, toward the timer.
      const start = side === 1 ? left : left + SEGMENT_WIDTH;
      fills.push(
        fixed(
          scene.add
            .rectangle(start, y + 2, 0, SEGMENT_HEIGHT, energy)
            .setOrigin(side === 1 ? 0 : 1, 0),
        ),
      );
    }
    this.fills = fills;
  }

  /** `frame`: the match clock, which paces the blink. */
  update(boost: number, frame: number): void {
    const full = boost >= BOOST_MAX;
    const blink = !full || blinkOn(frame);
    if (blink !== this.shownBlink) {
      this.word.setAlpha(blink ? 1 : 0.25);
      this.shownBlink = blink;
    }
    const step = Math.floor(boost / GAUGE_STEP);
    if (step === this.shownStep) return;
    const wasFull = this.shownStep * GAUGE_STEP >= BOOST_MAX;
    this.shownStep = step;
    this.fills.forEach((fill, segment) => {
      const steps = segmentSteps(boost, segment);
      const whole = steps * GAUGE_STEP === BOOST_BAR;
      fill
        .setSize((SEGMENT_WIDTH * steps * GAUGE_STEP) / BOOST_BAR, SEGMENT_HEIGHT)
        .setFillStyle(whole ? COLORS.full : this.energy);
      if (whole) fill.setStrokeStyle(1, this.energy);
      else fill.setStrokeStyle();
    });
    // The text is redrawn only as the gauge fills up or leaves full.
    if (full !== wasFull) this.word.setColor(full ? '#ffffff' : hex(this.energy));
  }
}

function fixed<T extends Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>(object: T): T {
  object.setScrollFactor(0);
  object.setDepth(10);
  return object;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
