/**
 * A stage's lights (docs/art/decor-rue.md §5): each adds to the tone of what it reaches, the
 * more the closer, and the ramps turn that into steps (canvas.ts `tone`). No light blends a
 * color: it only moves a pixel up its own ramp.
 */

import { dithered, type Canvas } from './canvas.ts';

export interface Light {
  readonly x: number;
  readonly y: number;
  /** How far it reaches, in image pixels. */
  readonly radius: number;
  /** Steps of a ramp it adds at its center. */
  readonly strength: number;
  /** Its pool's height over its width: below 1, a pool spread along the facade. */
  readonly squash?: number;
}

/** Steps of tone the lights add at x, y: a soft square falloff from each. */
export function lightAt(lights: readonly Light[], x: number, y: number): number {
  let sum = 0;
  for (const { x: lx, y: ly, radius, strength, squash = 1 } of lights) {
    const distance = Math.hypot(x - lx, (y - ly) / squash) / radius;
    if (distance < 1) sum += strength * (1 - distance) ** 2;
  }
  return sum;
}

/** A colored light falling on surfaces: where it is, and the ramps it tints. */
export interface Spill {
  readonly light: Light;
  /** Each ramp it falls on, and its twin in the light's color, slot for slot. */
  readonly twins: readonly (readonly [readonly number[], readonly number[]])[];
}

/**
 * A colored light falling on what is already drawn (docs/art/decor-rue.md §5.1): within its
 * reach, each pixel of a ramp it tints takes the same step of that ramp's twin, a step higher at
 * its heart; its edge and its heart fade in an ordered dither, so the pool has no rim. The texture
 * (joints, bricks, stains) stays: only the hue of the light is added.
 */
export function spill(canvas: Canvas, { light, twins }: Spill): void {
  const steps = new Map<number, { twin: readonly number[]; step: number }>();
  for (const [ramp, twin] of twins) {
    if (ramp.length !== twin.length) throw new Error('A spill twin must be as long as its ramp');
    ramp.forEach((slot, step) => steps.set(slot, { twin, step }));
  }
  const { x, y, radius, squash = 1 } = light;
  canvas.paint(x - radius, y - radius * squash, radius * 2, radius * squash * 2, (px, py) => {
    const found = steps.get(canvas.get(px, py));
    if (!found) return undefined;
    const distance = Math.hypot(px + 0.5 - x, (py + 0.5 - y) / squash) / radius;
    if (distance >= 1) return undefined;
    // Its edge fades out, and its heart a step higher fades in: both in an ordered dither.
    if (distance > 0.7 && !dithered((1 - distance) / 0.3, px, py)) return undefined;
    const lift = distance < 0.55 && dithered((0.55 - distance) / 0.25, px, py) ? 1 : 0;
    const { twin, step } = found;
    return twin[Math.min(step + lift, twin.length - 1)];
  });
}
