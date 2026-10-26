import { describe, expect, it } from 'vitest';
import { frameFight, MAX_CLOSE_UP, type FramingInput } from '../../src/render/camera-framing';
import { VIEW_SIZE } from '../../src/render/view';

const GROUND_Y = 230;

/** Runs the easing until it settles. */
function settle(input: Omit<FramingInput, 'closeUp'>, closeUp = 1): ReturnType<typeof frameFight> {
  let framing = frameFight({ ...input, closeUp });
  for (let i = 0; i < 300; i++) framing = frameFight({ ...input, closeUp: framing.closeUp });
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
    });
    expect(first.closeUp).toBeGreaterThan(1);
    expect(first.closeUp).toBeLessThan(1.1);
  });
});
