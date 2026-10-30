import type Phaser from 'phaser';
import type { Breakage } from './boost-motion';
import {
  BAR_BREAK_TICKS,
  BAR_CRACK_TICKS,
  freshHealth,
  inDanger,
  shakeOffset,
  stepHealth,
  type HealthMotion,
} from './health-motion';
import {
  mirrored,
  mix,
  paintSpans,
  tubeBox,
  tubeOutline,
  tubeRowStart,
  type Span,
} from './hud-paint';

/**
 * A fighter's health bar (docs/art/direction-hud.md): a tube of 8 rows, yellow with orange edges
 * like the titles (Street Fighter III 3rd Strike, Garou), slanted toward the timer. The health
 * left stays against the timer and the loss opens on the screen's edge, as in every fighting
 * game. Behind the bar, the damage trail, red (Guilty Gear Strive), white the instant of a hit;
 * at 30 % or less the tube turns orange and embers rise from it (Tekken 8's Rage), without a flash.
 * A KO at the end of a combo cracks it, an Ultime's blows it up, like the Boost gauge (a plain KO
 * leaves it whole); the next round refills it whole.
 */

/** Rows of the tube, and the length of each row, in view pixels. */
export const BAR_ROWS = 8;
export const BAR_LENGTH = 176;
/** The box the bar is drawn in: its rows slant one pixel each, outlined with one pixel. */
export const BAR_BOX = tubeBox(BAR_ROWS, BAR_LENGTH);

/** Each tube, top row first: a light rim, the core, the edge, the shadow. */
const TUBES = {
  /** The titles' yellow and orange (styles.css). */
  health: [0xfff4c8, 0xf8dc78, 0xf0c94a, 0xf0c94a, 0xf0c94a, 0xe8a83a, 0xe07a22, 0xc4561c],
  danger: [0xffd0a0, 0xffa04a, 0xff7a1e, 0xff7a1e, 0xf06a18, 0xd85414, 0xb83c10, 0x86260a],
  /** Guilty Gear Strive's red, #B80200. */
  trail: [0xff6a50, 0xe0241a, 0xb80200, 0xb80200, 0xb80200, 0x980100, 0x7e0100, 0x5a0000],
  flash: [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xf2f2f8, 0xe0e0ec, 0xc8c8d8],
  empty: [0x0e0818, 0x1c1228, 0x1c1228, 0x1c1228, 0x1c1228, 0x160e22, 0x120a1c, 0x0e0818],
} as const;
const OUTLINE = 0x0c0612;
/** The frame of a bar blown up, until the next round. */
const BROKEN = 0x3a3448;
/**
 * The cracks of a bar cracked at a KO, each a run of pixels along the tube (`along` from its outer
 * end, `row` from its top), drawn in that order over CRACK_REVEAL ticks: two long ones that cross
 * it, two short ones.
 */
const CRACKS: readonly (readonly [along: number, row: number])[] = [
  [140, 0],
  [139, 1],
  [138, 1],
  [138, 2],
  [140, 2],
  [137, 3],
  [141, 3],
  [136, 4],
  [142, 4],
  [136, 5],
  [143, 5],
  [135, 6],
  [135, 7],
  [80, 0],
  [79, 1],
  [80, 2],
  [78, 3],
  [77, 4],
  [78, 5],
  [76, 6],
  [77, 7],
  [30, 1],
  [29, 2],
  [31, 2],
  [30, 3],
  [28, 4],
  [165, 2],
  [166, 3],
  [164, 4],
];
const CRACK_REVEAL = 10;
/** On a dark (empty) tube, a crack shows light; on a bright one, dark. */
const CRACK_LIGHT = 0x8c7fa6;
/** Chips falling from the cracks: where along the cracks list each starts. */
const CHIPS = [2, 8, 15, 20, 26] as const;
const CHIPS_FROM = 4;
/** Shards a KO blows the tube into, from cells of 8 pixels by 2 rows, in three sizes. */
const SHARD = { width: 8, height: 2 } as const;
const SHARD_SIZES = [SHARD, { width: 6, height: 3 }, { width: 4, height: 2 }] as const;
const HOT_TICKS = 4;
const SPARKS = 18;
const SPARK_TICKS = 18;
const GRAVITY = 0.07;
const SPARK_COLORS = [0xfff4c8, 0xf0c94a, 0xe07a22] as const;
/** Ticks the bar shakes as it blows up. */
const BLAST_SHAKE_TICKS = 12;
/**
 * Embers rising from a bar in danger: at most this many at once, each rising for EMBER_PERIOD
 * ticks, from the tube's lower rows to EMBER_RISE pixels above its box (the HUD leaves that room
 * above the bar, under the screen's top).
 */
