import { pinpoints, type FightEvent } from './fight-events';
import type { HitKind } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { POP_PEAK, type BlowKind } from './onomatopoeia';
import { ARRIVAL_PEAK, SLAM_FROM } from './stamps';

/**
 * What each piece of a blow lights at its peak (docs/flashs.md §1.1, §4), in world px² of
 * ΔL ≥ 0.1 over the stage's sky, at 1:1 (the budget counts the zoom). Sparks: measured on the
 * real HitFx in their brightest colorway (Nayo's cyan, Riff's magenta), and kept above every
 * measure by tests/render/flash-areas.test.ts; the grazing spark: the whole area of its shapes;
 * the words and the stamps: their letters filled, inked and dropped as Phaser draws them, in
 * every colorway, measured by the same test.
 */

export type SparkLook = Exclude<HitKind, 'block'>;

export const SPARK_AREAS: Readonly<Record<HitStyle['shape'], Readonly<Record<HitKind, number>>>> = {
  slash: { light: 400, heavy: 1330, ko: 3300, pulse: 430, koMuted: 440, block: 95, pinpoint: 115 },
  claw: { light: 120, heavy: 490, ko: 920, pulse: 490, koMuted: 440, block: 95, pinpoint: 148 },
};
/**
 * A low blow's grazing spark, at most: its flat flash (14 × 2) and its streaks along the floor on
 * their 3 rows, at their longest (12).
 */
export const GRAZE_AREA = 64;

/**
 * A sound word at scale 1, the widest of its kind: the word ("TCHAC !"), then the « x » of its
 * tally and each of its digits on their own (what a tally lights is never more than theirs
 * added up).
 */
export interface WordArea {
  readonly word: number;
  readonly x: number;
  readonly digit: number;
}
/** At their popping size (WORD_SIZES), then calm (CALM_WORD_SIZES). */
export const WORD_AREAS: Readonly<Record<BlowKind, WordArea>> = {
  light: { word: 280, x: 33, digit: 36 },
  heavy: { word: 455, x: 49, digit: 57 },
  ko: { word: 1000, x: 94, digit: 110 },
  pulse: { word: 295, x: 33, digit: 36 },
};
export const CALM_WORD_AREAS: Readonly<Record<BlowKind, WordArea>> = {
  light: { word: 245, x: 28, digit: 31 },
  heavy: { word: 285, x: 33, digit: 36 },
  ko: { word: 330, x: 38, digit: 42 },
  pulse: { word: 255, x: 28, digit: 31 },
};
/** The widest stamp (« DÉGAGEMENT ! ») at scale 1, at its size (STAMP_SIZE), then calm. */
export const STAMP_AREA = 700;
export const CALM_STAMP_AREA = 410;

/** World px² the word of the `count`-th blow of a tally lights: at the peak of its pop, or calm. */
export function wordArea(kind: BlowKind, count: number, calm: boolean): number {
  const { word, x, digit } = (calm ? CALM_WORD_AREAS : WORD_AREAS)[kind];
  const tally = count >= 2 ? x + digit * String(count).length : 0;
  return (word + tally) * (calm ? 1 : POP_PEAK ** 2);
}

/**
 * World px² a stamp lights: slammed down from its largest, or calm; `framed`, CONTRE or
 * PUNITION, at the peak of its arrival (its frame lights nothing: tests/render/flash-areas.test.ts).
 */
export function stampArea(calm: boolean, framed = false): number {
  if (calm) return CALM_STAMP_AREA;
  return STAMP_AREA * (framed ? ARRIVAL_PEAK : SLAM_FROM) ** 2;
}

/** What a blow plays when the budget mutes it: a heavy one the pulse's silhouette, a KO its own. */
const MUTED: Readonly<Record<SparkLook, SparkLook>> = {
  light: 'light',
  heavy: 'pulse',
  ko: 'koMuted',
  pulse: 'pulse',
  koMuted: 'koMuted',
  pinpoint: 'pinpoint',
};

type BlowEvent = Extract<FightEvent, { type: 'hit' | 'ko' }>;

/** What a blow shows at once, and asks the budget for. */
export interface BlowAsk {
  /** Its spark lit, and muted (unless it lands at the feet: then the grazing spark). */
  readonly look: SparkLook;
  readonly muted: SparkLook;
  /** Its sound word. */
  readonly word: BlowKind;
  /**
   * World px² lit at once: lit, the spark, the word and the stamp; muted, the spark alone (the
   * word and the stamp wait, calm: their peaks never meet the spark's).
   */
  readonly area: number;
  readonly mutedArea: number;
  /** World px² of its word and its stamp (none: 0) once they have waited, calm. */
  readonly later: { readonly word: number; readonly stamp: number };
  /** A KO, or the last blow of a super: it may take the slot the ordinary effects leave. */
  readonly climax: boolean;
}

/**
 * A blow of the Finisher's lock (docs/finisher.md §1.14, §5.2): its spark the pulse's, its KO's
 * too (the KO's first key is a flash), `size` times its own at the close up; no word and no
 * stamp, the scene stamps its count instead. Its KO stays a climax.
 */
export function finisherAsk(event: BlowEvent, shape: HitStyle['shape'], size: number): BlowAsk {
  const area = (event.low ? GRAZE_AREA : 0) + SPARK_AREAS[shape].pulse * size ** 2;
  return {
    look: 'pulse',
    muted: 'pulse',
    word: 'pulse',
    area,
    mutedArea: area,
    later: { word: 0, stamp: 0 },
    climax: event.type === 'ko' || (event.tier >= 3 && !event.pulse),
  };
}

/**
 * `calm`: the words and stamps without their pop (the flashes reduced or off); `count`: the rank
 * of the blow in its tally (Onomatopoeia.countOf), which its word shows.
 */
export function blowAsk(
  event: BlowEvent,
  shape: HitStyle['shape'],
  calm: boolean,
  count: number,
): BlowAsk {
  const ko = event.type === 'ko';
  const heavy = event.type === 'ko' || event.heavy || event.counter !== null;
  const look: SparkLook = ko
    ? 'ko'
    : event.pulse
      ? 'pulse'
      : pinpoints(event)
        ? 'pinpoint'
        : heavy
          ? 'heavy'
          : 'light';
  const word: BlowKind = ko ? 'ko' : event.pulse ? 'pulse' : heavy ? 'heavy' : 'light';
  const muted = MUTED[look];
  // A low blow grazes the floor; a low KO keeps its burst too.
  const spark = (kind: SparkLook): number =>
    event.low ? GRAZE_AREA + (ko ? SPARK_AREAS[shape][kind] : 0) : SPARK_AREAS[shape][kind];
  const stamp = event.counter ? stampArea(calm, true) : 0;
  return {
    look,
    muted,
    word,
    area: spark(look) + wordArea(word, count, calm) + stamp,
    mutedArea: spark(muted),
    later: { word: wordArea(word, count, true), stamp: event.counter ? stampArea(true) : 0 },
    climax: ko || (event.tier >= 3 && !event.pulse),
  };
}
