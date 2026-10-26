/**
 * Shapes of the high definition effects (glows, rays, slashes, sparks), drawn once as white
 * textures with soft edges, then tinted and blended additively by HitFx. Pure functions: alpha
 * at (u, v), both from -1 to 1 across the texture.
 */

export interface HdShape {
  readonly width: number;
  readonly height: number;
  readonly alpha: (u: number, v: number) => number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const HD_SHAPES = {
  /** Round glow, hot in the middle. */
  glow: {
    width: 128,
    height: 128,
    alpha: (u, v) => clamp01(1 - Math.hypot(u, v)) ** 2.2,
  },
  /** Thin bright ring with a faint halo (shockwaves). */
  ring: {
    width: 128,
    height: 128,
    alpha: (u, v) => {
      const r = Math.hypot(u, v);
      return clamp01(
        Math.exp(-(((r - 0.86) / 0.06) ** 2)) + 0.3 * Math.exp(-(((r - 0.8) / 0.18) ** 2)),
      );
    },
  },
  /** Starburst ray: wide at its base (left), tapering to a point (right). */
  ray: {
    width: 128,
    height: 16,
    alpha: (u, v) => {
      const t = (u + 1) / 2;
      const half = (1 - t) ** 0.9;
      const across = Math.abs(v) / Math.max(half, 1e-6);
      return across >= 1 ? 0 : (1 - across * across) * clamp01(t / 0.08);
    },
  },
  /** Blade cut: thick in the middle, pointed at both ends. */
  cut: {
    width: 128,
    height: 16,
    alpha: (u, v) => {
      const half = Math.sqrt(clamp01(1 - u * u));
      const across = Math.abs(v) / Math.max(half, 1e-6);
      return across >= 1 ? 0 : (1 - across * across) * (1 - u ** 4);
    },
  },
  /** Crescent slash bulging to the right, brightest on its leading edge. */
  slash: {
    width: 128,
    height: 128,
    alpha: (u, v) => {
      const outer = Math.hypot(u, v) - 0.94;
      const inner = Math.hypot(u + 0.38, v) - 0.94;
      const inside = clamp01(-outer / 0.05) * clamp01(inner / 0.1);
      const edge = 0.45 + 0.55 * Math.exp(-((outer / 0.09) ** 2));
      return inside * edge;
    },
  },
  /** Spark streak, stretched along its motion. */
  spark: {
    width: 32,
    height: 8,
    alpha: (u, v) => clamp01(1 - Math.hypot(u, v)) ** 1.4,
  },
  /** Diamond shard. */
  shard: {
    width: 16,
    height: 16,
    alpha: (u, v) => clamp01(1 - (Math.abs(u) + Math.abs(v)) ** 3),
  },
} as const satisfies Record<string, HdShape>;

export type HdShapeName = keyof typeof HD_SHAPES;

/** Alpha of every pixel of a shape, row by row (0 to 255). */
export function rasterize(shape: HdShape): Uint8ClampedArray {
  const { width, height } = shape;
  const alphas = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = ((x + 0.5) / width) * 2 - 1;
      const v = ((y + 0.5) / height) * 2 - 1;
      alphas[y * width + x] = Math.round(clamp01(shape.alpha(u, v)) * 255);
    }
  }
  return alphas;
}
