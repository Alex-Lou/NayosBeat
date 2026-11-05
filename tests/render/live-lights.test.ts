import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ART_SCALE } from '../../src/art/types';
import { hitStyleOf } from '../../src/render/hit-styles';
import {
  CALM_LIVE_DELTA,
  dimLevel,
  dimmed,
  DIM_TIMING,
  emits,
  falloff,
  FIGHTER_LIFT,
  FIGHTER_LIGHT_AREAS,
  glowAlpha,
  glowAt,
  glowScale,
  litColor,
  LIVE_DELTA,
  peakFalloff,
  strongestGlows,
  SUPER_DIM,
  type Glow,
} from '../../src/render/live-lights';
import {
  added,
  brightestBackdrop,
  FLASH_DELTA,
  relativeLuminance,
} from '../../src/render/luminance';
import { PLATINE } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { VEIL_DELTA } from '../../src/render/veils';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { cellPixels, savedStrip, type ColorwayName, type FighterName } from './fx-strips';

/**
 * The live lights (docs/art/nayo-vivante.md §2, docs/flashs.md §5): bounded on the stage's large
 * colors whatever their speed, the stage's own lights drawn over them, the fighters' bright pixels
 * measured on the real strips. Every measure is on the images the game ships.
 */

const STAGE = FIGHT_STAGE_COLORS;
/** Every color a light may take: both colorways' energies of every fighter, and the platine. */
const COLORS = [
  ...new Set([
    hitStyleOf('nayo').energy,
    hitStyleOf('nayo', 'alt').energy,
    hitStyleOf('riff').energy,
    hitStyleOf('riff', 'alt').energy,
    hitStyleOf('saphir').energy,
    hitStyleOf('saphir', 'alt').energy,
    PLATINE,
  ]),
];
const STRONGEST = strongestGlows(COLORS, STAGE);
/** Each color's glow at its heart, at every hundredth of a dim's levels. */
const FINE = COLORS.flatMap((light) =>
  Array.from({ length: 61 }, (_, i) => {
    const level = SUPER_DIM + ((1 - SUPER_DIM) * i) / 60;
    return { light, level, alpha: glowAlpha(light, STAGE, LIVE_DELTA, level) };
  }),
);

/** The stage's images, each atmosphere's (src/art/rue/ and its folders). */
async function stageImages(): Promise<Map<string, IndexedImage>> {
  const root = new URL('../../src/art/rue/', import.meta.url);
  const images = new Map<string, IndexedImage>();
  const read = async (folder: URL, prefix: string) => {
    for (const entry of await readdir(folder)) {
      // An atmosphere's folder has no extension; its images are the layers but the props' sheet.
      if (!entry.includes('.')) await read(new URL(`${entry}/`, folder), `${entry}/`);
      else if (entry.endsWith('.png') && entry !== 'props.png') {
        images.set(prefix + entry, await decodeIndexedPng(await readFile(new URL(entry, folder))));
      }
    }
  };
  await read(root, '');
  return images;
}

/** How much a glow of `color` at `alpha` raises `backdrop` under `level` (its dim). */
function raise(color: number, backdrop: number, alpha: number, level: number): number {
  const base = dimmed(backdrop, level);
  return relativeLuminance(added(color, base, alpha)) - relativeLuminance(base);
}

