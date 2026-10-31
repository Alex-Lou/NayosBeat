import { describe, expect, it } from 'vitest';
import { MAX_CLOSE_UP } from '../../src/render/camera-framing';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { hitStyleOf } from '../../src/render/hit-styles';
import {
  alphaForDelta,
  luminanceDelta,
  over,
  redRatio,
  relativeLuminance,
  SATURATED_RED,
} from '../../src/render/luminance';
import {
  CALM_DELTA,
  DIM_COLOR,
  ECLAT_DELTA,
  GLOW_SIZE,
  glowProfile,
  HALO_COLOR,
  HALO_DELTA,
  koVeil,
  superDim,
  superHalo,
  VEIL_DELTA,
  veilAlpha,
  veilLife,
  vignetteProfile,
  type VeilLook,
} from '../../src/render/veils';

/** Every fighter's energy, both colorways: the colors of the KO's veils. */
const ENERGIES = (['nayo', 'riff'] as const).flatMap((fighter) =>
  (['main', 'alt'] as const).map((colorway) => hitStyleOf(fighter, colorway).energy),
);
/** WCAG 2.3.1: a flash changes the luminance by 0.1 or more. */
const FLASH = 0.1;
/** The smallest area, world pixels, that a flash of the normal mode counts from (docs/flashs.md §1.1). */
const FLASH_AREA = 1200;

describe('the luminance of a flash (WCAG 2.x)', () => {
  it('measures black, white and the primaries as the WCAG does', () => {
    expect(relativeLuminance(0x000000)).toBe(0);
    expect(relativeLuminance(0xffffff)).toBeCloseTo(1, 6);
    expect(relativeLuminance(0x00ff00)).toBeCloseTo(0.7152, 4);
    expect(relativeLuminance(0x808080)).toBeCloseTo(0.2159, 3);
  });

  it('blends a color over another, and finds the alpha for a given change', () => {
    expect(over(0xffffff, 0x000000, 0.5)).toBe(0x808080);
    expect(over(0x30e8ff, 0x1b1b2f, 0)).toBe(0x1b1b2f);
    for (const backdrop of GREYBOX_COLORS) {
      const alpha = alphaForDelta(0xffffff, backdrop, 0.08);
      expect(luminanceDelta(0xffffff, backdrop, alpha)).toBeLessThanOrEqual(0.08);
      expect(luminanceDelta(0xffffff, backdrop, alpha + 0.01)).toBeGreaterThan(0.08);
    }
    // A dark veil over a dark stage cannot change it that much, whatever its alpha.
    expect(alphaForDelta(DIM_COLOR, 0x1b1b2f, 0.08)).toBe(1);
  });

  it('tells a saturated red on the linear channels: no fighter energy is one', () => {
    expect(redRatio(0xff0000)).toBe(1);
    expect(redRatio(0xb80200)).toBeGreaterThanOrEqual(SATURATED_RED);
    for (const energy of ENERGIES) expect(redRatio(energy)).toBeLessThan(SATURATED_RED);
    for (const color of [DIM_COLOR, HALO_COLOR])
      expect(redRatio(color)).toBeLessThan(SATURATED_RED);
  });
});

/** The largest change of luminance a veil makes on the stage, at its peak. */
function peakDelta(look: VeilLook): number {
  return Math.max(
    ...GREYBOX_COLORS.map((backdrop) => luminanceDelta(look.color, backdrop, look.alpha)),
  );
}

