import type Phaser from 'phaser';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';
import {
  barsOf,
  BREAK_TICKS,
  freshBoost,
  isDraining,
  isFull,
  LEVEL_UP_TICKS,
  stepBoost,
  type BoostMotion,
} from './boost-motion';
import {
  mirrored,
  mix,
  moved,
  paintSpans,
  tubeBox,
  tubeOutline,
  tubeRowStart,
  type Span,
} from './hud-paint';

/**
 * One fighter's Boost gauge on the HUD, under its name (docs/combos-v3.md §1.8.6,
 * docs/art/direction-hud.md): the number of bars in a capsule, then one tube where the bars
 * stack, each over the last in its own color (Marvel vs. Capcom 2, Dragon Ball FighterZ): the
 * fighter's energy, lighter, then the Boost's platine. Full, the word turns from BOOST to MAX
 * (King of Fighters XV) and a shine runs over the tube. It fills rather than jumps, a light sweeps
 * over the bar it completes, a spend drains fast, and a KO shatters it into squares (King of
 * Fighters XV) until the next round, its Boost kept.
 */

/** What the gauge writes: no accented capital, the pixel font has none. */
export const BOOST_WORD = 'BOOST';
export const MAX_WORD = 'MAX';
/** Full, the word blinks at 2 Hz (D21: 3 Hz at most): on, then off, for this many ticks. */
export const BLINK_TICKS = 15;

const ROWS = 6;
/** The tube's length: each bar fills all of it, the next stacking over it (a pixel for 10 Boost). */
export const GAUGE_LENGTH = 100;
const BOX = tubeBox(ROWS, GAUGE_LENGTH);
/** The capsule of the number, then the tube, then the word, in view pixels. */
const CAPSULE = { width: 12, height: 10 } as const;
const TUBE_X = CAPSULE.width + 2;
const TUBE_Y = 1;
export const WORD_X = TUBE_X + BOX.width + 3;
/** The whole gauge, from its outer end. */
export const GAUGE_WIDTH = WORD_X + 40;
/** Ticks of the shine running over a full gauge, and of the wait before the next one. */
const SHINE_TICKS = 24;
const SHINE_EVERY = 90;
/** Squares a KO breaks the tube into: 4 pixels by 3 rows. */
const SHARD = { width: 4, height: 3 } as const;

const OUTLINE = 0x0c0612;
const BROKEN = 0x3a3448;
const EMPTY = [0x0e0818, 0x1c1228, 0x1c1228, 0x1c1228, 0x160e22, 0x0e0818] as const;
/** The Boost's platine (docs/combos-v3.md §1.8.7), never gold. */
const PLATINE = [0xffffff, 0xffffff, 0xf2f6ff, 0xf2f6ff, 0xc9d6e8, 0xa8b6cc] as const;

/** A tube's rows in `color`: a light rim, the core, a shadow. */
function rampOf(color: number): readonly number[] {
  return [
    mix(color, 0xffffff, 0.6),
    mix(color, 0xffffff, 0.3),
    color,
    color,
    mix(color, 0x000000, 0.25),
    mix(color, 0x000000, 0.5),
  ];
}

/** Each bar's rows, the first to the third: the energy, lighter, the platine. */
export function layersOf(energy: number): readonly (readonly number[])[] {
  return [rampOf(energy), rampOf(mix(energy, PLATINE[2], 0.55)), PLATINE];
}

/** The number's color for a count of bars: grey for none, then each bar's core. */
export function levelColor(energy: number, bars: number): number {
  if (bars === 0) return 0x6a6080;
  return layersOf(energy)[bars - 1]?.[2] ?? PLATINE[2];
}

/** Whether the word of a full gauge shows on tick `frame`: it blinks. */
export function blinkOn(frame: number): boolean {
  return Math.floor(frame / BLINK_TICKS) % 2 === 0;
}

export interface GaugeLook {
  /** 0: the left player (the gauge runs right from the screen's edge), 1: the right one. */
  readonly side: 0 | 1;
  readonly energy: number;
  /** No sweep, no shine, no shards, no blink (prefers-reduced-motion). */
  readonly reducedMotion: boolean;
}

/** Pixels of the tube that `boost` fills within its bar. */
function partOf(shown: number): number {
  if (shown >= BOOST_MAX) return GAUGE_LENGTH;
  return Math.floor(((shown % BOOST_BAR) * GAUGE_LENGTH) / BOOST_BAR);
}

