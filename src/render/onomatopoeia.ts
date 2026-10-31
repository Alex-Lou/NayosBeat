import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { MAX_CLOSE_UP } from './camera-framing';
import { COMIC_FONT, comicDrop, comicFill, INK } from './comic-lettering';
import { DEPTH } from './depth';
import type { HitStyle } from './hit-styles';
import { VIEW_SIZE } from './view';

/** `pulse`: a super's blow before its last, a small BOUM before the big one (docs/flashs.md §2). */
export type BlowKind = 'light' | 'heavy' | 'ko' | 'pulse';

/** Words are picked in turn, so a string of blows never repeats the same one. */
const WORDS: Readonly<Record<BlowKind, readonly string[]>> = {
  light: ['PAF', 'BIM', 'POK', 'TCHAC'],
  heavy: ['BAM', 'VLAN', 'CRAC', 'SBAM'],
  ko: ['BOUM'],
  pulse: ['BOUM'],
};

/**
 * Sizes in world pixels, popping and calm (the flashes reduced or off, or a muted blow's: small
 * enough that none flashes on its own close up, docs/flashs.md §4); the tally is drawn at 70 % of
 * its word.
 */
export const WORD_SIZES: Readonly<Record<BlowKind, number>> = {
  light: 13,
  heavy: 17,
  ko: 26,
  pulse: 13,
};
export const CALM_WORD_SIZES: Readonly<Record<BlowKind, number>> = {
  light: 12,
  heavy: 13,
  ko: 14,
  pulse: 12,
};
const TALLY_SCALE = 0.7;
/** Display frames a word stays on screen (it pops, holds, then rises and fades). */
const LIFE: Readonly<Record<BlowKind, number>> = { light: 30, heavy: 38, ko: 80, pulse: 30 };
const POP_FRAMES = 6;
/** The largest scale of the pop, at its second frame. */
export const POP_PEAK = 1.24;
/** Calm (the flashes reduced or off), a word does not pop: it fades in over this many frames. */
const CALM_FADE_IN = 3;
const FADE_FRAMES = 12;
/** A word pushed aside by the next one of the same player fades out this fast. */
const OUTRUN_FRAMES = 6;
/** Above the impact, a little toward the side the blow pushes to. */
const OFFSET_Y = 22;
const OFFSET_X = 8;
const RISE = 0.3;
/** Height of the HUD band at the top of the screen (timer, bars, names), in view pixels. */
const HUD_BAND = 30;
/** The inked outline and the comic drop of a word, then of its tally, in world pixels. */
export const WORD_INK = { stroke: 4, drop: 2 } as const;
export const TALLY_INK = { stroke: 3, drop: 1 } as const;
/** Successive words lean one way, then the other. */
const TILTS = [-0.13, 0.09, -0.05, 0.15] as const;
const POOL_SIZE = 6;
/** Depth steps inside the words' band: when the count wraps, the older words are long gone. */
const SERIALS = 1000;

/** Hits each player has landed in a row: it grows with every hit, and drops to 0 on taking one. */
export type Tally = readonly [number, number];

/**
 * The tally during one simulation tick. Blows of the same tick (a trade) are counted against
 * the tally from before it, so the player order does not matter.
 */
export interface TickTally {
  readonly before: Tally;
  readonly now: Tally;
  /** Who took a hit during this tick. */
  readonly hit: readonly [boolean, boolean];
}

export const NO_TALLY: TickTally = { before: [0, 0], now: [0, 0], hit: [false, false] };

export function startTick(tally: TickTally): TickTally {
  return { before: tally.now, now: tally.now, hit: [false, false] };
}

/** A blow landed by `by` during the tick: its rank in the tally, and the tally after it. */
export function landHit(tally: TickTally, by: 0 | 1): { count: number; tally: TickTally } {
  const hit: [boolean, boolean] = by === 0 ? [tally.hit[0], true] : [true, tally.hit[1]];
  const after = (player: 0 | 1) =>
    hit[player] ? 0 : tally.before[player] + (player === by ? 1 : 0);
  return {
    count: tally.before[by] + 1,
    tally: { before: tally.before, now: [after(0), after(1)], hit },
  };
}

