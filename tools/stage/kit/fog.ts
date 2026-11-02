/**
 * The fog (docs/art/brume.md), for any stage: a palette that swallows the distance, and banks of
 * mist drifting slowly across the far layer or low along the ground of the middle one, there only
 * in the fog (src/art/stage-layers.ts `weather`, `StageDrift`). Never in front of the fighters: no
 * mist on the floor layer.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas, at } from './canvas.ts';
import { ceiled, mix } from './grade.ts';
import { noise } from './random.ts';
import { imageOf, type CodeProp } from './stage.ts';

/** How a stage's night turns to fog. */
export interface Fog {
  /** The fog's color: the far ramps sink into it (inside the flashes' band, kit/grade.ts). */
  readonly color: Rgba;
  /** The ramps of the distance: the sky, the clouds, the far towers. The fog swallows them most. */
  readonly far: readonly (readonly number[])[];
  /** What gives light: as bright in the fog, which makes it glow out of it. */
  readonly lit: ReadonlySet<number>;
  /** How far the distance sinks (0 to 1), and the rest of the stage, nearer. */
  readonly depth: number;
  readonly near: number;
}

/**
 * `base` (a stage's night) in the fog: the far ramps brought `depth` of the way to the fog's
 * color, step for step (each keeps its order, only flatter), every other slot `near` of the way;
 * its lights as they were; the masses back under the flash measures' ceiling.
 */
export function fogged(base: readonly Rgba[], fog: Fog): Rgba[] {
  const palette = [...base];
  const far = new Set(fog.far.flat());
  palette.forEach((color, slot) => {
    if (slot === 0 || fog.lit.has(slot)) return;
    palette[slot] = mix(color, fog.color, far.has(slot) ? fog.depth : fog.near);
  });
  ceiled(palette, base, fog.lit);
  return palette;
}

/** A bank of mist: its layer, where it is drawn on it, how long it takes across, its way. */
export interface MistBank {
  readonly name: string;
  readonly layer: 'far' | 'mid';
  /** Its middle row, its height, its width (image pixels). */
  readonly y: number;
  readonly height: number;
  readonly width: number;
  readonly steps: number;
  readonly facing: -1 | 1;
  readonly seed: number;
}

/**
 * The mist's wisps over the far layer, `bank` drawn centered on its middle: sparse pixels of
 * `ramp` (its two or three steps, lighter in the bank's heart), thinning to its edges, so the far
 * layer shows through them as through mist.
 */
function drawMist(canvas: Canvas, bank: MistBank, ramp: readonly number[]): void {
  const left = Math.round(canvas.width / 2 - bank.width / 2);
  const top = Math.round(bank.y - bank.height / 2);
  canvas.paint(left, top, bank.width, bank.height, (x, y) => {
    const u = (x + 0.5 - canvas.width / 2) / (bank.width / 2);
    const v = (y + 0.5 - bank.y) / (bank.height / 2);
    const swell = 1 - u * u * (0.6 + noise(bank.seed, x, 0, 60) * 0.4) - v * v;
    const wisp = noise(bank.seed + 1, x, y * 3, 34) * 0.7 + noise(bank.seed + 2, x, y, 7) * 0.3;
    const density = swell * wisp;
    if (density < 0.22) return undefined;
    // Sparse: a checker of its pixels, fuller in the heart.
    const solid = density > 0.45 || (x + y) % 2 === 0;
    if (!solid) return undefined;
    return at(ramp, density > 0.5 ? 2 : density > 0.34 ? 1 : 0);
  });
}

/**
 * A bank of mist as a stage's animation: one image over `layer` (its layer as the code draws it),
 * gliding past both ends of the layer and back, again and again, in the fog only.
 */
export function mistProp(
  layer: Canvas,
  palette: readonly Rgba[],
  bank: MistBank,
  ramp: readonly number[],
): CodeProp {
  const rect = {
    x: Math.round(layer.width / 2 - bank.width / 2),
    y: Math.round(bank.y - bank.height / 2),
    width: bank.width,
    height: bank.height,
  };
  const frame = (draw: boolean) => {
    const canvas = layer.crop(0, 0, layer.width, layer.height);
    if (draw) drawMist(canvas, bank, ramp);
    return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), palette);
  };
  // From past one end to past the other: half the layer and half the bank, each way.
  const off = Math.ceil(layer.width / 2 + bank.width / 2) + 2;
  return {
    name: bank.name,
    layer: bank.layer,
    weather: 'fog',
    rect,
    timeline: [[1, bank.steps]],
    frames: [frame(false), frame(true)],
    drift: { from: -bank.facing * off, to: bank.facing * off, start: 0, steps: bank.steps },
  };
}

/** The mist's colors, a dim city light caught in it, for a stage's palette to register. */
export const MIST_HEXES = ['#38364c', '#454358', '#545266'] as const;