const EMBERS = 5;
const EMBER_PERIOD = 48;
export const EMBER_RISE = 5;
const EMBER_START = BAR_ROWS - 2;
const EMBER_COLORS = [0xffe08a, 0xff9a2e, 0xd8401a] as const;

export interface HealthBarLook {
  /** 0: the left player (the timer on the bar's right), 1: the right one (mirrored). */
  readonly side: 0 | 1;
  /** The fighter's energy color: the rim on top of the bar. */
  readonly energy: number;
  /** No shake, no flash, no embers (prefers-reduced-motion). */
  readonly reducedMotion: boolean;
}

/** Pixels of the bar a ratio fills: one at least while there is any health left. */
function lengthOf(ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(1, Math.round(BAR_LENGTH * Math.min(1, ratio)));
}

function embersOn(motion: HealthMotion, look: HealthBarLook): boolean {
  return inDanger(motion) && !look.reducedMotion;
}

/** What the bar shows: it is repainted only when this changes. */
export function healthPaintKey(motion: HealthMotion, look: HealthBarLook, frame: number): string {
  const flash = motion.flash > 0 && !look.reducedMotion ? lengthOf(motion.flashFrom) : '';
  const embers = embersOn(motion, look) ? frame : '';
  const lasts = motion.breakage === 'crack' ? BAR_CRACK_TICKS : BAR_BREAK_TICKS;
  const broken = motion.broken < 0 ? -1 : look.reducedMotion ? lasts : motion.broken;
  return [
    lengthOf(motion.bar),
    lengthOf(motion.trail),
    flash,
    inDanger(motion),
    embers,
    motion.breakage,
    broken,
  ].join(' ');
}

/** Whether a KO blew the bar up (an Ultime's), or cracked it (the end of a combo). */
function shattered(motion: HealthMotion): boolean {
  return motion.broken >= 0 && motion.breakage === 'shatter';
}

function cracked(motion: HealthMotion): boolean {
  return motion.broken >= 0 && motion.breakage === 'crack';
}

/** How far the bar shakes, side to side, as it blows up: 2 px, then 1; none with reduced motion. */
export function healthBlastShake(motion: HealthMotion, look: HealthBarLook): number {
  if (look.reducedMotion || !shattered(motion) || motion.broken >= BLAST_SHAKE_TICKS) return 0;
  const side = motion.broken % 2 === 0 ? 1 : -1;
  return side * (motion.broken < BLAST_SHAKE_TICKS / 2 ? 2 : 1);
}

/** The color of row `row` of the tube at `along` pixels from its outer end. */
function inkAt(motion: HealthMotion, row: number, along: number): number {
  const fromInner = BAR_LENGTH - 1 - along;
  const fill = lengthOf(motion.bar);
  const trail = Math.max(fill, lengthOf(motion.trail));
  const tube = inDanger(motion) ? TUBES.danger : TUBES.health;
  const ink = fromInner < fill ? tube : fromInner < trail ? TUBES.trail : TUBES.empty;
  return ink[row] ?? OUTLINE;
}

function rowStart(row: number): number {
  return tubeRowStart(BAR_ROWS, row);
}

/**
 * The bar's spans at tick `frame`, in its box (BAR_BOX; embers rise above it, at negative y, up
 * to -EMBER_RISE).
 * Drawn for the left player, the inner end on the right, then mirrored for the right one.
 */
export function healthBarSpans(motion: HealthMotion, look: HealthBarLook, frame: number): Span[] {
  if (shattered(motion)) return mirroredFor(look, blownUp(motion, look));
  const spans = tubeOutline(BAR_ROWS, BAR_LENGTH, look.energy, OUTLINE);
  const fill = lengthOf(motion.bar);
  const trail = Math.max(fill, lengthOf(motion.trail));
  // What the last blow took, lit up white the instant it lands.
  const flash =
    motion.flash > 0 && !look.reducedMotion
      ? Math.min(trail, Math.max(fill, lengthOf(motion.flashFrom)))
      : fill;
  const tube = inDanger(motion) ? TUBES.danger : TUBES.health;
  for (let row = 0; row < BAR_ROWS; row++) {
    const start = rowStart(row);
    const end = start + BAR_LENGTH;
    const y = row + 1;
    const at = (from: number, width: number, color: number): void => {
      spans.push({ x: from, y, width, height: 1, color });
    };
    at(start, BAR_LENGTH - trail, TUBES.empty[row] ?? OUTLINE);
    at(end - trail, trail - flash, TUBES.trail[row] ?? OUTLINE);
    at(end - flash, flash - fill, TUBES.flash[row] ?? OUTLINE);
    at(end - fill, fill, tube[row] ?? OUTLINE);
    // The fill's front, a pixel lighter (Street Fighter 6).
    if (fill > 0 && fill < BAR_LENGTH) at(end - fill, 1, mix(tube[row] ?? OUTLINE, 0xffffff, 0.5));
  }
  if (embersOn(motion, look)) spans.push(...embers(fill, frame));
  if (cracked(motion)) spans.push(...cracks(motion, look));
  return mirroredFor(look, spans);
}

