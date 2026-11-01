import { describe, expect, it, vi } from 'vitest';
import { hitStyleOf } from '../../src/render/hit-styles';
import { SparkMeter } from './spark-area';

vi.mock('phaser', () => ({
  default: { BlendModes: { NORMAL: 0, ADD: 1 }, Textures: { FilterMode: { LINEAR: 0 } } },
}));

/**
 * The recipe (P5), written out rather than read from the code under test: an opaque heart 24 px
 * wide at most, 10 px back toward the attacker, whole for 3 frames.
 */
const RECIPE = { heart: 24, back: 10, whole: 3 } as const;
/** The heart's disc at its widest (world px²). */
const HEART = Math.PI * (RECIPE.heart / 2) ** 2;
/** What its rays and sparks may still hide from then on: a 9 × 9 square in all. */
const RAYS_ONLY = 81;
/** Of the heart's place (a disc of 6 px around it, 113 px²), what they may hide: a quarter. */
const THROUGH_THE_HEART = 28;

/** World px² an effect hides over its frames. */
const hidden = (covers: readonly { opaque: number }[]) =>
  covers.reduce((sum, cover) => sum + cover.opaque, 0);

describe("a special's spark shows the contact without hiding the victim (docs/polish/AUDIT-ET-PLAN.md, P5)", () => {
  for (const fighter of ['nayo', 'riff'] as const) {
    it(`${fighter}: an opaque heart ${RECIPE.heart} px wide at most, on the contact, its victim seen from the ${RECIPE.whole + 1}th frame`, () => {
      const meter = new SparkMeter();
      const style = hitStyleOf(fighter);
      const covers = meter.covers(style, 'pinpoint', 14, -RECIPE.back);
      // The blow goes right: its attacker stands on the left, the heart 10 px back toward it.
      covers.slice(0, RECIPE.whole).forEach((cover, frame) => {
        expect(cover.opaque, `frame ${frame}`).toBeGreaterThan(0);
        expect(cover.opaque, `frame ${frame}`).toBeLessThanOrEqual(HEART);
        expect(Math.abs(cover.middle + RECIPE.back), `frame ${frame}`).toBeLessThanOrEqual(1.5);
      });
      covers.slice(RECIPE.whole).forEach((cover, i) => {
        expect(cover.opaque, `frame ${RECIPE.whole + i}`).toBeLessThanOrEqual(RAYS_ONLY);
        expect(cover.heart, `frame ${RECIPE.whole + i}`).toBeLessThanOrEqual(THROUGH_THE_HEART);
      });
    });
  }

  it('frees the victim frames sooner than the bursts the Vinyles played before (L3)', () => {
    const style = hitStyleOf('nayo');
    const opaque = (kind: 'light' | 'heavy') =>
      new SparkMeter().covers(style, kind, 8).map((cover) => cover.opaque);
    // The Vinyle's (light) still hides its victim on the 4th and 5th frames, the Vinyle
    // platine's (heavy) up to the 8th: where the special's shows its sparks alone.
    expect(Math.min(...opaque('light').slice(3, 5))).toBeGreaterThan(150);
    expect(Math.min(...opaque('heavy').slice(3, 8))).toBeGreaterThan(400);
    expect(hidden(new SparkMeter().covers(style, 'pinpoint', 14)) * 3).toBeLessThan(
      hidden(new SparkMeter().covers(style, 'light', 14)),
    );
  });
});
