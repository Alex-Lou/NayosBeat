import { describe, expect, it } from 'vitest';
import { relativeLuminance } from '../../src/render/luminance';
import { hitStyleOf } from '../../src/render/hit-styles';
import {
  CONTOUR_BASE,
  contourOf,
  DEFAULT_SILHOUETTE,
  silhouetteFromUrl,
} from '../../src/render/silhouette';

/** WCAG contrast ratio of two colors (1 to 21). */
function contrast(a: number, b: number): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const SKY = 0x1b1b2f;
/** The outfits' two tones (docs/polish/AUDIT-ET-PLAN.md L1). */
const DARK_TONE = 0x19191e;
const LIGHT_TONE = 0x36363f;

describe('the silhouette look the address asks for, read once at startup', () => {
  it('is the contour by default, as the plan recommends', () => {
    expect(DEFAULT_SILHOUETTE).toBe('outline');
    expect(silhouetteFromUrl('')).toBe('outline');
  });

  it('reads ?silhouette=a, b or aucune, among the other parameters', () => {
    expect(silhouetteFromUrl('?silhouette=a')).toBe('outline');
    expect(silhouetteFromUrl('?silhouette=b')).toBe('backlight');
    expect(silhouetteFromUrl('?silhouette=aucune')).toBe('none');
    expect(silhouetteFromUrl('?debug&rendu=canvas&silhouette=b')).toBe('backlight');
  });

  it('keeps the default for what it does not know', () => {
    for (const wrong of [
      '?silhouette=',
      '?silhouette=c',
      '?silhouette=B',
      '?silhouette=constructor',
    ]) {
      expect(silhouetteFromUrl(wrong)).toBe('outline');
    }
  });
});

describe('the contour color (option A)', () => {
  it('stands out at 2.6:1 from the sky and the outfits’ dark tone, 1.85:1 from their light one', () => {
    expect(contrast(CONTOUR_BASE, SKY)).toBeCloseTo(2.61, 2);
    expect(contrast(CONTOUR_BASE, DARK_TONE)).toBeCloseTo(2.71, 2);
    expect(contrast(CONTOUR_BASE, LIGHT_TONE)).toBeCloseTo(1.85, 2);
  });

  it('takes 30 % of each colorway’s energy, which only raises its contrasts', () => {
    for (const fighter of ['nayo', 'riff'] as const) {
      for (const colorway of ['main', 'alt'] as const) {
        const contour = contourOf(hitStyleOf(fighter, colorway).energy);
        expect(contour, `${fighter} ${colorway}`).not.toBe(CONTOUR_BASE);
        for (const backdrop of [SKY, DARK_TONE, LIGHT_TONE]) {
          expect(contrast(contour, backdrop)).toBeGreaterThanOrEqual(
            contrast(CONTOUR_BASE, backdrop),
          );
        }
      }
    }
  });
});