/** The word for the `count`-th blow of a tally: the KO always booms. */
export function wordFor(kind: BlowKind, count: number): string {
  const words = WORDS[kind];
  return words[(count - 1) % words.length] ?? words[0] ?? '';
}

interface Word {
  readonly text: Phaser.GameObjects.Text;
  readonly tally: Phaser.GameObjects.Text;
  by: 0 | 1;
  /** Frames it waits, hidden, before it shows (after a blow the flash budget muted). */
  wait: number;
  /** Blown this display frame: its wait starts with the next one (`settle`). */
  fresh: boolean;
  /** Calm: it fades in at its calm size instead of popping. */
  calm: boolean;
  /** Its tally shows (from the second hit on). */
  tallied: boolean;
  life: number;
  total: number;
  /** Frames over which the word fades out (shortened when the next word outruns it). */
  fade: number;
  tilt: number;
  /** Where the word settles, in world pixels. */
  x: number;
  y: number;
}

type Metrics = Phaser.Types.GameObjects.Text.TextMetrics;

/**
 * Comic-book sound words where blows land ("PAF !", "VLAN !"), in the attacker's colors, with
 * their running tally ("x3"; the comic font has no "×") from the second hit on: a player's
 * hits add up until they take one. Light and quick, they never cover the fight for long, and
 * stay inside the frame, under the HUD. Calm (the flashes reduced or off, or a muted blow's word:
 * docs/flashs.md §4), they are smaller and fade in instead of popping. Fixed pool, nothing
 * allocated per frame.
 */
