import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STAGE_LAYERS, STAGE_LAYER_NAMES, STAGE_SCALE } from '../../src/art/stage-layers';
import { STAGE_COLORS } from '../../src/art/rooftop/colors';
import { STAGE_PROPS } from '../../src/art/rooftop/props';
import { STAGE_COLORS as GYM_COLORS } from '../../src/art/gym/colors';
import { STAGE_COLORS as RUE_COLORS } from '../../src/art/rue/colors';
import { brightestBackdrop } from '../../src/render/luminance';
import { rgbaAt } from '../../tools/sprites/colors';
import { decodeIndexedPng, type IndexedImage } from '../../tools/sprites/png';
import { stageRulesOf } from '../../tools/sprites/stage-drawn';
import { liftedLayers, packProps } from '../../tools/sprites/stage-props';
import { drawRooftop } from '../../tools/stage/rooftop';
import { ROOFTOP_ATMOSPHERES } from '../../tools/stage/rooftop/atmospheres';
import { BLIMP_CYCLE, PASS, PASS_AT } from '../../tools/stage/rooftop/far';
import { overhead } from '../../tools/stage/rooftop/mid';
import {
  BEAM,
  BEAM_DROP,
  CONCRETE,
  MEMBRANE,
  PALETTE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  WET,
  WET_PAVER,
} from '../../tools/stage/rooftop/palette';

/** The colors of an image, pixel by pixel, as 0xRRGGBBAA (0: transparent). */
function colorsOf(image: IndexedImage): number[] {
  return Array.from(image.pixels, (slot) => {
    const { r, g, b, a } = rgbaAt(image, slot);
    return a === 0 ? 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  });
}

function firstDifference(a: IndexedImage, b: IndexedImage): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  const left = colorsOf(a);
  const right = colorsOf(b);
  return left.findIndex((color, index) => color !== right[index]);
}

