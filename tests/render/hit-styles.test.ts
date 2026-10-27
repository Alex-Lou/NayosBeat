import { describe, expect, it } from 'vitest';
import {
  HD_SHAPES,
  paint,
  rasterize,
  type HdShape,
  type HdShapeName,
} from '../../src/render/hd-shapes';
import { hitStyleOf } from '../../src/render/hit-styles';
import { renderScaleFor } from '../../src/render/view';
import { ROSTER } from '../../src/data/roster';

describe('hit styles', () => {
  it('every fighter hits with its own shape or colors', () => {
    const styles = ROSTER.map((entry) => hitStyleOf(entry.id));
    const looks = new Set(styles.map((style) => `${style.shape}/${style.energy}/${style.strike}`));
    expect(looks.size).toBe(styles.length);
  });

  it('in a mirror match, the two players hit in different energy colors', () => {
    for (const { id } of ROSTER) {
      expect(hitStyleOf(id, 'alt').energy).not.toBe(hitStyleOf(id).energy);
    }
  });
});

describe('high definition shapes', () => {
  it.each(Object.keys(HD_SHAPES) as HdShapeName[])(
    '%s: soft edges, nothing on the texture border, some full pixels',
    (name) => {
      const shape = HD_SHAPES[name];
      const alphas = rasterize(shape);
      const { width, height } = shape;
      let max = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = alphas[y * width + x] ?? 0;
          max = Math.max(max, alpha);
          // A visible border would show the texture's rectangle once scaled.
          if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
            expect(alpha, `${name} at ${x},${y}`).toBeLessThan(40);
          }
        }
      }
      expect(max).toBeGreaterThan(200);
    },
  );

  it('a shape painted a few rows at a time is the same as painted at once', () => {
    for (const name of ['burstBlast', 'splash', 'glow'] as const) {
      const shape = HD_SHAPES[name];
      const whole = paint(shape);
      const rows = new Uint8ClampedArray(whole.length);
      for (let row = 0; row < shape.height; row += 8) {
        rows.set(paint(shape, 1, row, row + 8), row * shape.width * 4);
      }
      expect(
        rows.every((value, i) => value === whole[i]),
        name,
      ).toBe(true);
    }
  });

  it('painted shapes are colored, never white or grey where they show', () => {
    const painted = (Object.keys(HD_SHAPES) as HdShapeName[]).filter(
      (name) => (HD_SHAPES[name] as HdShape).color,
    );
    expect(painted.length).toBeGreaterThan(0);
    for (const name of painted) {
      const rgba = paint(HD_SHAPES[name]);
      for (let i = 0; i < rgba.length; i += 4) {
        const [r = 0, g = 0, b = 0, a = 0] = rgba.subarray(i, i + 4);
        // Smoke is dark slate; anything bright must carry a hue.
        if (a > 128 && Math.max(r, g, b) > 140) {
          expect(Math.max(r, g, b) - Math.min(r, g, b), `${name} pixel ${i / 4}`).toBeGreaterThan(
            60,
          );
        }
      }
    }
  });
});

describe('render scale', () => {
  it('draws effects in high definition when the screen can show 1920x1080', () => {
    expect(renderScaleFor({ width: 1920, height: 969 }, 1, false)).toBe(4);
    expect(renderScaleFor({ width: 1280, height: 720 }, 2, false)).toBe(4);
  });

  it('keeps the sprites resolution on small screens and on phones', () => {
    expect(renderScaleFor({ width: 1366, height: 657 }, 1, false)).toBe(2);
    expect(renderScaleFor({ width: 800, height: 360 }, 3, true)).toBe(2);
  });
});