describe('the veils (docs/flashs.md §1.2, §2)', () => {
  it("darkens the stage on a super's freeze without a flash, held through the freeze", () => {
    const dim = superDim(GREYBOX_COLORS);
    expect(dim.color).toBe(DIM_COLOR);
    expect(dim.alpha).toBeLessThanOrEqual(0.55);
    expect(peakDelta(dim)).toBeLessThan(FLASH);
    expect(peakDelta(dim)).toBeLessThanOrEqual(VEIL_DELTA);
    // Up to the freeze's end (20 ticks), it holds.
    expect(veilAlpha(dim, 19)).toBe(dim.alpha);
    // On a bright stage, it holds back.
    expect(superDim([0xd0d0e0]).alpha).toBeLessThan(dim.alpha);
  });

  it('glows a platine halo behind the super, its flash on a small area only', () => {
    const halo = superHalo(GREYBOX_COLORS);
    expect(halo.color).toBe(HALO_COLOR);
    expect(peakDelta(halo)).toBeLessThanOrEqual(HALO_DELTA + 1e-9);
    expect(peakDelta(halo)).toBeGreaterThan(HALO_DELTA - 0.02);
    for (const backdrop of GREYBOX_COLORS) {
      expect(flashArea(halo, GLOW_SIZE.halo, backdrop)).toBeLessThan(FLASH_AREA);
      expect(flashArea(halo, GLOW_SIZE.halo, backdrop)).toBeGreaterThan(0);
    }
  });

  it("softens a KO's veils with the flashes reduced, and inks them off or refused", () => {
    for (const energy of ENERGIES) {
      const calm = koVeil('combo', energy, GREYBOX_COLORS, 'reduced');
      if (!calm) throw new Error('No vignette');
      expect(peakDelta(calm)).toBeLessThanOrEqual(CALM_DELTA);
      const eclat = koVeil('ultimate', energy, GREYBOX_COLORS, 'reduced');
      if (!eclat) throw new Error('No éclat');
      expect(peakDelta(eclat)).toBeLessThanOrEqual(VEIL_DELTA);
      for (const [finish, mode, lit] of [
        ['combo', 'off', true],
        ['ultimate', 'off', true],
        ['ultimate', 'normal', false],
      ] as const) {
        const ink = koVeil(finish, energy, GREYBOX_COLORS, mode, lit);
        expect(ink, `${finish} ${mode}`).toMatchObject({ color: DIM_COLOR });
        if (!ink) continue;
        // It darkens: drawn over the stage, it never makes it lighter.
        for (const backdrop of GREYBOX_COLORS) {
          const after = relativeLuminance(over(ink.color, backdrop, ink.alpha));
          expect(after).toBeLessThanOrEqual(relativeLuminance(backdrop));
        }
      }
    }
  });

  it('leaves a KO alone without a veil, vignettes a combo end, bursts an Ultime', () => {
    for (const energy of ENERGIES) {
      expect(koVeil('plain', energy, GREYBOX_COLORS)).toBeNull();
      const vignette = koVeil('combo', energy, GREYBOX_COLORS);
      expect(vignette).toMatchObject({ kind: 'vignette', color: energy });
      if (!vignette) continue;
      // Even in the corners, where it is whole: never a flash.
      expect(peakDelta(vignette)).toBeLessThanOrEqual(VEIL_DELTA);
      expect(peakDelta(vignette)).toBeGreaterThan(VEIL_DELTA - 0.01);
      const eclat = koVeil('ultimate', energy, GREYBOX_COLORS);
      expect(eclat).toMatchObject({ kind: 'eclat', color: energy });
      if (!eclat) continue;
      // Its heart: the KO's one flash, as strong for a cyan as for a magenta.
      expect(peakDelta(eclat)).toBeLessThanOrEqual(ECLAT_DELTA);
      expect(peakDelta(eclat)).toBeGreaterThan(ECLAT_DELTA - 0.02);
    }
  });

  it('bursts the éclat from the impact, fading to nothing: never a tint of the whole screen', () => {
    // At its closest, the camera shows 480 / 1.45 world pixels across.
    const across = 480 / MAX_CLOSE_UP;
    expect(GLOW_SIZE.eclat).toBeLessThan(2 * across);
    expect(GLOW_SIZE.eclat).toBeGreaterThan(across);
    expect(glowProfile(0)).toBe(1);
    expect(glowProfile(0.25)).toBeGreaterThan(0.6);
    expect(glowProfile(0.5)).toBeLessThan(0.2);
    // No edge to its circle.
    expect(glowProfile(0.95)).toBeLessThan(0.001);
    expect(glowProfile(1)).toBe(0);
    for (let r = 0; r < 1; r += 0.01)
      expect(glowProfile(r + 0.01)).toBeLessThanOrEqual(glowProfile(r));
  });

  it("keeps the vignette clear in the screen's middle, whole in its corners", () => {
    expect(vignetteProfile(0, 0)).toBe(0);
    expect(vignetteProfile(0.5, 0.3)).toBe(0);
    expect(vignetteProfile(1, 0)).toBeGreaterThan(0.3);
    expect(vignetteProfile(1, 0)).toBeLessThan(0.6);
    expect(vignetteProfile(1, 1)).toBe(1);
    expect(vignetteProfile(-1, 1)).toBe(1);
  });

  it('rises in a few frames, holds, then fades smoothly: never a front of one frame', () => {
    const looks = [
      superDim(GREYBOX_COLORS),
      superHalo(GREYBOX_COLORS),
      ...ENERGIES.flatMap((energy) => [
        koVeil('combo', energy, GREYBOX_COLORS),
        koVeil('ultimate', energy, GREYBOX_COLORS),
      ]),
    ].filter((look) => look !== null);
    for (const look of looks) {
      expect(look.attack).toBeGreaterThanOrEqual(3);
      expect(look.release).toBeGreaterThanOrEqual(14);
      expect(veilAlpha(look, -1)).toBe(0);
      expect(veilAlpha(look, look.attack - 1)).toBeCloseTo(look.alpha, 9);
      expect(veilAlpha(look, veilLife(look))).toBe(0);
      let previous = 0;
      for (let age = 0; age <= veilLife(look); age++) {
        const alpha = veilAlpha(look, age);
        // Up by under 0.6 of its peak in one frame, down by under a fifth.
        expect(alpha - previous, `${look.kind} ${age}`).toBeLessThan(look.alpha * 0.6);
        expect(previous - alpha, `${look.kind} ${age}`).toBeLessThan(look.alpha * 0.2);
        previous = alpha;
      }
    }
  });
});

/** World pixels where a glow at its peak changes `backdrop`'s luminance by a flash's or more. */
function flashArea(look: VeilLook, size: number, backdrop: number): number {
  const radius = size / 2;
  let area = 0;
  for (let y = -radius; y < radius; y++) {
    for (let x = -radius; x < radius; x++) {
      const alpha = look.alpha * glowProfile(Math.hypot(x + 0.5, y + 0.5) / radius);
      if (luminanceDelta(look.color, backdrop, alpha) >= FLASH) area += 1;
    }
  }
  return area;
}