/** The hue of a vivid color (degrees), or undefined for a dull or dark one. */
function vividHue(r: number, g: number, b: number): number | undefined {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (max === 0 || delta / max < 0.45 || max / 255 < 0.45) return undefined;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

function totalOf(timeline: readonly (readonly [number, number])[]): number {
  return timeline.reduce((sum, [, steps]) => sum + steps, 0);
}

/** The frame a prop shows at `step` of its loop. */
function frameAt(name: string, step: number): number {
  const { timeline } = propNamed(name);
  let left = step % totalOf(timeline);
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

describe("the code's Rooftop Rain (docs/art/decor-rooftop.md)", { timeout: 60_000 }, () => {
  const { layers, props } = drawRooftop();
  const lifted = liftedLayers(props, layers);

  it('is what the game shows: npm run stages installed it, its moving figures lifted off', async () => {
    for (const layer of STAGE_LAYER_NAMES) {
      const file = new URL(`../../src/art/rooftop/${layer}.png`, import.meta.url);
      const installed = await decodeIndexedPng(await readFile(file));
      expect(firstDifference(installed, lifted[layer]), layer).toBe(-1);
    }
    const sheet = await decodeIndexedPng(
      await readFile(new URL('../../src/art/rooftop/props.png', import.meta.url)),
    );
    const packed = packProps(props, layers).sheet;
    if (!packed) throw new Error('props');
    expect(firstDifference(sheet, packed)).toBe(-1);
  });

  it('keeps the layers contract: their sizes, an opaque far layer, one palette', () => {
    expect(PALETTE.length).toBeLessThanOrEqual(256);
    expect(PALETTE.slice(1).every(({ a }) => a === 255)).toBe(true);
    for (const layer of STAGE_LAYER_NAMES) {
      const { width, height } = stageRulesOf(layer);
      expect([lifted[layer].width, lifted[layer].height], layer).toEqual([width, height]);
    }
    expect(lifted.far.pixels.every((slot) => slot !== 0)).toBe(true);
  });

  it('keeps its large colors inside the backdrop the flash tables were measured over', () => {
    // Each channel at its highest among the street's and the gym's large colors: a color past it
    // would raise what every effect lights, and move every table (docs/flashs.md §3).
    const before = brightestBackdrop(
      [RUE_COLORS, GYM_COLORS].flatMap((colors) => Object.values(colors).flat()),
    );
    for (const [atmosphere, colors] of Object.entries(STAGE_COLORS)) {
      for (const color of colors) {
        for (const shift of [16, 8, 0]) {
          expect(
            (color >> shift) & 0xff,
            `${atmosphere} ${color.toString(16)}`,
          ).toBeLessThanOrEqual((before >> shift) & 0xff);
        }
      }
    }
  });

  it('hides its puddles, their reflections and the rain in the beam but under the rain', () => {
    const hidden: [readonly number[], readonly number[]][] = [
      [WET, MEMBRANE],
      [WET_PAVER, CONCRETE],
      [REFLECT_VIOLET, MEMBRANE],
      [REFLECT_YELLOW, MEMBRANE],
      [BEAM_DROP, BEAM],
    ];
    for (const { atmosphere, palette } of ROOFTOP_ATMOSPHERES) {
      const name = `${atmosphere.moment}-${atmosphere.weather}`;
      for (const [wet, dry] of hidden) {
        const same = wet.every((slot, step) => {
          const [a, b] = [palette[slot], palette[dry[step] ?? 0]];
          return a?.r === b?.r && a?.g === b?.g && a?.b === b?.b;
        });
        expect(same, name).toBe(atmosphere.weather !== 'rain');
      }
    }
  });

  it('offers its two rains, at midnight and at dusk, and its fog', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([
      'dusk-rain',
      'midnight-clear',
      'midnight-fog',
      'midnight-rain',
    ]);
  });

  it('leaves cyan and magenta to the fighters: none of its vivid colors comes near them', () => {
    for (const { r, g, b } of PALETTE.slice(1)) {
      const hue = vividHue(r, g, b);
      if (hue === undefined) continue;
      for (const taken of [185, 325]) {
        const apart = Math.min(Math.abs(hue - taken), 360 - Math.abs(hue - taken));
        expect(apart, `${r},${g},${b}`).toBeGreaterThan(25);
      }
    }
  });

  it('lays each frame of its props over the layer installed exactly as the code drew it', () => {
    const { props: packed, sheet } = packProps(props, layers);
    if (!sheet) throw new Error('a sheet');
    for (const prop of packed) {
      const code = props.find(({ name }) => name === prop.name);
      if (!code) throw new Error(prop.name);
      // The layer as the game shows it under this prop: the others laid on it at their first frame.
      const layer = { ...lifted[prop.layer], pixels: Uint8Array.from(lifted[prop.layer].pixels) };
      for (const other of packed) {
        const first = other.frames[0];
        if (other === prop || other.layer !== prop.layer || !first) continue;
        for (let y = 0; y < first.height; y++) {
          for (let x = 0; x < first.width; x++) {
            const slot = sheet.pixels[(first.sheetY + y) * sheet.width + first.sheetX + x] ?? 0;
            if (slot !== 0) layer.pixels[(first.y + y) * layer.width + first.x + x] = slot;
          }
        }
      }
      prop.frames.forEach((frame, index) => {
        const drawn = code.frames[index];
        if (!drawn) throw new Error(`${prop.name} ${index}`);
        const shown = Array.from({ length: code.rect.width * code.rect.height }, (_, at) => {
          const x = code.rect.x + (at % code.rect.width);
          const y = code.rect.y + Math.floor(at / code.rect.width);
          if (
            frame &&
            x >= frame.x &&
            y >= frame.y &&
            x < frame.x + frame.width &&
            y < frame.y + frame.height
          ) {
            const slot =
              sheet.pixels[
                (frame.sheetY + y - frame.y) * sheet.width + frame.sheetX + x - frame.x
              ] ?? 0;
            if (slot !== 0) return slot;
          }
          return layer.pixels[y * layer.width + x] ?? 0;
        });
        expect(shown, `${prop.name} frame ${index}`).toEqual(Array.from(drawn.pixels));
      });
    }
  }, 60_000);

  it('flies its gliders in and out past both ends of the far layer, never popping in sight', () => {
    const width = STAGE_LAYERS.far.width * STAGE_SCALE;
    const gliders = STAGE_PROPS.filter(({ drift }) => drift);
    expect(gliders.map(({ name }) => name).sort()).toEqual([
      'blimp',
      'car0',
      'car1',
      'car2',
      'car3',
      'car4',
      'mist0',
      'mist1',
    ]);
    for (const { name, frames, drift } of gliders) {
      if (!drift) continue;
      const shown = frames.filter((frame) => frame !== null);
      const left = Math.min(...shown.map(({ x }) => x));
      const right = Math.max(...shown.map(({ x, width: w }) => x + w));
      // Wherever it starts, it is past one end; wherever it ends, past the other.
      const [start, end] = drift.to < drift.from ? [drift.from, drift.to] : [drift.to, drift.from];
      expect(left + start, name).toBeGreaterThanOrEqual(width);
      expect(right + end, name).toBeLessThanOrEqual(0);
    }
  });

  it('shows the blimp only while it glides, its beam swept slowly (each angle 20 steps at least)', () => {
    const blimp = propNamed('blimp');
    expect(totalOf(blimp.timeline)).toBe(BLIMP_CYCLE);
    expect(blimp.drift).toMatchObject({ start: PASS_AT, steps: PASS });
    for (let step = 0; step < BLIMP_CYCLE; step++) {
      const passing = step >= PASS_AT && step < PASS_AT + PASS;
      expect(frameAt('blimp', step) !== 0, `step ${step}`).toBe(passing);
    }
    for (const [, steps] of blimp.timeline) expect(steps).toBeGreaterThanOrEqual(20);
  });

  it('quivers the mast in step with the blimp overhead; its light holds each state 20 steps', () => {
    const mast = propNamed('mast');
    expect(totalOf(mast.timeline)).toBe(BLIMP_CYCLE);
    let quivered = false;
    let run = 0;
    let shown = -1;
    for (let step = 0; step < BLIMP_CYCLE; step++) {
      const frame = frameAt('mast', step);
      // Frames 0 to 2 lit, 3 to 5 dark; 0 and 3 still, the others bent.
      const bent = frame % 3 !== 0;
      if (bent) quivered = true;
      expect(!bent || overhead(step), `step ${step}`).toBe(true);
      const lit = frame < 3 ? 1 : 0;
      if (lit === shown) run += 1;
      else {
        if (shown !== -1) expect(run, `step ${step}`).toBeGreaterThanOrEqual(20);
        shown = lit;
        run = 1;
      }
    }
    expect(quivered).toBe(true);
    // Overhead is within the pass.
    expect(overhead(PASS_AT - 1) || overhead(PASS_AT + PASS)).toBe(false);
  });
});