describe('the street under the live lights (docs/flashs.md §5)', () => {
  it(
    'raises none of its large colors by 0.09, the calm by 0.05, at any level of a dim',
    { timeout: 30_000 },
    () => {
      for (const color of COLORS) {
        for (let level = SUPER_DIM; level <= 1.0001; level += 0.01) {
          for (const [delta, bound] of [
            [LIVE_DELTA, LIVE_DELTA],
            [CALM_LIVE_DELTA, CALM_LIVE_DELTA],
          ] as const) {
            const alpha = glowAlpha(color, STAGE, delta, level);
            for (const backdrop of STAGE) {
              expect(raise(color, backdrop, alpha, level)).toBeLessThanOrEqual(bound);
            }
          }
        }
      }
    },
  );

  it('lights it boldly: right up to its bound on the brightest backdrop, the calm fainter', () => {
    for (const color of COLORS) {
      const backdrop = brightestBackdrop(STAGE);
      const alpha = glowAlpha(color, STAGE, LIVE_DELTA);
      expect(raise(color, backdrop, alpha, 1)).toBeGreaterThan(LIVE_DELTA * 0.9);
      expect(glowAlpha(color, STAGE, CALM_LIVE_DELTA)).toBeLessThan(alpha);
      // Under the super's dim, it may shine brighter: the street around the fist relit.
      expect(glowAlpha(color, STAGE, LIVE_DELTA, SUPER_DIM)).toBeGreaterThan(alpha);
    }
  });

  it('shares the glows that overlap, their hearts added up still under the bound', () => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let draw = 0; draw < 40; draw++) {
      const level = random() < 0.5 ? 1 : SUPER_DIM + random() * (1 - SUPER_DIM);
      const glows: Glow[] = Array.from({ length: 4 }, () => {
        const color = COLORS[Math.floor(random() * COLORS.length)] ?? PLATINE;
        return {
          x: 300 + random() * 120,
          y: 150 + random() * 60,
          radius: 90 + random() * 110,
          color,
          alpha: glowAlpha(color, STAGE, LIVE_DELTA, level) * (0.5 + random() / 2),
        };
      });
      const scale = glowScale(glows, glows.length, STAGE, LIVE_DELTA, level);
      // Sampled over the street: at no point do the glows added up reach the bound.
      const backdrop = dimmed(brightestBackdrop(STAGE), level);
      for (let x = 180; x <= 560; x += 6) {
        for (let y = 40; y <= 270; y += 6) {
          let red = 0;
          let green = 0;
          let blue = 0;
          for (const glow of glows) {
            const share =
              glow.alpha * scale * glowAt(Math.hypot(x - glow.x, y - glow.y), glow.radius);
            red += ((glow.color >> 16) & 0xff) * share;
            green += ((glow.color >> 8) & 0xff) * share;
            blue += (glow.color & 0xff) * share;
          }
          const sum =
            (Math.min(255, Math.ceil(red)) << 16) |
            (Math.min(255, Math.ceil(green)) << 8) |
            Math.min(255, Math.ceil(blue));
          const rise = relativeLuminance(added(sum, backdrop, 1)) - relativeLuminance(backdrop);
          expect(rise).toBeLessThan(LIVE_DELTA + 0.005);
        }
      }
    }
  });

  it("lights at ΔL ≥ 0.1 nothing of the street's images: what would rise is drawn over, as it is", async () => {
    let checked = 0;
    // The images share most of their colors: each is judged once, whatever image it is in.
    const emitting = new Map<number, boolean>();
    const judged = new Set<number>();
    for (const [name, image] of await stageImages()) {
      const colors = new Set<number>();
      let opaque = 0;
      let kept = 0;
      for (const at of image.pixels) {
        if ((image.alpha[at] ?? 0) === 0) continue;
        opaque++;
        const color = image.colors[at] ?? 0;
        let emitter = emitting.get(color);
        if (emitter === undefined) {
          emitter = emits(color, STRONGEST);
          emitting.set(color, emitter);
        }
        if (emitter) kept++;
        else if (!judged.has(color)) colors.add(color);
      }
      // Every level of a dim, finer than the steps the emitters were judged on.
      for (const { light, level, alpha } of FINE) {
        for (const color of colors) {
          const rise = raise(light, color, alpha, level);
          if (rise >= FLASH_DELTA)
            expect(rise, `${name} #${color.toString(16)}`).toBeLessThan(FLASH_DELTA);
        }
      }
      for (const color of colors) judged.add(color);
      // The street itself is lit: what lights itself is a small share of it (windows, lamps).
      expect(kept / opaque, name).toBeLessThan(0.08);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  }, 120_000);

  it('lights every large color of the stage: none is drawn over', () => {
    for (const color of STAGE) expect(emits(color, STRONGEST)).toBe(false);
  });

  it('dims the stage under a super by less than the dark veil it replaces, smoothly, and back', () => {
    const { attack, hold, release } = DIM_TIMING;
    expect(dimLevel(Infinity)).toBe(1);
    expect(dimLevel(attack + hold - 1)).toBeCloseTo(SUPER_DIM);
    expect(dimLevel(attack + hold + release)).toBe(1);
    for (let age = 1; age < attack + hold + release; age++) {
      // Never in one go: under half of the way a frame (the dark veil's attack, 4 frames).
      expect(Math.abs(dimLevel(age) - dimLevel(age - 1))).toBeLessThan((1 - SUPER_DIM) / 2);
    }
    for (const backdrop of STAGE) {
      const drop = relativeLuminance(backdrop) - relativeLuminance(dimmed(backdrop, SUPER_DIM));
      expect(drop).toBeLessThan(VEIL_DELTA);
    }
  });
});

