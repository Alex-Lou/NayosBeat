import { describe, expect, it } from 'vitest';
import { computeZoom } from '../../src/render/pixel-scaling';

const BASE = { width: 480, height: 270 };

describe('computeZoom', () => {
  it('uses an exact integer scale on 1080p', () => {
    expect(computeZoom({ width: 1920, height: 1080 }, BASE, 1)).toBe(4);
  });

  it('keeps the largest integer scale when it fills enough of the screen', () => {
    // fit 4.07 -> integer 4 fills 98% of the available space.
    expect(computeZoom({ width: 2000, height: 1100 }, BASE, 1)).toBe(4);
  });

  it('falls back to a fractional scale when integer scaling wastes too much space', () => {
    // 1366x768: fit 2.84 -> integer 2 would fill only 70%.
    expect(computeZoom({ width: 1366, height: 768 }, BASE, 1)).toBeCloseTo(768 / 270);
  });

  it('scales by integers in device pixels on high-DPI screens', () => {
    // Phone in landscape, 844x390 CSS px at DPR 3: device fit 4.33 -> 4 device px per pixel.
    expect(computeZoom({ width: 844, height: 390 }, BASE, 3)).toBeCloseTo(4 / 3);
  });

  it('is pixel-perfect at 125% OS scaling', () => {
    // 1920x1080 physical at DPR 1.25 = 1536x864 CSS px.
    expect(computeZoom({ width: 1536, height: 864 }, BASE, 1.25)).toBeCloseTo(4 / 1.25);
  });

  it('shrinks below 1 when the viewport is smaller than the base size', () => {
    expect(computeZoom({ width: 240, height: 135 }, BASE, 1)).toBe(0.5);
  });

  it('returns 1 for degenerate input', () => {
    expect(computeZoom({ width: 0, height: 0 }, BASE, 1)).toBe(1);
    expect(computeZoom({ width: 1920, height: 1080 }, BASE, 0)).toBe(4);
  });
});
