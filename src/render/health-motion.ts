import type { Breakage } from './boost-motion';

/**
 * How a health bar moves, tick by tick, apart from the health it shows (docs/art/direction-hud.md):
 * the damage trail that waits behind the bar while the combo goes on, then drains into it; the
 * flash of a hit; the shake of a heavy one; the refill of a new round; the KO that cracks it (the
 * end of a combo) or blows it up (an Ultime), like the Boost gauge. Pure: the HUD keeps one per
 * fighter and steps it to the match clock (GameState.frame) every frame it draws, so it pauses
 * with the game and plays the same at any frame rate.
 */

/** Ticks the trail waits after the last blow once the combo is over, before it drains. */
export const TRAIL_HOLD = 30;
/** How much of the bar the trail drains each tick: a full bar in 1.25 s. */
export const TRAIL_DRAIN = 1 / 75;
/** Ticks a hit lights the trail up. */
export const FLASH_TICKS = 4;
/** Ticks at least from one flash to the next: 3 a second at most (D21). */
export const FLASH_GAP = 20;
/** A blow taking this much of the bar or more shakes it, for this many ticks. */
export const HEAVY_HIT = 0.06;
export const SHAKE_TICKS = 8;
/** At or under this much health, the bar warns: the fighter is in danger (Strive, Granblue). */
export const DANGER = 0.3;
/** How much of the bar a refill (a new round) climbs each tick: a full bar in 0.75 s. */
export const REFILL_RATE = 1 / 45;
/** Ticks a KO takes to crack the bar, or to blow it up; then it stays so until the next round. */
export const BAR_CRACK_TICKS = 30;
export const BAR_BREAK_TICKS = 48;
/** Ticks stepped at most in one go (a long pause, a dropped tab): the rest is skipped. */
const MAX_STEP = 120;

export interface HealthMotion {
  /** The fighter's health, 0 to 1: what the danger is judged on (not the bar, still refilling). */
  readonly health: number;
  /** Health the bar shows, 0 to 1. */
  readonly bar: number;
  /** Where the damage trail ends, 0 to 1: never short of the bar. */
  readonly trail: number;
  /** Ticks the trail still waits before draining. */
  readonly hold: number;
  /**
   * Ticks left of the hit flash, ticks since it started (FLASH_GAP at most), and the health the
   * bar showed before the blow: the flash lights up what this blow took, not the whole trail.
   */
  readonly flash: number;
  readonly sinceFlash: number;
  readonly flashFrom: number;
  /** Ticks left of the shake. */
  readonly shake: number;
  /** Ticks since a KO started breaking the bar, -1 while whole; and how it breaks. */
  readonly broken: number;
  readonly breakage: Breakage;
  /** The match tick it was stepped to. */
  readonly frame: number;
}

/** A bar showing `ratio` at tick `frame`, still. */
export function freshHealth(frame: number, ratio = 1): HealthMotion {
  return {
    health: ratio,
    bar: ratio,
    trail: ratio,
    hold: 0,
    flash: 0,
    sinceFlash: FLASH_GAP,
    flashFrom: ratio,
    shake: 0,
    broken: -1,
    breakage: 'shatter',
    frame,
  };
}

/**
 * The bar at tick `frame`, for a fighter on `ratio` of their health; `comboed` while they are
 * being comboed (the trail waits for the combo to end, so it shows what the whole combo took).
 * Health going up (a new round) fills the bar back up at REFILL_RATE; a new match (the clock
 * going back) starts it empty. The ticks gone by are played first, then the blow seen at `frame`:
 * its flash and shake count that tick as their first, at any frame rate. `breakage`: how the
 * fighter's KO breaks the bar, from the KO to the next round (null when it stays whole).
 */
export function stepHealth(
  motion: HealthMotion,
  ratio: number,
  comboed: boolean,
  frame: number,
  breakage: Breakage | null = null,
): HealthMotion {
  const from = frame < motion.frame ? freshHealth(frame, 0) : motion;
  let { bar, trail, hold, flash, sinceFlash, flashFrom, shake, broken } = from;
  const ticks = Math.min(frame - from.frame, MAX_STEP);
  const lasts = breakage === 'crack' ? BAR_CRACK_TICKS : BAR_BREAK_TICKS;
  for (let tick = 0; tick < ticks; tick++) {
    if (broken >= 0 && broken < lasts) broken++;
    flash = Math.max(0, flash - 1);
    sinceFlash = Math.min(FLASH_GAP, sinceFlash + 1);
    shake = Math.max(0, shake - 1);
    if (bar < ratio) {
      bar = Math.min(ratio, bar + REFILL_RATE);
      trail = bar;
      flashFrom = bar;
      continue;
    }
    if (comboed) continue;
    if (hold > 0) hold--;
    else trail = Math.max(bar, trail - TRAIL_DRAIN);
  }
  if (ratio < bar) {
    if (sinceFlash >= FLASH_GAP) {
      flash = FLASH_TICKS;
      sinceFlash = 0;
      flashFrom = bar;
    }
    if (bar - ratio >= HEAVY_HIT) shake = SHAKE_TICKS;
    hold = TRAIL_HOLD;
    bar = ratio;
  }
  if (breakage === null) broken = -1;
  else if (broken < 0) broken = 0;
  return {
    health: ratio,
    bar,
    trail,
    hold,
    flash,
    sinceFlash,
    flashFrom,
    shake,
    broken,
    breakage: breakage ?? from.breakage,
    frame,
  };
}

/** The bar's sideways offset while it shakes, in view pixels: one pixel, side to side. */
export function shakeOffset(motion: HealthMotion): number {
  if (motion.shake === 0) return 0;
  return motion.shake % 2 === 0 ? 1 : -1;
}

/** Whether the fighter is in danger: the bar warns (not while it refills for a new round). */
export function inDanger(motion: HealthMotion): boolean {
  return motion.health > 0 && motion.health <= DANGER;
}