export class Onomatopoeia {
  /** The words fade in rather than pop: read at each blow, so the pause's options apply at once. */
  calm = false;
  private readonly words: Word[];
  /** Device pixels per world pixel of the texts (the shadow offsets are not scaled). */
  private readonly resolution: number;
  /** Measured once per size, popping then calm. */
  private readonly wordMetrics: readonly [Record<BlowKind, Metrics>, Record<BlowKind, Metrics>];
  private readonly tallyMetrics: readonly [Record<BlowKind, Metrics>, Record<BlowKind, Metrics>];
  /** Highest world y a word's bottom may rise to and stay clear of the HUD at any zoom. */
  private readonly hudBottom: number;
  private tally: TickTally = NO_TALLY;
  private next = 0;
  /** Counts the blows, to draw each new word over the previous ones. */
  private serial = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly styles: readonly [HitStyle, HitStyle],
  ) {
    // Rendered at the finest zoom of the fight camera, so the lettering stays sharp.
    this.resolution = Math.ceil((scene.scale.width / VIEW_SIZE.width) * MAX_CLOSE_UP);
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: COMIC_FONT,
      color: '#ffffff',
      stroke: INK,
      resolution: this.resolution,
      // Room for the drop, which the text's size does not count.
      padding: { right: WORD_INK.drop, bottom: WORD_INK.drop },
    };
    this.words = Array.from({ length: POOL_SIZE }, () => ({
      text: hidden(
        scene.add.text(0, 0, '', { ...style, strokeThickness: WORD_INK.stroke }).setOrigin(0.5, 1),
      ),
      tally: hidden(
        scene.add.text(0, 0, '', { ...style, strokeThickness: TALLY_INK.stroke }).setOrigin(0, 1),
      ),
      by: 0 as const,
      wait: 0,
      fresh: false,
      calm: false,
      tallied: false,
      life: 0,
      total: 0,
      fade: FADE_FRAMES,
      tilt: 0,
      x: 0,
      y: 0,
    }));
    // Measured once per size: restyling a word then redraws it only once.
    const probe = this.words[0]?.text;
    if (!probe) throw new Error('Empty pool');
    const metricsOf = (sizeOf: (kind: BlowKind) => number): Record<BlowKind, Metrics> => ({
      light: { ...probe.setFontSize(sizeOf('light')).getTextMetrics() },
      heavy: { ...probe.setFontSize(sizeOf('heavy')).getTextMetrics() },
      ko: { ...probe.setFontSize(sizeOf('ko')).getTextMetrics() },
      pulse: { ...probe.setFontSize(sizeOf('pulse')).getTextMetrics() },
    });
    this.wordMetrics = [
      metricsOf((kind) => WORD_SIZES[kind]),
      metricsOf((kind) => CALM_WORD_SIZES[kind]),
    ];
    this.tallyMetrics = [
      metricsOf((kind) => tallySize(WORD_SIZES[kind])),
      metricsOf((kind) => tallySize(CALM_WORD_SIZES[kind])),
    ];
    this.hudBottom = groundY - (groundY - HUD_BAND) / MAX_CLOSE_UP;
  }

  /** Call before the blows of each simulation tick. */
  beginTick(): void {
    this.tally = startTick(this.tally);
  }

  /** The rank in the tally that a blow `by` lands during this tick gets: what its word shows. */
  countOf(by: 0 | 1): number {
    return landHit(this.tally, by).count;
  }

  /**
   * A blow landed by `hit.by` at (hit.x, hit.y) (simulation units), pushing toward `hit.away`.
   * `viewLeft`: left edge of the simulation camera, in world pixels. The word counts at once, and
   * shows `delay` display frames later, counted from the next one (a muted blow's: its peak never
   * meets the spark's), never if null (the flash budget found no room for it). `calm`: it fades
   * in at its calm size, whatever the options.
   */
  blow(
    kind: BlowKind,
    hit: { readonly by: 0 | 1; readonly x: number; readonly y: number; readonly away: 1 | -1 },
    viewLeft: number,
    delay: number | null = 0,
    calm = false,
  ): void {
    const { by } = hit;
    const landed = landHit(this.tally, by);
    this.tally = landed.tally;
    const { count } = landed;
    // Counted, never shown: the words on screen go on as they were.
    if (delay === null) return;
    for (const word of this.words) if (word.by === by) outrun(word);

    const word = this.words[this.next];
    if (!word) return;
    this.next = (this.next + 1) % this.words.length;
    word.by = by;
    word.wait = delay;
    word.fresh = delay > 0;
    word.calm = calm || this.calm;
    word.life = word.total = LIFE[kind];
    word.fade = FADE_FRAMES;
    word.tilt = TILTS[(count - 1) % TILTS.length] ?? 0;
    this.restyle(word, kind, count);

    // Inside the frame: the simulation camera's walls (the fight camera never shows beyond
    // them), and below the HUD, with room for the pop and the rise.
    const half = (word.text.width / 2) * POP_PEAK + 2;
    const tallyWidth = count >= 2 ? word.tally.width * POP_PEAK + 2 : 0;
    const x = toPx(hit.x) + hit.away * OFFSET_X;
    word.x = Math.min(Math.max(x, viewLeft + half), viewLeft + VIEW_SIZE.width - half - tallyWidth);
    const reach = word.text.height * POP_PEAK + (LIFE[kind] - POP_FRAMES) * RISE;
    word.y = Math.max(this.groundY - toPx(hit.y) - OFFSET_Y, this.hudBottom + reach);

    // The newest blow is drawn over the older words (inside the words' depth band).
    this.serial = (this.serial + 1) % SERIALS;
    const depth = DEPTH.words + this.serial / SERIALS;
    word.text.setDepth(depth);
    word.tally.setDepth(depth);
    if (delay > 0) hide(word);
    else this.place(word);
  }

  /**
   * Call once each display frame, after its updates (even none): the words its blows hold back
   * start waiting with the next one, so a word that waits `delay` frames shows exactly `delay`
   * frames of the visual clock after its blow, at any frame rate (the flash budget kept it there).
   */
  settle(): void {
    for (const word of this.words) word.fresh = false;
  }

  /** The tallies start over with every round. */
  reset(): void {
    this.tally = NO_TALLY;
  }

  /** Advances the words by one step of 1/60 s. */
  update(): void {
    for (const word of this.words) {
      if (word.wait > 0) {
        if (word.fresh) continue;
        word.wait--;
        if (word.wait > 0) continue;
        word.text.setVisible(true);
        word.tally.setVisible(word.tallied);
        this.place(word);
        continue;
      }
      if (word.life === 0) continue;
      word.life--;
      if (word.life === 0) {
        word.text.setVisible(false);
        word.tally.setVisible(false);
        continue;
      }
      this.place(word);
    }
  }

  /**
   * The comic lettering in the attacker's colors. The style is set without redrawing (with the
   * metrics measured for its size), then the text is drawn once.
   */
  private restyle(word: Word, kind: BlowKind, count: number): void {
    const style = this.styles[word.by];
    const { text, tally } = word;
    const look = word.calm ? 1 : 0;
    const size = (word.calm ? CALM_WORD_SIZES : WORD_SIZES)[kind];
    const fill = comicFill(text, size, style);
    const drop = comicDrop(WORD_INK.drop, this.resolution, style);
    text.style.setStyle(
      { fontSize: size, color: fill, shadow: drop, metrics: this.wordMetrics[look][kind] },
      false,
    );
    redraw(text, `${wordFor(kind, count)} !`);
    text.setVisible(true);

    word.tallied = count >= 2;
    tally.setVisible(word.tallied);
    if (count < 2) return;
    tally.style.setStyle(
      {
        fontSize: tallySize(size),
        shadow: comicDrop(TALLY_INK.drop, this.resolution, style),
        metrics: this.tallyMetrics[look][kind],
      },
      false,
    );
    redraw(tally, `x${count}`);
  }

  private place(word: Word): void {
    const age = word.total - word.life;
    // Pops in big, settles, then drifts up while fading; calm, it fades in at its size.
    const pop = age < POP_FRAMES ? 1.35 - 0.35 * (age / POP_FRAMES) : 1;
    const grow = age < 2 ? 0.6 + 0.4 * (age / 2) : 1;
    const scale = word.calm ? 1 : pop * grow;
    const fadeIn = word.calm ? (age + 1) / CALM_FADE_IN : 1;
    const alpha = Math.min(1, fadeIn, word.life / word.fade);
    const y = word.y - Math.max(0, age - POP_FRAMES) * RISE;

    word.text.setPosition(word.x, y).setScale(scale).setRotation(word.tilt).setAlpha(alpha);
    if (word.tally.visible) {
      // At the end of the word, along its tilt.
      const half = (word.text.width / 2) * scale + 2;
      word.tally
        .setPosition(word.x + Math.cos(word.tilt) * half, y + Math.sin(word.tilt) * half)
        .setScale(scale)
        .setRotation(word.tilt)
        .setAlpha(alpha);
    }
  }
}

/**
 * The next word of the same player takes over: the old one fades out quickly from where it is
 * and from its current opacity (its age, which drives the pop and the rise, does not jump).
 */
function outrun(word: Word): void {
  // One still waiting to show never will.
  if (word.wait > 0) {
    word.wait = 0;
    word.life = 0;
    hide(word);
    return;
  }
  if (word.life <= OUTRUN_FRAMES) return;
  const alpha = Math.min(1, word.life / word.fade);
  word.total -= word.life - OUTRUN_FRAMES;
  word.life = OUTRUN_FRAMES;
  word.fade = OUTRUN_FRAMES / alpha;
}

/** Draws the text once, even when its string did not change. */
function redraw(text: Phaser.GameObjects.Text, value: string): void {
  if (text.text === value) text.updateText();
  else text.setText(value);
}

/** The size of the tally of a word `size` world pixels high. */
export function tallySize(size: number): number {
  return Math.round(size * TALLY_SCALE);
}

function hide(word: Word): void {
  word.text.setVisible(false);
  word.tally.setVisible(false);
}

function hidden(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  return text.setDepth(DEPTH.words).setVisible(false);
}
