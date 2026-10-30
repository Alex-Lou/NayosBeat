import { describe, expect, it } from 'vitest';
import {
  DANGER,
  FLASH_GAP,
  FLASH_TICKS,
  freshHealth,
  inDanger,
  REFILL_RATE,
  SHAKE_TICKS,
  shakeOffset,
  stepHealth,
  TRAIL_DRAIN,
  TRAIL_HOLD,
  type HealthMotion,
} from '../../src/render/health-motion';

/** Steps `motion` one tick at a time for `ticks` ticks, the fighter on `ratio`. */
function run(motion: HealthMotion, ticks: number, ratio: number, comboed = false): HealthMotion {
  let state = motion;
  for (let tick = 0; tick < ticks; tick++) {
    state = stepHealth(state, ratio, comboed, state.frame + 1);
  }
  return state;
}

describe('health bar motion', () => {
  it('drops the bar at once and leaves the trail behind it', () => {
    const hit = stepHealth(freshHealth(0), 0.8, false, 1);
    expect(hit.bar).toBe(0.8);
    expect(hit.trail).toBe(1);
    // The blow's tick is the flash's first: it lasts FLASH_TICKS ticks.
    expect(hit.flash).toBe(FLASH_TICKS);
    expect(hit.flashFrom).toBe(1);
    expect(run(hit, FLASH_TICKS - 1, 0.8).flash).toBe(1);
    expect(run(hit, FLASH_TICKS, 0.8).flash).toBe(0);
  });

  it('holds the trail, then drains it into the bar', () => {
    const hit = stepHealth(freshHealth(0), 0.8, false, 1);
    const waiting = run(hit, TRAIL_HOLD - 2, 0.8);
    expect(waiting.trail).toBe(1);
    const drained = run(waiting, 2 + Math.ceil(0.2 / TRAIL_DRAIN), 0.8);
    expect(drained.trail).toBeCloseTo(0.8, 10);
  });

  it('keeps the whole combo in the trail until the combo ends', () => {
    let state = stepHealth(freshHealth(0), 0.9, true, 1);
    state = run(state, 40, 0.9, true);
    state = stepHealth(state, 0.75, true, state.frame + 1);
    state = run(state, 40, 0.75, true);
    expect(state.trail).toBe(1);
    expect(state.bar).toBe(0.75);
    // Combo over: the trail waits its usual beat, then drains.
    state = run(state, TRAIL_HOLD, 0.75);
    expect(state.trail).toBe(1);
    state = run(state, 1, 0.75);
    expect(state.trail).toBeLessThan(1);
  });

  it('shakes on a heavy blow only, side to side', () => {
    expect(stepHealth(freshHealth(0), 0.97, false, 1).shake).toBe(0);
    const heavy = stepHealth(freshHealth(0), 0.85, false, 1);
    expect(heavy.shake).toBe(SHAKE_TICKS);
    const offsets = new Set([shakeOffset(heavy), shakeOffset(run(heavy, 1, 0.85))]);
    expect(offsets).toEqual(new Set([1, -1]));
    expect(shakeOffset(run(heavy, SHAKE_TICKS, 0.85))).toBe(0);
  });

  it('flashes 3 times a second at most, however fast the blows come (D21)', () => {
    let state = stepHealth(freshHealth(0), 0.9, true, 1);
    expect(state.flash).toBeGreaterThan(0);
    state = run(state, FLASH_GAP - 2, 0.9, true);
    state = stepHealth(state, 0.8, true, state.frame + 1);
    expect(state.flash).toBe(0);
    state = run(state, 1, 0.8, true);
    state = stepHealth(state, 0.7, true, state.frame + 1);
    expect(state.flash).toBe(FLASH_TICKS);
    // It lights up that blow only, the rest of the combo staying red.
    expect(state.flashFrom).toBe(0.8);
    expect(state.trail).toBe(1);
  });

  it('fills back up for a new round, and starts empty with a new match', () => {
    const low = run(stepHealth(freshHealth(0), 0.3, false, 1), 100, 0.3);
    const filling = stepHealth(low, 1, false, low.frame + 1);
    expect(filling.bar).toBeCloseTo(0.3 + REFILL_RATE, 10);
    expect(filling.trail).toBe(filling.bar);
    expect(filling.flash).toBe(0);
    expect(run(filling, Math.ceil(0.7 / REFILL_RATE), 1).bar).toBe(1);
    const match = stepHealth(low, 1, false, 0);
    expect(match.bar).toBe(0);
    const full = Math.ceil(1 / REFILL_RATE) + 1;
    expect(run(match, full, 1)).toEqual(freshHealth(full));
  });

  it('warns in danger, not once knocked out, nor while refilling for a new round', () => {
    expect(inDanger(freshHealth(0, DANGER))).toBe(true);
    expect(inDanger(freshHealth(0, DANGER + 0.01))).toBe(false);
    expect(inDanger(freshHealth(0, 0))).toBe(false);
    let refill = freshHealth(0, 0);
    for (let frame = 1; frame <= 60; frame++) {
      refill = stepHealth(refill, 1, false, frame);
      expect(inDanger(refill), `tick ${frame}`).toBe(false);
    }
  });

  it('flashes and shakes as long at any frame rate', () => {
    // Drawn every 4 ticks (15 images a second), the blow still shows its whole flash.
    const slow = stepHealth(stepHealth(freshHealth(0), 1, false, 4), 0.8, false, 8);
    expect(slow.flash).toBe(FLASH_TICKS);
    expect(slow.shake).toBe(SHAKE_TICKS);
  });

  it('skips the ticks of a long pause rather than replaying them all', () => {
    const hit = stepHealth(freshHealth(0), 0.5, false, 1);
    const later = stepHealth(hit, 0.5, false, 100_000);
    expect(later).toEqual({ ...run(hit, 120, 0.5), frame: 100_000 });
  });
});
