import { BOOST_BAR, BOOST_MAX } from '../core/rules';

/**
 * How a Boost gauge moves, tick by tick, apart from the Boost it shows (docs/art/direction-hud.md):
 * it fills up rather than jumping, lights up the bar it completes, drains fast what a Boost move
 * spends (Guilty Gear Strive's Tension), and shatters when its fighter is knocked out (the Boost
 * is kept for the next round: there the gauge comes back whole). Pure, stepped to the match clock
 * like the health bar.
 */

/** How much Boost the gauge fills each tick: a bar in 20 ticks. */
export const FILL_RATE = BOOST_BAR / 20;
/** Ticks a completed bar lights up. */
export const LEVEL_UP_TICKS = 14;
/** How much Boost the gauge drains each tick once spent: a bar in 10 ticks. */
export const DRAIN_RATE = BOOST_BAR / 10;
/** Ticks the gauge takes to shatter at a KO; then it stays broken until the next round. */
export const BREAK_TICKS = 40;
const MAX_STEP = 120;

export interface BoostMotion {
  /** Boost the gauge shows, 0 to BOOST_MAX: it climbs to the fighter's at FILL_RATE. */
  readonly shown: number;
  /** The fighter's Boost: under `shown` while a spend drains. */
  readonly target: number;
  /** Ticks left of the light on the bar just completed, and which bar (0 to 2). */
  readonly levelUp: number;
  readonly levelUpBar: number;
  /** Ticks since the gauge started shattering (its fighter knocked out), -1 while whole. */
  readonly broken: number;
  readonly frame: number;
}

export function freshBoost(frame: number, boost = 0): BoostMotion {
  return { shown: boost, target: boost, levelUp: 0, levelUpBar: 0, broken: -1, frame };
}

/** Bars the gauge shows complete. */
export function barsOf(shown: number): number {
  return Math.floor(Math.min(shown, BOOST_MAX) / BOOST_BAR);
}

/**
 * The gauge at tick `frame`, for a fighter with `boost`; `knockedOut` from the tick their KO
 * lands until the next round starts.
 */
export function stepBoost(
  motion: BoostMotion,
  boost: number,
  knockedOut: boolean,
  frame: number,
): BoostMotion {
  if (frame < motion.frame) return freshBoost(frame, boost);
  let { shown, levelUp, levelUpBar, broken } = motion;
  if (!knockedOut && broken >= 0) broken = -1;
  if (knockedOut && broken < 0) broken = 0;
  const ticks = Math.min(frame - motion.frame, MAX_STEP);
  for (let tick = 0; tick < ticks; tick++) {
    levelUp = Math.max(0, levelUp - 1);
    if (broken >= 0 && broken < BREAK_TICKS) broken++;
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
  return { shown, target: boost, levelUp, levelUpBar, broken, frame };
}

/** Whether a spend is draining the gauge. */
export function isDraining(motion: BoostMotion): boolean {
  return motion.shown > motion.target;
}

/** Whether the gauge is full: its color changes and it glows. */
export function isFull(motion: BoostMotion): boolean {
  return motion.shown >= BOOST_MAX;
}
