/**
 * Pixel canvas for hand-placed-looking pixel art: every shape is a hard-edged mask, shaded in
 * flat tones from the light direction, outlined with the darkest tone of its own color ramp.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Palette indices of one material, darkest to lightest. */
export interface Ramp {
  readonly outline: number;
  readonly shadow: number;
  readonly base: number;
  readonly light: number;
}

export interface ShapeOptions {
  /** Draws a 1 px line of the outline tone where the shape covers shapes drawn before it. */
  readonly edge?: boolean;
  /** One tone only (small accents that shading would turn into noise). */
  readonly flat?: boolean;
}

/** Light comes from the top and the front (the character faces right; y points down). */
const LIGHT = normalize({ x: 0.55, y: -0.85 });
/** How deep, in pixels, the lit and shaded bands reach into a shape. */
const LIGHT_DEPTH = 1.6;
const SHADOW_DEPTH = 2.2;

const NEIGHBORS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  /** Palette index per pixel; 0 is transparent. */
  readonly pixels: Uint8Array;
  /** Ramp of the shape that owns each pixel, for the outline pass (-1: empty). */
  private readonly owner: Int16Array;
  private readonly ramps: Ramp[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
    this.owner = new Int16Array(width * height).fill(-1);
  }

  /** Fills every pixel whose center is inside the shape, shaded from the light direction. */
  fill(
    inside: (x: number, y: number) => boolean,
    bounds: Bounds,
    ramp: Ramp,
    options: ShapeOptions = {},
  ): void {
    const rampId = this.rampId(ramp);
    const x0 = Math.max(0, Math.floor(bounds.left));
    const y0 = Math.max(0, Math.floor(bounds.top));
    const x1 = Math.min(this.width - 1, Math.ceil(bounds.right));
    const y1 = Math.min(this.height - 1, Math.ceil(bounds.bottom));
    const covered: number[] = [];
    const isInside = (x: number, y: number): boolean => inside(x + 0.5, y + 0.5);

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!isInside(x, y)) continue;
        const index = y * this.width + x;
        const edge =
          options.edge === true &&
          NEIGHBORS.some(({ x: dx, y: dy }) => {
            const nx = x + dx;
            const ny = y + dy;
            return !isInside(nx, ny) && this.ownerAt(nx, ny) >= 0;
          });
        covered.push(index, edge ? ramp.outline : this.tone(isInside, x, y, ramp, options));
      }
    }
    // Written after the scan so the shape's own pixels never count as "covered" ones.
    for (let i = 0; i < covered.length; i += 2) {
      const index = covered[i] ?? 0;
      this.pixels[index] = covered[i + 1] ?? 0;
      this.owner[index] = rampId;
    }
  }

  capsule(
    a: Point,
    b: Point,
    radiusA: number,
    radiusB: number,
    ramp: Ramp,
    options?: ShapeOptions,
  ): void {
    const r = Math.max(radiusA, radiusB);
    const bounds = {
      left: Math.min(a.x, b.x) - r,
      right: Math.max(a.x, b.x) + r,
      top: Math.min(a.y, b.y) - r,
      bottom: Math.max(a.y, b.y) + r,
    };
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    this.fill(
      (x, y) => {
        const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
        const radius = radiusA + (radiusB - radiusA) * t;
        return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)) <= radius;
      },
      bounds,
      ramp,
      options,
    );
  }

  circle(center: Point, radius: number, ramp: Ramp, options?: ShapeOptions): void {
    this.capsule(center, center, radius, radius, ramp, options);
  }

  polygon(points: readonly Point[], ramp: Ramp, options?: ShapeOptions): void {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const bounds = {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
    this.fill((x, y) => insidePolygon(points, x, y), bounds, ramp, options);
  }

  /** A single detail pixel (eye, seam...) that keeps the outline of the shape under it. */
  dot(x: number, y: number, color: number): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    this.pixels[py * this.width + px] = color;
  }

  /** Surrounds the whole silhouette with the darkest tone of the shape next to it. */
  outline(): void {
    const next = this.pixels.slice();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.ownerAt(x, y) >= 0) continue;
        for (const { x: dx, y: dy } of NEIGHBORS) {
          const ramp = this.ramps[this.ownerAt(x + dx, y + dy)];
          if (ramp) {
            next[y * this.width + x] = ramp.outline;
            break;
          }
        }
      }
    }
    this.pixels.set(next);
  }

  private tone(
    isInside: (x: number, y: number) => boolean,
    x: number,
    y: number,
    ramp: Ramp,
    options: ShapeOptions,
  ): number {
    if (options.flat === true) return ramp.base;
    const lit = !isInside(
      Math.round(x + LIGHT.x * LIGHT_DEPTH),
      Math.round(y + LIGHT.y * LIGHT_DEPTH),
    );
    if (lit) return ramp.light;
    const shaded = !isInside(
      Math.round(x - LIGHT.x * SHADOW_DEPTH),
      Math.round(y - LIGHT.y * SHADOW_DEPTH),
    );
    return shaded ? ramp.shadow : ramp.base;
  }

  private ownerAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return this.owner[y * this.width + x] ?? -1;
  }

  private rampId(ramp: Ramp): number {
    const existing = this.ramps.indexOf(ramp);
    if (existing >= 0) return existing;
    this.ramps.push(ramp);
    return this.ramps.length - 1;
  }
}

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

function insidePolygon(points: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (!a || !b) continue;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function normalize(v: Point): Point {
  const length = Math.hypot(v.x, v.y);
  return { x: v.x / length, y: v.y / length };
}