describe('the live lights on the fighters (docs/flashs.md §5)', () => {
  it('falls off as Phaser 4.2.1 shades it: whole at its heart, nothing past its radius', () => {
    expect(falloff(0, 0, 120, 34)).toBeCloseTo(peakFalloff(120, 34));
    expect(falloff(119, 0, 120, 34)).toBe(0);
    expect(falloff(40, 0, 120, 34)).toBeLessThan(falloff(20, 0, 120, 34));
    expect(glowAt(0, 100)).toBe(1);
    expect(glowAt(100, 100)).toBe(0);
  });

  it('keeps every fighter under its measured area at FIGHTER_LIFT, the table within 15 % of it', async () => {
    const lift = [FIGHTER_LIFT, FIGHTER_LIFT, FIGHTER_LIFT] as const;
    const measured = new Map<string, number>();
    for (const [fighter, colorway] of [
      ['nayo', 'main'],
      ['nayo', 'alt'],
      ['riff', 'main'],
      ['riff', 'alt'],
      ['saphir', 'main'],
      ['saphir', 'alt'],
      ['watt', 'main'],
      ['watt', 'alt'],
      ['koda', 'main'],
      ['koda', 'alt'],
      ['feline', 'main'],
      ['feline', 'alt'],
    ] as const satisfies readonly (readonly [FighterName, ColorwayName])[]) {
      const folder = new URL(`../../src/art/${fighter}/${colorway}/`, import.meta.url);
      const known = new Map<number, boolean>();
      let worst = 0;
      for (const file of await readdir(folder)) {
        if (!file.endsWith('.png')) continue;
        const strip = file.replace(/\.png$/, '');
        for (const pixels of cellPixels(await savedStrip(fighter, colorway, strip))) {
          let lit = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if ((pixels[i + 3] ?? 0) < 128) continue;
            const color =
              ((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0);
            let rises = known.get(color);
            if (rises === undefined) {
              const before = relativeLuminance(color);
              rises =
                before < 0.8 && relativeLuminance(litColor(color, lift)) - before >= FLASH_DELTA;
              known.set(color, rises);
            }
            if (rises) lit++;
          }
          worst = Math.max(worst, lit / ART_SCALE ** 2);
        }
      }
      measured.set(`${fighter}/${colorway}`, worst);
    }
    const all = [...measured].map(([key, worst]) => `${key} ${worst.toFixed(0)}`).join(', ');
    for (const [key, worst] of measured) {
      const table = FIGHTER_LIGHT_AREAS[key] ?? 0;
      expect(worst, all).toBeLessThanOrEqual(table);
      expect(table, all).toBeLessThanOrEqual(worst * 1.15);
    }
  }, 120_000);
});