function mirroredFor(look: HealthBarLook, spans: Span[]): Span[] {
  return look.side === 0 ? spans : spans.map((span) => mirrored(span, BAR_BOX.width));
}

/**
 * The bar cracked, `motion.broken` ticks after the KO: its glass darkened, the cracks running
 * across it (light over the empty tube, dark over the red trail, a pixel of the other after
 * each), cutting its rim; a few chips fall from them and fade (none with reduced motion, the
 * cracks then drawn at once).
 */
function cracks(motion: HealthMotion, look: HealthBarLook): Span[] {
  const spans: Span[] = [];
  for (let row = 0; row < BAR_ROWS; row++) {
    const x = rowStart(row);
    spans.push({ x, y: row + 1, width: BAR_LENGTH, height: 1, color: OUTLINE, alpha: 0.3 });
  }
  const age = look.reducedMotion ? BAR_CRACK_TICKS : motion.broken;
  const shown = Math.min(CRACKS.length, Math.ceil((CRACKS.length * age) / CRACK_REVEAL));
  CRACKS.slice(0, shown).forEach(([along, row]) => {
    const x = rowStart(row) + along;
    const ink = inkAt(motion, row, along);
    const bright = ink !== TUBES.empty[row];
    const light = mix(ink, 0xffffff, 0.5);
    spans.push({ x, y: row + 1, width: 1, height: 1, color: bright ? OUTLINE : CRACK_LIGHT });
    spans.push({ x: x + 1, y: row + 1, width: 1, height: 1, color: bright ? light : OUTLINE });
    if (row === 0) spans.push({ x: x + 1, y: 0, width: 2, height: 1, color: OUTLINE });
  });
  if (look.reducedMotion) return spans;
  for (const from of CHIPS) {
    const [along, row] = CRACKS[from] ?? [0, 0];
    const fall = age - CHIPS_FROM - from / 5;
    if (fall <= 0) continue;
    const fade = 1 - fall / (BAR_CRACK_TICKS - CHIPS_FROM);
    if (fade <= 0) continue;
    spans.push({
      x: rowStart(row) + along + (from % 2 === 0 ? -1 : 1) * Math.round(fall / 6),
      y: row + 1 + Math.round(0.3 * fall + 0.05 * fall * fall),
      width: 2,
      height: 1,
      color: mix(inkAt(motion, row, along), 0xffffff, 0.3),
      alpha: fade,
    });
  }
  return spans;
}

/**
 * The bar blown up, `motion.broken` ticks after the KO: its frame left dim and empty until the
 * next round; its tube in shards of three sizes thrown up and out (the empty tube as glass, its
 * top band in the rim's color, the red trail red; hot, lighter, for their first ticks, never
 * white), then falling and fading over BAR_BREAK_TICKS; and sparks in the
 * titles' yellow and orange, gone in SPARK_TICKS. With reduced motion, the dim frame alone.
 */
