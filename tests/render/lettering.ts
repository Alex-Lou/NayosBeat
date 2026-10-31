import { INK, PAPER } from '../../src/render/comic-lettering';
import type { HitStyle } from '../../src/render/hit-styles';
import { FLASH_DELTA, luminanceDelta } from '../../src/render/luminance';
import { mix } from '../../src/render/hud-paint';
import { filled, layout, stroked, type Outlines } from './font-outlines';

/**
 * What a line of the game's lettering lights over the stage (docs/flashs.md §4.1), drawn as
 * Phaser's Text draws it: the inked outline (`strokeThickness`, round joins) and its drop in the
 * energy color, then the fill. Counted at full opacity and scale 1, in world px² of ΔL ≥ 0.1 over
 * one of the stage's colors; a browser's antialiasing lights a little more at the edges, which the
 * tables leave room for.
 */

/** Samples per world pixel, each way. */
const SAMPLES = 6;

export interface Lettering {
  /** The font's size, its stroke and its drop, in world pixels. */
  readonly size: number;
  readonly stroke: number;
  /** None: plain, no drop (the HUD's pixel font, its stroke black). */
  readonly drop: number;
  /** The fill: from PAPER at the top to `bottom` at `size` (the comic lettering), or plain. */
  readonly fill: { readonly top: number; readonly bottom: number };
  /** The stroke's color (dark: it lights nothing over the stage), and the drop's. */
  readonly ink: number;
  readonly energy: number;
}

/** The comic lettering of the sound words and stamps (comic-lettering.ts) in `style`. */
export function comic(style: HitStyle, size: number, stroke: number, drop: number): Lettering {
  return {
    size,
    stroke,
    drop,
    fill: { top: Number.parseInt(PAPER.slice(1), 16), bottom: style.strike },
    ink: Number.parseInt(INK.slice(1), 16),
    energy: style.energy,
  };
}

/** The HUD's white pixel lettering, `size` world pixels high: its black stroke lights nothing. */
export function plain(size: number): Lettering {
  return { size, stroke: 0, drop: 0, fill: { top: 0xffffff, bottom: 0xffffff }, ink: 0, energy: 0 };
}

/** World px² `text` lights in `lettering` over the stage's `colors`. */
export function litArea(
  font: Outlines,
  text: string,
  lettering: Lettering,
  colors: readonly number[],
): number {
  const { size, stroke, drop } = lettering;
  const scale = size / font.unitsPerEm;
  // Phaser writes the line half a stroke in, its baseline under the tallest letters.
  const ascent = 0.95 * size;
  const baseline = stroke / 2 + ascent;
  const line = layout(font, text, size, stroke / 2, baseline);
  const width = Math.ceil((line.width + stroke + drop + 4) * SAMPLES);
  const height = Math.ceil(
    (baseline + font.unitsPerEm * scale * 0.4 + stroke + drop + 4) * SAMPLES,
  );
  const grid = { width, height, samples: SAMPLES };
  const fill = filled(line.contours, width, height, SAMPLES).inside;
  const ring = stroke > 0 ? stroked(line.contours, grid, stroke / 2).inside : new Uint8Array(0);
  const lights = (color: number) =>
    colors.some((backdrop) => luminanceDelta(color, backdrop, 1) >= FLASH_DELTA);
  const shift = Math.round(drop * SAMPLES);
  const dropLights = drop > 0 && lights(lettering.energy);
  const inkLights = lights(lettering.ink);
  let lit = 0;
  for (let row = 0; row < height; row++) {
    const y = (row + 0.5) / SAMPLES;
    const color = mix(
      lettering.fill.top,
      lettering.fill.bottom,
      Math.min(1, Math.max(0, y / size)),
    );
    const fillLights = lights(color);
    for (let column = 0; column < width; column++) {
      const at = row * width + column;
      if (fill[at]) {
        if (fillLights) lit++;
        continue;
      }
      if (ring[at]) {
        if (inkLights) lit++;
        continue;
      }
      // The drop of the stroke shows where neither the fill nor the stroke covers it.
      const source = row >= shift && column >= shift ? (row - shift) * width + column - shift : -1;
      if (dropLights && source >= 0 && ring[source]) lit++;
    }
  }
  return lit / SAMPLES ** 2;
}
