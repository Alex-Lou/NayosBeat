/**
 * The street's lights (docs/art/decor-rue.md §5): each adds to the tone of what it reaches, the
 * more the closer, and the ramps turn that into steps (canvas.ts `tone`). No light blends a
 * color: it only moves a pixel up its own ramp.
 */

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