function blownUp(motion: HealthMotion, look: HealthBarLook): Span[] {
  const spans = tubeOutline(BAR_ROWS, BAR_LENGTH, BROKEN, BROKEN);
  for (let row = 0; row < BAR_ROWS; row++) {
    const color = TUBES.empty[row] ?? OUTLINE;
    spans.push({ x: rowStart(row), y: row + 1, width: BAR_LENGTH, height: 1, color });
  }
  const age = motion.broken;
  const fade = 1 - age / BAR_BREAK_TICKS;
  if (look.reducedMotion || fade <= 0) return spans;
  const hot = age < HOT_TICKS;
  for (let column = 0; column < BAR_LENGTH / SHARD.width; column++) {
    for (let band = 0; band < BAR_ROWS / SHARD.height; band++) {
      const seed = column * 7 + band * 13;
      const vx = ((seed % 9) - 4) * 0.4;
      const vy = -1.4 - ((column + band * 2) % 5) * 0.45;
      const size = SHARD_SIZES[seed % SHARD_SIZES.length] ?? SHARD;
      const row = band * SHARD.height;
      const along = column * SHARD.width;
      // The empty tube flies apart as glass, its top band with the rim's color.
      const cell = inkAt(motion, row, along);
      const glass = cell === TUBES.empty[row] ? mix(cell, CRACK_LIGHT, 0.55) : cell;
      const ink = band === 0 ? mix(glass, look.energy, 0.6) : glass;
      spans.push({
        x: rowStart(row + 1) + along + Math.round(vx * age),
        y: row + 1 + Math.round(vy * age + GRAVITY * age * age),
        width: size.width,
        height: size.height,
        color: hot ? mix(ink, 0xffffff, 0.45) : ink,
        alpha: fade,
      });
    }
  }
  if (age < SPARK_TICKS) {
    for (let spark = 0; spark < SPARKS; spark++) {
      const along = (spark * 41) % BAR_LENGTH;
      const vx = ((spark % 5) - 2) * 1.2 + (spark % 2 === 0 ? 0.4 : -0.4);
      const vy = -2 - (spark % 3) * 0.8;
      spans.push({
        x: rowStart(3) + along + Math.round(vx * age),
        y: 4 + Math.round(vy * age + GRAVITY * age * age),
        width: spark % 3 === 0 ? 2 : 1,
        height: 1,
        color: SPARK_COLORS[spark % SPARK_COLORS.length] ?? 0xf0c94a,
        alpha: 1 - age / SPARK_TICKS,
      });
    }
  }
  return spans;
}

/**
 * Embers over the `fill` pixels left: each rises from the tube's lower rows out of its top, for
 * EMBER_PERIOD ticks, from yellow to red, 2 px then 1, drifting a pixel aside in its second half;
 * a new cycle starts it somewhere else along the bar.
 */
function embers(fill: number, frame: number): Span[] {
  if (fill === 0) return [];
  const spans: Span[] = [];
  for (let ember = 0; ember < EMBERS; ember++) {
    const clock = frame + (ember * EMBER_PERIOD) / EMBERS;
    const age = clock % EMBER_PERIOD;
    const cycle = Math.floor(clock / EMBER_PERIOD);
    const size = age < EMBER_PERIOD / 2 ? 2 : 1;
    const along = (ember * 73 + cycle * 151) % Math.max(1, fill - size);
    const drift = age > EMBER_PERIOD / 2 ? ((cycle + ember) % 3) - 1 : 0;
    const color = EMBER_COLORS[Math.floor((age * EMBER_COLORS.length) / EMBER_PERIOD)] ?? 0xffffff;
    const y = EMBER_START - Math.floor((age * (EMBER_START + EMBER_RISE)) / EMBER_PERIOD);
    // Inside the tube, over its slanted row; above it, over the top row.
    const row = Math.min(BAR_ROWS - 1, Math.max(0, y - 1));
    spans.push({
      x: rowStart(row) + BAR_LENGTH - size - along + drift,
      y,
      width: size,
      height: size,
      color,
    });
  }
  return spans;
}

/** One fighter's health bar on the HUD: one Graphics, repainted when what it shows changes. */
export class HealthBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private motion = freshHealth(0, 0);
  private painted = '';

  /** (`x`, `y`): the top left of the bar's box (BAR_BOX). */
  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    y: number,
    private readonly look: HealthBarLook,
  ) {
    this.graphics = scene.add.graphics({ x, y }).setScrollFactor(0).setDepth(10);
  }

  /**
   * `comboed`: while the fighter is being comboed; `frame`: the match clock; `breakage`: how the
   * fighter's KO breaks the bar, from the KO to the next round (null when it stays whole).
   */
  update(ratio: number, comboed: boolean, frame: number, breakage: Breakage | null = null): void {
    this.motion = stepHealth(this.motion, ratio, comboed, frame, breakage);
    const shake = this.look.reducedMotion ? 0 : shakeOffset(this.motion);
    this.graphics.x = this.x + (healthBlastShake(this.motion, this.look) || shake);
    const key = healthPaintKey(this.motion, this.look, frame);
    if (key === this.painted) return;
    this.painted = key;
    paintSpans(this.graphics, healthBarSpans(this.motion, this.look, frame));
  }
}