/** Where a light sweeps on tick `frame`, from the outer end, or -1: a bar just completed, a full gauge's shine. */
function sweepOf(motion: BoostMotion, look: GaugeLook, frame: number): number {
  if (look.reducedMotion || motion.broken >= 0) return -1;
  // From the outer end to the inner one, the light (3 px) all inside the tube.
  const course = GAUGE_LENGTH - 3;
  if (motion.levelUp > 0) {
    return Math.floor(((LEVEL_UP_TICKS - motion.levelUp) * course) / (LEVEL_UP_TICKS - 1));
  }
  if (!isFull(motion)) return -1;
  const age = frame % SHINE_EVERY;
  return age < SHINE_TICKS ? Math.floor((age * course) / (SHINE_TICKS - 1)) : -1;
}

/** What the gauge shows: it is repainted only when this changes. */
export function gaugePaintKey(motion: BoostMotion, look: GaugeLook, frame: number): string {
  const broken = motion.broken < 0 ? -1 : look.reducedMotion ? BREAK_TICKS : motion.broken;
  return [
    barsOf(motion.shown),
    partOf(motion.shown),
    isDraining(motion),
    sweepOf(motion, look, frame),
    broken,
  ].join(' ');
}

/** The color of row `row` of the tube at `along` pixels from its outer end. */
function inkAt(motion: BoostMotion, energy: number, row: number, along: number): number {
  const layers = layersOf(energy);
  const bars = barsOf(motion.shown);
  const filling = bars < layers.length && along < partOf(motion.shown);
  const layer = filling ? layers[bars] : bars > 0 ? layers[Math.min(bars, 3) - 1] : EMPTY;
  return layer?.[row] ?? OUTLINE;
}

/**
 * The gauge's spans at tick `frame`, from its outer end: the capsule, then the tube (the number
 * and the word are texts, see BoostGauge). Drawn for the left player, mirrored for the right one.
 */
export function gaugeSpans(motion: BoostMotion, look: GaugeLook, frame: number): Span[] {
  const bars = barsOf(motion.shown);
  const broken = motion.broken >= 0;
  const rim = broken ? BROKEN : levelColor(look.energy, bars);
  const spans: Span[] = [
    { x: 0, y: 0, width: CAPSULE.width, height: CAPSULE.height, color: rim },
    { x: 1, y: 1, width: CAPSULE.width - 2, height: CAPSULE.height - 2, color: OUTLINE },
  ];
  const tube: Span[] = tubeOutline(
    ROWS,
    GAUGE_LENGTH,
    broken ? BROKEN : look.energy,
    broken ? BROKEN : OUTLINE,
  );
  const part = partOf(motion.shown);
  for (let row = 0; row < ROWS; row++) {
    const start = tubeRowStart(ROWS, row);
    const y = row + 1;
    if (broken) {
      tube.push({ x: start, y, width: GAUGE_LENGTH, height: 1, color: EMPTY[row] ?? OUTLINE });
      continue;
    }
    // Runs of one color along the row: the bar filling, then the one under it.
    const split = bars >= 3 ? GAUGE_LENGTH : part;
    tube.push({ x: start, y, width: split, height: 1, color: inkAt(motion, look.energy, row, 0) });
    tube.push({
      x: start + split,
      y,
      width: GAUGE_LENGTH - split,
      height: 1,
      color: inkAt(motion, look.energy, row, GAUGE_LENGTH - 1),
    });
    // The front of the bar filling: white while a spend drains it, a pixel lighter otherwise;
    // over a bar, a dark pixel after it, for the bars' colors are close in lightness.
    if (split > 0 && split < GAUGE_LENGTH) {
      const front = isDraining(motion)
        ? 0xffffff
        : mix(inkAt(motion, look.energy, row, 0), 0xffffff, 0.5);
      const width = isDraining(motion) ? Math.min(2, split) : 1;
      tube.push({ x: start + split - width, y, width, height: 1, color: front });
      if (bars >= 1) tube.push({ x: start + split, y, width: 1, height: 1, color: OUTLINE });
    }
  }
  const sweep = sweepOf(motion, look, frame);
  if (sweep >= 0) {
    for (let row = 0; row < ROWS; row++) {
      // Three pixels wide at the same place along every row: slanted like the tube.
      const x = tubeRowStart(ROWS, row) + sweep;
      tube.push({ x, y: row + 1, width: 3, height: 1, color: 0xffffff, alpha: 0.8 });
    }
  }
  if (broken && !look.reducedMotion) tube.push(...shards(motion, look.energy));
  spans.push(...moved(tube, TUBE_X, TUBE_Y));
  return look.side === 0 ? spans : spans.map((span) => mirrored(span, GAUGE_WIDTH));
}

