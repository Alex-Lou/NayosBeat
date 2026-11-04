import { describe, expect, it } from 'vitest';
import { menuStageScale } from '../../src/ui/menu-backdrop';

describe('the menus key art (src/ui/menu-backdrop.ts)', () => {
  it('covers the screen with the 480 × 270 view, its bottom at the screen bottom', () => {
    expect(menuStageScale(480, 270)).toBeCloseTo(0.5);
    expect(menuStageScale(1280, 720)).toBeCloseTo(4 / 3);
    expect(menuStageScale(960, 540)).toBeCloseTo(1);
  });

  it('crops the top on a wider phone, never leaving an empty band', () => {
    // 844 × 390 is wider than 16:9: the width asks for the larger scale.
    expect(menuStageScale(844, 390)).toBeCloseTo(844 / 480 / 2);
    expect(menuStageScale(1920, 1080)).toBeCloseTo(2);
  });

  it('has a safe scale before the page has a size', () => {
    expect(menuStageScale(0, 0)).toBeCloseTo(0.5);
    expect(menuStageScale(Number.NaN, Number.NaN)).toBeCloseTo(0.5);
  });
});
