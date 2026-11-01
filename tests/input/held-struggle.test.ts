import { describe, expect, it } from 'vitest';
import { Input, type InputBits } from '../../src/core/input';
import { GRAB_TECH_FRAMES, HOLD_LIMIT_FRAMES } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { HELD_STRUGGLE_PERIOD, HeldStruggle } from '../../src/input/held-struggle';
import { grabbed, NAYO_MIRROR } from '../core/hold-helpers';

/**
 * Player 1 grabs player 2, who holds Light down from the grab on, through `struggle` if given:
 * the hold's limit at its end, or the last one seen.
 */
function holdingLight(struggle?: HeldStruggle): { limit: number; inputs: InputBits[] } {
  let state: GameState = grabbed();
  let limit = state.hold?.limit ?? 0;
  const inputs: InputBits[] = [];
  for (let tick = 0; tick < 120 && state.hold; tick++) {
    const held = struggle ? struggle.apply(1, Input.Light, state) : Input.Light;
    inputs.push(held);
    state = step(state, [0, held], NAYO_MIRROR);
    limit = state.hold?.limit ?? limit;
  }
  return { limit, inputs };
}

describe('« Lutte en prise : tenir » (docs/polish/AUDIT-ET-PLAN.md, P25)', () => {
  it('struggles as a mashing hand does, a press every 12 ticks, out of a button held', () => {
    const held = holdingLight(new HeldStruggle(true));
    // Held without the option: never a new press, the hold lasts its whole limit.
    expect(holdingLight().limit).toBe(HOLD_LIMIT_FRAMES);
    expect(held.limit).toBeLessThan(HOLD_LIMIT_FRAMES);
    // Let go one tick in twelve, never before the clinch is over.
    const released = held.inputs.flatMap((bits, tick) => (bits === 0 ? [tick] : []));
    expect(released.length).toBeGreaterThan(0);
    for (const [index, tick] of released.entries()) {
      if (index > 0) expect(tick - (released[index - 1] ?? 0)).toBe(HELD_STRUGGLE_PERIOD);
    }
    expect(released[0]).toBeGreaterThanOrEqual(GRAB_TECH_FRAMES);
  });

  it('stays slower than a hand mashing at the Hard pace: 5 presses a second, under 8', () => {
    expect(60 / HELD_STRUGGLE_PERIOD).toBe(5);
    expect(60 / HELD_STRUGGLE_PERIOD).toBeLessThan(8);
  });

  it('changes nothing off, out of a grab, for the holder, or in the clinch', () => {
    const state = grabbed();
    const on = new HeldStruggle(true);
    const off = new HeldStruggle(false);
    for (let tick = 0; tick < 40; tick++) {
      expect(off.apply(1, Input.Light, state)).toBe(Input.Light);
      // The holder (player 1) holds its buttons as it likes.
      expect(on.apply(0, Input.Light, state)).toBe(Input.Light);
    }
    // In the clinch (the tech's window), the held fighter's buttons pass as they are.
    if (!state.hold) throw new Error('No hold');
    expect(state.hold.frame).toBeLessThan(GRAB_TECH_FRAMES);
    for (let tick = 0; tick < 40; tick++) expect(on.apply(1, Input.Grab, state)).toBe(Input.Grab);
    const free = { ...state, hold: null };
    for (let tick = 0; tick < 40; tick++) expect(on.apply(1, Input.Light, free)).toBe(Input.Light);
  });

  it('leaves the directions alone, and starts over once the button is let go', () => {
    const late = grabbed();
    if (!late.hold) throw new Error('No hold');
    const struggling = { ...late, hold: { ...late.hold, frame: GRAB_TECH_FRAMES } };
    const struggle = new HeldStruggle(true);
    const bits = Input.Light | Input.Left;
    const seen = Array.from({ length: HELD_STRUGGLE_PERIOD }, () =>
      struggle.apply(1, bits, struggling),
    );
    expect(seen.at(-1)).toBe(Input.Left);
    // Let go, then held again: a full period before the next one let go.
    struggle.apply(1, 0, struggling);
    const again = Array.from({ length: HELD_STRUGGLE_PERIOD - 1 }, () =>
      struggle.apply(1, bits, struggling),
    );
    expect(again.every((value) => value === bits)).toBe(true);
  });
});
