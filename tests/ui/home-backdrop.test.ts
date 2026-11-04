import { describe, expect, it } from 'vitest';
import { homeStageScale } from '../../src/ui/home-backdrop';

describe('the home backdrop (src/ui/home-backdrop.ts)', () => {
  it('covers the screen with the 480 × 270 view, its floor at the bottom', () => {
    expect(homeStageScale(480, 270)).toBeCloseTo(0.5);
    expect(homeStageScale(1280, 720)).toBeCloseTo(4 / 3);
    expect(homeStageScale(960, 540)).toBeCloseTo(1);
  });

  it('crops the sky on a wider phone, never leaving an empty band', () => {
    // 844 × 390 is wider than 16:9: the width asks for the larger scale.
    expect(homeStageScale(844, 390)).toBeCloseTo(844 / 480 / 2);
    expect(homeStageScale(1920, 1080)).toBeCloseTo(2);
  });

  it('has a safe scale before the page has a size', () => {
    expect(homeStageScale(0, 0)).toBeCloseTo(0.5);
    expect(homeStageScale(Number.NaN, Number.NaN)).toBeCloseTo(0.5);
  });
});
