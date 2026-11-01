import { describe, expect, it } from 'vitest';
import {
  CLOSE_UP_EFFECTS,
  FINISHER_CLOSE_UP,
  frameAround,
  frameFight,
  MAX_CLOSE_UP,
  textResolution,
  type FramingInput,
} from '../../src/render/camera-framing';
import { VIEW_SIZE } from '../../src/render/view';

const GROUND_Y = 230;

/** Runs the easing until it settles. */
function settle(
  input: Omit<FramingInput, 'closeUp' | 'elapsed'>,
  closeUp = 1,
): ReturnType<typeof frameFight> {
  let framing = frameFight({ ...input, closeUp, elapsed: 1 });
  for (let i = 0; i < 300; i++) {
    framing = frameFight({ ...input, closeUp: framing.closeUp, elapsed: 1 });
  }
  return framing;
}

describe('fight camera framing', () => {
  it('closes in on fighters standing close', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect(framing.closeUp).toBeCloseTo(MAX_CLOSE_UP, 2);
  });

  it('shows the whole view when the fighters are far apart', () => {
    const framing = settle({ xs: [40, 440], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect(framing.closeUp).toBeCloseTo(1, 2);
    expect(framing.left).toBeCloseTo(0, 2);
  });

  it('opens up for a high jump so the jumper stays in view', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 90, viewLeft: 0, groundY: GROUND_Y });
    const visibleAboveGround = GROUND_Y / framing.closeUp;
    expect(visibleAboveGround).toBeGreaterThanOrEqual(90 + 90);
    expect(framing.closeUp).toBeLessThan(MAX_CLOSE_UP);
  });

  it('keeps the ground at the same place on screen', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect((GROUND_Y - framing.top) * framing.closeUp).toBeCloseTo(GROUND_Y, 5);
  });

  it('never shows anything outside the simulation camera', () => {
    for (const xs of [
      [5, 30],
      [450, 478],
      [100, 300],
    ]) {
      const framing = settle({ xs, highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
      expect(framing.left).toBeGreaterThanOrEqual(-1e-9);
      expect(framing.left + VIEW_SIZE.width / framing.closeUp).toBeLessThanOrEqual(
        VIEW_SIZE.width + 1e-9,
      );
    }
  });

  it('eases toward its framing instead of jumping', () => {
    const first = frameFight({
      xs: [220, 270],
      highestFeet: 0,
      viewLeft: 0,
      groundY: GROUND_Y,
      closeUp: 1,
      elapsed: 1,
    });
    expect(first.closeUp).toBeGreaterThan(1);
    expect(first.closeUp).toBeLessThan(1.1);
  });

  it('eases as fast at 144 Hz as at 60 Hz', () => {
    const input = { xs: [220, 270], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y };
    let at60 = frameFight({ ...input, closeUp: 1, elapsed: 1 });
    for (let i = 1; i < 30; i++) at60 = frameFight({ ...input, closeUp: at60.closeUp, elapsed: 1 });
    let at144 = frameFight({ ...input, closeUp: 1, elapsed: 60 / 144 });
    for (let i = 1; i < 72; i++) {
      at144 = frameFight({ ...input, closeUp: at144.closeUp, elapsed: 60 / 144 });
    }
    expect(at144.closeUp).toBeCloseTo(at60.closeUp, 6);
  });
});

describe("the Finisher's close up (docs/finisher.md §1.14)", () => {
  it('frames ×2 around its impact, the ground kept at the bottom, inside the simulation’s camera', () => {
    const close = frameAround(300, FINISHER_CLOSE_UP, 0, GROUND_Y);
    expect(close.left).toBeCloseTo(300 - VIEW_SIZE.width / 4, 5);
    // 115 px of the world over the ground (and the HUD covers the 15 at the top).
    expect(GROUND_Y - close.top).toBeCloseTo(115, 5);
    // Never past the simulation camera's walls.
    expect(frameAround(20, FINISHER_CLOSE_UP, 0, GROUND_Y).left).toBe(0);
    expect(CLOSE_UP_EFFECTS).toBeCloseTo(0.725, 5);
  });

  it('draws the texts of the world as sharp as the close up they show at', () => {
    expect(textResolution(1920)).toBe(Math.ceil(4 * MAX_CLOSE_UP));
    expect(textResolution(1920, FINISHER_CLOSE_UP)).toBe(8);
  });
});
