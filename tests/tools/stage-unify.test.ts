import { describe, expect, it } from 'vitest';
import { toLab, unifyColor, unifyPalette } from '../../tools/stage/kit/unify';

describe('the common grade (docs/art/manifeste-pixel-art.md §2)', () => {
  it("pulls a warm shadow toward the fighters' violet-navy, its lightness kept", () => {
    const before = toLab(0x3a, 0x22, 0x18);
    const after = toLab(...unifyColor(0x3a, 0x22, 0x18));
    expect(Math.abs(after[0] - before[0])).toBeLessThan(1.5);
    // Its blue-yellow axis goes from warm (b > 0) toward the fighters' (b < 0).
    expect(after[2]).toBeLessThan(before[2] - 8);
  });

  it('leaves the lights as they are: the sunset, the lamps', () => {
    const [r, g, b] = unifyColor(0xff, 0xd0, 0x8e);
    expect(Math.abs(r - 0xff) + Math.abs(g - 0xd0) + Math.abs(b - 0x8e)).toBeLessThan(6);
  });

  it('keeps every opacity, slot 0 transparent', () => {
    const palette = unifyPalette([
      { r: 0, g: 0, b: 0, a: 0 },
      { r: 90, g: 50, b: 30, a: 255 },
      { r: 200, g: 150, b: 120, a: 120 },
    ]);
    expect(palette.map(({ a }) => a)).toEqual([0, 255, 120]);
    expect(palette[0]).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
});
