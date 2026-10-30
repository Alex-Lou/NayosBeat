import { describe, expect, it } from 'vitest';
import {
  HD_SHAPES,
  paint,
  rasterize,
  type HdShape,
  type HdShapeName,
} from '../../src/render/hd-shapes';
import { hitStyleOf, hudColorOf } from '../../src/render/hit-styles';
import { renderScaleFor } from '../../src/render/view';
import { ROSTER } from '../../src/data/roster';

describe('hit styles', () => {
  it('every fighter hits with its own shape or colors', () => {
    const styles = ROSTER.map((entry) => hitStyleOf(entry.id));
    const looks = new Set(styles.map((style) => `${style.shape}/${style.energy}/${style.strike}`));
    expect(looks.size).toBe(styles.length);
  });

  it('Riff hits magenta, her strikes silver-white; gold and crimson in her second outfit', () => {
    const rgb = (color: number): [number, number, number] => [
      (color >> 16) & 0xff,
      (color >> 8) & 0xff,
      color & 0xff,
    ];
    const [r, g, b] = rgb(hitStyleOf('riff').energy);
    expect(r).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(g + 60);
    const strike = rgb(hitStyleOf('riff').strike);
    expect(Math.min(...strike)).toBeGreaterThan(200);
    const [gr, gg, gb] = rgb(hitStyleOf('riff', 'alt').energy);
    expect(gr).toBeGreaterThan(gg);
    expect(gg).toBeGreaterThan(gb + 100);
    const [cr, cg, cb] = rgb(hitStyleOf('riff', 'alt').strike);
    expect(cr).toBeGreaterThan(200);
    expect(Math.max(cg, cb)).toBeLessThan(80);
  });

  it('shows every fighter on the HUD in a color apart from the health yellow (never gold)', () => {
    const hue = (color: number): number => {
      const [r, g, b] = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff].map(
        (c) => c / 255,
      );
      const max = Math.max(r ?? 0, g ?? 0, b ?? 0);
      const min = Math.min(r ?? 0, g ?? 0, b ?? 0);
      if (max === min) return 0;
      const d = max - min;
      const h =
        max === r
          ? ((g ?? 0) - (b ?? 0)) / d
          : max === g
            ? ((b ?? 0) - (r ?? 0)) / d + 2
            : ((r ?? 0) - (g ?? 0)) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const healthYellow = hue(0xf0c94a);
    for (const entry of ROSTER) {
      for (const colorway of ['main', 'alt'] as const) {
        const style = hitStyleOf(entry.id, colorway);
        const apart = Math.abs(hue(hudColorOf(style)) - healthYellow);
        expect(Math.min(apart, 360 - apart), `${entry.id} ${colorway}`).toBeGreaterThan(20);
      }
    }
    // Riff's second outfit: her crimson there, her gold in her blows.
    expect(hudColorOf(hitStyleOf('riff', 'alt'))).toBe(hitStyleOf('riff', 'alt').strike);
    expect(hudColorOf(hitStyleOf('nayo'))).toBe(hitStyleOf('nayo').energy);
  });

  it('the two players hit in different energy colors in every pairing', () => {
    // Nayo against Riff, both in their first outfit; a mirror match puts player 2 in the second.
    expect(hitStyleOf('nayo').energy).not.toBe(hitStyleOf('riff').energy);
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
