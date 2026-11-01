import { describe, expect, it } from 'vitest';
import type { Colorway } from '../../src/art';
import { ROSTER } from '../../src/data/roster';
import {
  BREATH_DELTA,
  BREATH_TICKS,
  haloAlpha,
  haloLook,
  haloPresence,
} from '../../src/render/finisher-halo';
import { SIGNAL_FADE_TICKS } from '../../src/render/finisher-signal';
import { hitStyleOf } from '../../src/render/hit-styles';
import { FLASH_DELTA, luminanceDelta, over, relativeLuminance } from '../../src/render/luminance';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { VEIL_DELTA } from '../../src/render/veils';

/** Every fighter's energy in each outfit: the halo's color. */
const ENERGIES = ROSTER.flatMap(({ id }) =>
  (['main', 'alt'] as const satisfies readonly Colorway[]).map(
    (colorway) => hitStyleOf(id, colorway).energy,
  ),
);
const CYAN = 0x30e8ff;

/** The luminance of the halo at `alpha` over `backdrop`. */
const lit = (energy: number, backdrop: number, alpha: number): number =>
  relativeLuminance(over(energy, backdrop, alpha));

describe('the halo under a fighter whose Finisher is ready (docs/finisher.md §1.2)', () => {
  it('glows, never flashes: ΔL ≤ 0.08 over every color of the stage (0.27 in cyan)', () => {
    expect(haloLook(CYAN, FIGHT_STAGE_COLORS).bright).toBeCloseTo(0.27, 2);
    for (const energy of ENERGIES) {
      const { bright } = haloLook(energy, FIGHT_STAGE_COLORS);
      for (const backdrop of FIGHT_STAGE_COLORS) {
        const delta = luminanceDelta(energy, backdrop, bright);
        expect(delta, energy.toString(16)).toBeLessThanOrEqual(VEIL_DELTA + 1e-6);
        expect(delta).toBeLessThan(FLASH_DELTA);
      }
    }
  });

  it('breathes once a measure, its luminance moving by 0.05 at most, smoothly', () => {
    expect(BREATH_TICKS).toBe(120);
    for (const energy of ENERGIES) {
      const look = haloLook(energy, FIGHT_STAGE_COLORS);
      expect(look.faint).toBeLessThan(look.bright);
      const alphas = Array.from({ length: 2 * BREATH_TICKS }, (_, tick) =>
        haloAlpha(look, tick, true),
      );
      expect(Math.max(...alphas)).toBeCloseTo(look.bright, 6);
      expect(Math.min(...alphas)).toBeCloseTo(look.faint, 6);
      // One breath a measure: the same opacity a measure later.
      for (let tick = 0; tick < BREATH_TICKS; tick++) {
        expect(alphas[tick + BREATH_TICKS]).toBeCloseTo(alphas[tick] ?? 0, 9);
      }
      for (const backdrop of FIGHT_STAGE_COLORS) {
        const shown = alphas.map((alpha) => lit(energy, backdrop, alpha));
        expect(Math.max(...shown) - Math.min(...shown)).toBeLessThanOrEqual(BREATH_DELTA + 1e-6);
        // Never a jump from one tick to the next.
        shown.forEach((value, tick) => {
          if (tick > 0) expect(Math.abs(value - (shown[tick - 1] ?? 0))).toBeLessThan(0.005);
        });
      }
    }
  });

  it('holds still for those who keep the screen calm or still: its brightest, steady', () => {
    const look = haloLook(CYAN, FIGHT_STAGE_COLORS);
    for (let tick = 0; tick < BREATH_TICKS; tick += 7) {
      expect(haloAlpha(look, tick, false)).toBe(look.bright);
    }
  });

  it('fades in and out with the signal, over 6 ticks', () => {
    expect(SIGNAL_FADE_TICKS).toBe(6);
    let presence = 0;
    const shown: number[] = [];
    for (let tick = 0; tick < SIGNAL_FADE_TICKS; tick++) {
      presence = haloPresence(presence, true, 1);
      shown.push(presence);
    }
    expect(shown[SIGNAL_FADE_TICKS - 1]).toBeCloseTo(1, 9);
    expect(shown[0]).toBeCloseTo(1 / SIGNAL_FADE_TICKS, 9);
    expect(haloPresence(1, true, 10)).toBe(1);
    expect(haloPresence(1, false, 3)).toBeCloseTo(0.5, 9);
    expect(haloPresence(0.5, false, 10)).toBe(0);
    // A frame without a tick (above 60 Hz) moves nothing.
    expect(haloPresence(0.5, true, 0)).toBe(0.5);
  });
});