/**
 * The tube in squares flying apart, `motion.broken` ticks after the KO: each falls its own way
 * (a fixed spread, the same every time) and fades out over BREAK_TICKS.
 */
function shards(motion: BoostMotion, energy: number): Span[] {
  const age = motion.broken;
  const fade = 1 - age / BREAK_TICKS;
  if (fade <= 0) return [];
  const spans: Span[] = [];
  for (let column = 0; column < GAUGE_LENGTH / SHARD.width; column++) {
    for (let band = 0; band < ROWS / SHARD.height; band++) {
      const vx = (((column * 7 + band * 13) % 5) - 2) * 0.25;
      const vy = -0.8 - ((column + band * 2) % 3) * 0.35;
      const row = band * SHARD.height;
      const along = column * SHARD.width;
      spans.push({
        x: tubeRowStart(ROWS, row + 1) + along + Math.round(vx * age),
        y: row + 1 + Math.round(vy * age + 0.06 * age * age),
        width: SHARD.width,
        height: SHARD.height,
        color: inkAt(motion, energy, row + 1, along),
        alpha: fade,
      });
    }
  }
  return spans;
}

/**
 * The gauge's view: one Graphics for the capsule and the tube, two texts (the number, the word),
 * made once; the Graphics is repainted only when what it shows changes, the texts only when
 * their content does.
 */
export class BoostGauge {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly count: Phaser.GameObjects.Text;
  private readonly word: Phaser.GameObjects.Text;
  private motion: BoostMotion = freshBoost(0);
  private painted = '';

  /** `x`: the outer end of the gauge (the screen's edge side), `y`: its top. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly look: GaugeLook,
    textStyle: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    const left = look.side === 0 ? x : x - GAUGE_WIDTH;
    this.graphics = scene.add.graphics({ x: left, y }).setScrollFactor(0).setDepth(10);
    const countX = look.side === 0 ? x + 2 : x - CAPSULE.width + 2;
    this.count = scene.add
      .text(countX, y + 1, '0', { ...textStyle, strokeThickness: 0 })
      .setScrollFactor(0)
      .setDepth(10);
    const wordX = look.side === 0 ? x + WORD_X : x - WORD_X;
    this.word = scene.add
      .text(wordX, y + 1, BOOST_WORD, { ...textStyle, color: hex(look.energy) })
      .setOrigin(look.side === 0 ? 0 : 1, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  /** `knockedOut`: from the fighter's KO to the next round; `frame`: the match clock. */
  update(boost: number, knockedOut: boolean, frame: number): void {
    this.motion = stepBoost(this.motion, boost, knockedOut, frame);
    const motion = this.motion;
    const key = gaugePaintKey(motion, this.look, frame);
    if (key !== this.painted) {
      this.painted = key;
      paintSpans(this.graphics, gaugeSpans(motion, this.look, frame));
    }
    const bars = barsOf(motion.shown);
    const broken = motion.broken >= 0;
    setIfChanged(this.count, String(bars), hex(levelColor(this.look.energy, bars)));
    this.count.setAlpha(broken ? 0.4 : 1);
    const full = isFull(motion) && !broken;
    setIfChanged(
      this.word,
      full ? MAX_WORD : BOOST_WORD,
      full ? hex(PLATINE[0]) : hex(broken ? BROKEN : this.look.energy),
    );
    this.word.setAlpha(full && !this.look.reducedMotion && !blinkOn(frame) ? 0.25 : 1);
  }
}

/** Re-rendering a text is costly: only when its content or color changes. */
function setIfChanged(text: Phaser.GameObjects.Text, value: string, color: string): void {
  if (text.text !== value) text.setText(value);
  if (text.style.color !== color) text.setColor(color);
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
