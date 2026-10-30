import { BOOST_BAR, BOOST_MAX } from '../core/rules';

/**
 * How a Boost gauge moves, tick by tick, apart from the Boost it shows (docs/art/direction-hud.md):
 * it fills up rather than jumping, lights up the bar it completes, drains fast what a Boost move
 * spends (Guilty Gear Strive's Tension), and breaks when its fighter is knocked out the hard way:
 * it cracks at the end of a combo, shatters under a super (the Boost is kept for the next round:
 * there the gauge comes back whole). Pure, stepped to the match clock like the health bar.
 */

/** How much Boost the gauge fills each tick: a bar in 20 ticks. */
export const FILL_RATE = BOOST_BAR / 20;
/** Ticks a completed bar lights up. */
export const LEVEL_UP_TICKS = 14;
/** How much Boost the gauge drains each tick once spent: a bar in 10 ticks. */
export const DRAIN_RATE = BOOST_BAR / 10;
/**
 * How a KO breaks the gauge: `crack`, the end of a combo (it cracks, its Boost still showing);
 * `shatter`, a super or a Finisher (it flies apart in squares). A plain KO leaves it whole.
 */
export type Breakage = 'crack' | 'shatter';
/** Ticks the gauge takes to shatter, or to crack, at a KO; then it stays so until the next round. */
export const BREAK_TICKS = 48;
export const CRACK_TICKS = 30;
const MAX_STEP = 120;

export interface BoostMotion {
  /** Boost the gauge shows, 0 to BOOST_MAX: it climbs to the fighter's at FILL_RATE. */
  readonly shown: number;
  /** The fighter's Boost: under `shown` while a spend drains. */
  readonly target: number;
  /** Ticks left of the light on the bar just completed, and which bar (0 to 2). */
  readonly levelUp: number;
  readonly levelUpBar: number;
  /** Ticks since the gauge started breaking (its fighter knocked out), -1 while whole; and how. */
  readonly broken: number;
  readonly breakage: Breakage;
  readonly frame: number;
}

export function freshBoost(frame: number, boost = 0): BoostMotion {
  return {
    shown: boost,
    target: boost,
    levelUp: 0,
    levelUpBar: 0,
    broken: -1,
    breakage: 'shatter',
    frame,
  };
}

/** Bars the gauge shows complete. */
export function barsOf(shown: number): number {
  return Math.floor(Math.min(shown, BOOST_MAX) / BOOST_BAR);
}

/**
 * The gauge at tick `frame`, for a fighter with `boost`; `breakage` from the tick a KO that breaks
 * it lands until the next round starts, null otherwise (a plain KO included).
 */
export function stepBoost(
  motion: BoostMotion,
  boost: number,
  breakage: Breakage | null,
  frame: number,
): BoostMotion {
  if (frame < motion.frame) return freshBoost(frame, boost);
  let { shown, levelUp, levelUpBar, broken } = motion;
  if (breakage === null) broken = -1;
  else if (broken < 0) broken = 0;
  const lasts = breakage === 'crack' ? CRACK_TICKS : BREAK_TICKS;
  const ticks = Math.min(frame - motion.frame, MAX_STEP);
  for (let tick = 0; tick < ticks; tick++) {
    levelUp = Math.max(0, levelUp - 1);
    if (broken >= 0 && broken < lasts) broken++;
    if (shown > boost) shown = Math.max(boost, shown - DRAIN_RATE);
    else if (shown < boost) {
      const before = barsOf(shown);
      shown = Math.min(boost, shown + FILL_RATE);
      if (barsOf(shown) > before) {
        levelUp = LEVEL_UP_TICKS;
        levelUpBar = barsOf(shown) - 1;
      }
    }
  }
  return {
    shown,
    target: boost,
    levelUp,
    levelUpBar,
    broken,
    breakage: breakage ?? motion.breakage,
    frame,
  };
}

/** Whether a spend is draining the gauge. */
export function isDraining(motion: BoostMotion): boolean {
  return motion.shown > motion.target;
}

/** Whether the gauge is shattered (its fighter knocked out by a super or a Finisher). */
export function isShattered(motion: BoostMotion): boolean {
  return motion.broken >= 0 && motion.breakage === 'shatter';
}

/** Whether the gauge is cracked (its fighter knocked out at the end of a combo). */
export function isCracked(motion: BoostMotion): boolean {
  return motion.broken >= 0 && motion.breakage === 'crack';
}

/** Whether the gauge is full: its color changes and it glows. */
export function isFull(motion: BoostMotion): boolean {
  return motion.shown >= BOOST_MAX;
}
