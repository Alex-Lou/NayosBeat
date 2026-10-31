import type Phaser from 'phaser';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';
import {
  barsOf,
  BREAK_TICKS,
  CRACK_TICKS,
  freshBoost,
  isCracked,
  isDraining,
  isFull,
  isShattered,
  type Breakage,
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
import type { HudComfort } from './health-bar';

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
/**
 * The cracks of a gauge cracked at a KO, each a run of pixels along the tube (`along` from its outer
 * end, `row` from its top), drawn in that order over CRACK_REVEAL ticks: two that cross it, a
 * short one near its outer end.
 */
const CRACKS: readonly (readonly [along: number, row: number])[] = [
  [66, 0],
  [65, 1],
  [64, 1],
  [64, 2],
  [66, 2],
  [63, 3],
  [67, 3],
  [62, 3],
  [68, 3],
  [62, 4],
  [70, 4],
  [61, 5],
  [33, 0],
  [32, 1],
  [33, 2],
  [31, 3],
  [30, 3],
  [31, 4],
  [30, 5],
  [12, 1],
  [11, 2],
  [13, 2],
  [12, 3],
];
const CRACK_REVEAL = 10;
/** Chips falling from the cracks: where along the cracks list each starts, from which tick. */
const CHIPS = [2, 7, 14, 20] as const;
const CHIPS_FROM = 4;
/**
 * Squares a KO blows the tube into, from cells of 4 pixels by 3 rows, in three sizes; hot (their
 * bar's light rim) for HOT_TICKS, with the flashes normal; and sparks. Gravity, in pixels per
 * tick squared (halved).
 */
const SHARD = { width: 4, height: 3 } as const;
const SHARD_SIZES = [SHARD, { width: 6, height: 3 }, { width: 3, height: 2 }] as const;
const HOT_TICKS = 4;
const SPARKS = 14;
const SPARK_TICKS = 18;
const GRAVITY = 0.07;
/** Ticks the gauge shakes as it blows up. */
const BLAST_SHAKE_TICKS = 12;

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

/**
 * `flashes` off: no sweep, no shine, no blink, no hot shards; `motion` off: no shards, no falling
 * chips, no shake (see HudComfort).
 */
export interface GaugeLook extends HudComfort {
  /** 0: the left player (the gauge runs right from the screen's edge), 1: the right one. */
  readonly side: 0 | 1;
  readonly energy: number;
}

/** Pixels of the tube that `boost` fills within its bar. */
function partOf(shown: number): number {
  if (shown >= BOOST_MAX) return GAUGE_LENGTH;
  return Math.floor(((shown % BOOST_BAR) * GAUGE_LENGTH) / BOOST_BAR);
}

/** Where a light sweeps on tick `frame`, from the outer end, or -1: a bar just completed, a full gauge's shine. */
function sweepOf(motion: BoostMotion, look: GaugeLook, frame: number): number {
  if (!look.flashes || motion.broken >= 0) return -1;
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
  const lasts = motion.breakage === 'crack' ? CRACK_TICKS : BREAK_TICKS;
  const broken = motion.broken < 0 ? -1 : look.motion ? motion.broken : lasts;
  return [
    look.flashes,
    look.motion,
    barsOf(motion.shown),
    partOf(motion.shown),
    isDraining(motion),
    sweepOf(motion, look, frame),
    motion.breakage,
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
  const broken = isShattered(motion);
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
  if (broken && look.motion) tube.push(...shards(motion, look));
  if (isCracked(motion)) tube.push(...cracks(motion, look));
  spans.push(...moved(tube, TUBE_X, TUBE_Y));
  return look.side === 0 ? spans : spans.map((span) => mirrored(span, GAUGE_WIDTH));
}

/**
 * The tube blown apart, `motion.broken` ticks after the KO: squares of 3 sizes thrown up and out
 * (a fixed spread, the same every time), hot for their first ticks with the flashes normal (their
 * bar's light rim: white at 3 bars), then falling and fading over BREAK_TICKS; and sparks,
 * faster, gone in SPARK_TICKS.
 */
function shards(motion: BoostMotion, look: GaugeLook): Span[] {
  const { energy } = look;
  const age = motion.broken;
  const fade = 1 - age / BREAK_TICKS;
  if (fade <= 0) return [];
  const spans: Span[] = [];
  const hot = look.flashes && age < HOT_TICKS;
  for (let column = 0; column < GAUGE_LENGTH / SHARD.width; column++) {
    for (let band = 0; band < ROWS / SHARD.height; band++) {
      const seed = column * 7 + band * 13;
      const vx = ((seed % 7) - 3) * 0.45;
      const vy = -1.6 - ((column + band * 2) % 4) * 0.5;
      const size = SHARD_SIZES[seed % SHARD_SIZES.length] ?? SHARD;
      const row = band * SHARD.height;
      const along = column * SHARD.width;
      spans.push({
        x: tubeRowStart(ROWS, row + 1) + along + Math.round(vx * age),
        y: row + 1 + Math.round(vy * age + GRAVITY * age * age),
        width: size.width,
        height: size.height,
        color: inkAt(motion, energy, hot ? 0 : row + 1, along),
        alpha: fade,
      });
    }
  }
  if (age < SPARK_TICKS) {
    for (let spark = 0; spark < SPARKS; spark++) {
      const along = (spark * 37) % GAUGE_LENGTH;
      const vx = ((spark % 5) - 2) * 1.1 + (spark % 2 === 0 ? 0.4 : -0.4);
      const vy = -2.2 - (spark % 3) * 0.8;
      spans.push({
        x: tubeRowStart(ROWS, 2) + along + Math.round(vx * age),
        y: 3 + Math.round(vy * age + GRAVITY * age * age),
        width: spark % 3 === 0 ? 2 : 1,
        height: 1,
        color: spark % 2 === 0 ? PLATINE[2] : mix(energy, 0xffffff, 0.6),
        alpha: 1 - age / SPARK_TICKS,
      });
    }
  }
  return spans;
}

/** How far the gauge shakes, side to side, `broken` ticks after it blows up: 2 px, then 1. */
export function blastShake(motion: BoostMotion, look: GaugeLook): number {
  if (!look.motion || !isShattered(motion) || motion.broken >= BLAST_SHAKE_TICKS) return 0;
  const side = motion.broken % 2 === 0 ? 1 : -1;
  return side * (motion.broken < BLAST_SHAKE_TICKS / 2 ? 2 : 1);
}

/**
 * The tube cracked, `motion.broken` ticks after the KO: its glass darkened, its Boost still
 * showing through; the cracks run across it, a light pixel after each dark one, and a few chips
 * fall from them and fade (none kept still, the cracks then drawn at once).
 */
function cracks(motion: BoostMotion, look: GaugeLook): Span[] {
  const spans: Span[] = [];
  for (let row = 0; row < ROWS; row++) {
    const x = tubeRowStart(ROWS, row);
    spans.push({ x, y: row + 1, width: GAUGE_LENGTH, height: 1, color: OUTLINE, alpha: 0.35 });
  }
  const age = look.motion ? motion.broken : CRACK_TICKS;
  const shown = Math.min(CRACKS.length, Math.ceil((CRACKS.length * age) / CRACK_REVEAL));
  CRACKS.slice(0, shown).forEach(([along, row]) => {
    const x = tubeRowStart(ROWS, row) + along;
    const light = mix(inkAt(motion, look.energy, row, along), 0xffffff, 0.5);
    spans.push({ x, y: row + 1, width: 1, height: 1, color: OUTLINE });
    spans.push({ x: x + 1, y: row + 1, width: 1, height: 1, color: light });
    // A crack from the top cuts the rim over it: the frame itself is broken.
    if (row === 0) spans.push({ x: x + 1, y: 0, width: 2, height: 1, color: OUTLINE });
  });
  if (!look.motion) return spans;
  for (const from of CHIPS) {
    const [along, row] = CRACKS[from] ?? [0, 0];
    const fall = age - CHIPS_FROM - from / 4;
    if (fall <= 0) continue;
    const fade = 1 - fall / (CRACK_TICKS - CHIPS_FROM);
    if (fade <= 0) continue;
    spans.push({
      x: tubeRowStart(ROWS, row) + along + (from % 2 === 0 ? -1 : 1) * Math.round(fall / 6),
      y: row + 1 + Math.round(0.3 * fall + 0.05 * fall * fall),
      width: 2,
      height: 1,
      color: inkAt(motion, look.energy, row, along),
      alpha: fade,
    });
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
  /** Where the Graphics stands when still (it shakes as the gauge blows up). */
  private readonly left: number;
  /** Its look kept still (a KO the flash budget left no room to blow it up). */
  private still: GaugeLook;

  /** `x`: the outer end of the gauge (the screen's edge side), `y`: its top. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private look: GaugeLook,
    textStyle: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    this.left = look.side === 0 ? x : x - GAUGE_WIDTH;
    this.graphics = scene.add.graphics({ x: this.left, y }).setScrollFactor(0).setDepth(10);
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
    this.still = { ...look, motion: false };
  }

  /**
   * `breakage`: how the fighter's KO breaks the gauge, from the KO to the next round (null when it
   * stays whole); `frame`: the match clock; `still`: it breaks without its shards.
   */
  update(boost: number, breakage: Breakage | null, frame: number, still = false): void {
    this.motion = stepBoost(this.motion, boost, breakage, frame);
    const motion = this.motion;
    const look = still ? this.still : this.look;
    this.graphics.x = this.left + blastShake(motion, look);
    const key = gaugePaintKey(motion, look, frame);
    if (key !== this.painted) {
      this.painted = key;
      paintSpans(this.graphics, gaugeSpans(motion, look, frame));
    }
    const bars = barsOf(motion.shown);
    const broken = isShattered(motion);
    setIfChanged(this.count, String(bars), hex(levelColor(this.look.energy, bars)));
    this.count.setAlpha(broken ? 0.4 : 1);
    // Cracked, a full gauge still says MAX, without blinking: its fighter is down.
    const full = isFull(motion) && !broken;
    const blinks = full && motion.broken < 0 && this.look.flashes;
    setIfChanged(
      this.word,
      full ? MAX_WORD : BOOST_WORD,
      full ? hex(PLATINE[0]) : hex(broken ? BROKEN : this.look.energy),
    );
    this.word.setAlpha(blinks && !blinkOn(frame) ? 0.25 : 1);
  }

  /** The player's comfort options, from the next update on (the pause's options). */
  setComfort(comfort: HudComfort): void {
    this.look = { ...this.look, ...comfort };
    this.still = { ...this.look, motion: false };
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
