/**
 * Pixel canvas that shades shapes the way a pixel artist would by hand, but from real volumes:
 * every shape carries a surface normal (limbs are cylinders, the head an ellipsoid, the torso a
 * barrel), and the shading snaps to a few flat tones of its material. Parts in front of others
 * get a 1 px contour (softer on the lit side) and cast a short shadow on what is behind them;
 * the silhouette gets a selective outline and a 1 px back light. No gradient, no
 * anti-aliasing: every pixel is a palette slot.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Palette slots of one material, darkest to lightest. */
export interface Material {
  readonly outline: number;
  readonly deep: number;
  readonly shadow: number;
  readonly base: number;
  readonly light: number;
  /** Specular highlight of a glossy material (satin, leather, metal). */
  readonly gloss?: number;
  /** Size of the highlight: closer to 1 is a smaller, sharper spot. */
  readonly glossCut?: number;
  /** Back light (the club's neons) catching the silhouette on the side away from the viewer. */
  readonly rim?: number;
}

export interface ShapeOptions {
  /** Shapes of one group (the segments of a sleeve) join without a contour between them. */
  readonly group?: string;
  /** Groups this shape melts into without a contour (hair into the skull). */
  readonly blend?: readonly string[];
  /** Base tone only, no volume (small accents that shading would turn into noise). */
  readonly flat?: boolean;
  /** How far, in pixels, the rounded rim of a polygon reaches inside it. */
  readonly bevel?: number;
  /**
   * Shades a polygon as a barrel along this image direction (a torso along the spine): lit on
   * one side, in shadow on the other, instead of bevelled rings.
   */
  readonly axis?: Point;
  /** Tilts the whole shape's surface: x toward the front, y up (a torso turned to the light). */
  readonly tilt?: Point;
}

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Surface normal at a pixel inside a shape: x right, y down (image), z toward the viewer. */
interface Normal {
  x: number;
  y: number;
  z: number;
}

type Shape = (x: number, y: number, normal: Normal) => boolean;

/** Key light from the top and the front (characters face right), toward the viewer. */
const LIGHT = unit3(0.62, -0.55, 0.56);
/** n·L thresholds of the tones: above LIT is light, above BASE is base, above SHADOW is shadow. */
const BANDS = { lit: 0.6, base: 0.22, shadow: -0.1 } as const;
const DEFAULT_GLOSS_CUT = 0.9;
/** Lit-side direction in the image, for the selective outline and the cast shadows. */
const LIGHT_2D = unit2(LIGHT.x, LIGHT.y);
/** How far (px) a part in front casts its shadow on what is behind it, away from the light. */
const CAST_SHADOW = 2;

const NEIGHBORS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const EMPTY = -1;
/** Owner of pixels drawn with an exact color over nothing (effects): never outlined. */
const LOOSE = -2;

const FLAG_FLAT = 1;
const FLAG_EXACT = 2;
const FLAG_CONTOUR = 4;
const FLAG_GHOST = 8;
/** A contour on the lit side of its shape: drawn in the shadow tone, not the darkest one. */
const FLAG_LIT_CONTOUR = 16;

/** Tones of a material by band, darkest first. */
const BAND = { deep: 0, shadow: 1, base: 2, light: 3, gloss: 4 } as const;

export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  /** Palette slot per pixel, filled by `finish()`; 0 is transparent. */
  readonly pixels: Uint8Array;

  private readonly material: Int16Array;
  /** Material of the shape itself, under any decal: contours and outline use its tones. */
  private readonly host: Int16Array;
  private readonly group: Int16Array;
  private readonly flags: Uint8Array;
  private readonly exact: Uint8Array;
  private readonly nx: Float32Array;
  private readonly ny: Float32Array;
  private readonly nz: Float32Array;
  private readonly materials: Material[] = [];
  private readonly groups: string[] = [];
  private anonymous = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.pixels = new Uint8Array(size);
    this.material = new Int16Array(size).fill(EMPTY);
    this.host = new Int16Array(size).fill(EMPTY);
    this.group = new Int16Array(size).fill(EMPTY);
    this.flags = new Uint8Array(size);
    this.exact = new Uint8Array(size);
    this.nx = new Float32Array(size);
    this.ny = new Float32Array(size);
    this.nz = new Float32Array(size);
  }

  /** A limb segment: a cylinder from `a` to `b`, rounded at both ends, tapering. */
  capsule(
    a: Point,
    b: Point,
    radiusA: number,
    radiusB: number,
    material: Material,
    options: ShapeOptions = {},
  ): void {
    const r = Math.max(radiusA, radiusB);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1e-9;
    this.draw(
      (x, y, normal) => {
        const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
        const radius = radiusA + (radiusB - radiusA) * t;
        const ox = x - (a.x + dx * t);
        const oy = y - (a.y + dy * t);
        if (Math.hypot(ox, oy) > radius) return false;
        sphereNormal(normal, ox / radius, oy / radius);
        return true;
      },
      {
        left: Math.min(a.x, b.x) - r,
        right: Math.max(a.x, b.x) + r,
        top: Math.min(a.y, b.y) - r,
        bottom: Math.max(a.y, b.y) + r,
      },
      material,
      options,
    );
  }

  /** An ellipsoid seen from the front, its `rx` axis turned by `angle` degrees (clockwise). */
  ellipse(
    center: Point,
    rx: number,
    ry: number,
    angle: number,
    material: Material,
    options: ShapeOptions = {},
  ): void {
    const c = Math.cos((angle * Math.PI) / 180);
    const s = Math.sin((angle * Math.PI) / 180);
    const r = Math.max(rx, ry);
    this.draw(
      (x, y, normal) => {
        const dx = x - center.x;
        const dy = y - center.y;
        const u = (dx * c + dy * s) / rx;
        const v = (-dx * s + dy * c) / ry;
        if (u * u + v * v > 1) return false;
        // Back to image axes.
        sphereNormal(normal, u * c - v * s, u * s + v * c);
        return true;
      },
      { left: center.x - r, right: center.x + r, top: center.y - r, bottom: center.y + r },
      material,
      options,
    );
  }

  circle(center: Point, radius: number, material: Material, options?: ShapeOptions): void {
    this.ellipse(center, radius, radius, 0, material, options);
  }

  /**
   * A slab: with an `axis`, a barrel lit on one side; otherwise a rounded rim `bevel` pixels
   * wide (shoes, pockets).
   */
  polygon(points: readonly Point[], material: Material, options: ShapeOptions = {}): void {
    const bevel = options.bevel ?? 3;
    const axis = options.axis ? unit2(options.axis.x, options.axis.y) : undefined;
    this.draw(
      (x, y, normal) => {
        if (!insidePolygon(points, x, y)) return false;
        if (axis) {
          // Position across the barrel (-1 to 1) and along it, where the ray leaves the shape.
          const across = { x: -axis.y, y: axis.x };
          const u = spanPosition(points, x, y, across);
          const v = spanPosition(points, x, y, axis) * 0.2;
          normal.x = across.x * u + axis.x * v;
          normal.y = across.y * u + axis.y * v;
          normal.z = Math.sqrt(Math.max(0, 1 - u * u - v * v));
          return true;
        }
        const edge = nearestEdge(points, x, y);
        const depth = Math.min(1, edge.distance / bevel);
        // Outward direction, flattening toward the middle of the slab.
        const lean = Math.sqrt(1 - depth * depth) * 0.95;
        normal.x = edge.outX * lean;
        normal.y = edge.outY * lean;
        normal.z = Math.sqrt(Math.max(0, 1 - lean * lean));
        return true;
      },
      boundsOf(points),
      material,
      options,
    );
  }

  /**
   * Repaints the pixels of a shape already drawn with another material, keeping their volume
   * (stripes, pockets, the fade of a haircut). Only pixels of `onGroup` change when it is given.
   * The shape's contour stays in its own tones. A `flat` decal shows its base tone only: thin
   * color accents (stripes, piping) stay bright whatever the volume under them.
   */
  decal(
    points: readonly Point[],
    material: Material,
    onGroup?: string,
    options: { readonly flat?: boolean } = {},
  ): void {
    const materialId = this.materialId(material);
    const only = onGroup === undefined ? undefined : this.groups.indexOf(onGroup);
    this.scan(boundsOf(points), (x, y, index) => {
      if (this.group[index] === EMPTY || this.group[index] === LOOSE) return;
      if (only !== undefined && this.group[index] !== only) return;
      if (!insidePolygon(points, x + 0.5, y + 0.5)) return;
      const flags = this.flags[index] ?? 0;
      if (flags & FLAG_CONTOUR) return;
      this.material[index] = materialId;
      this.flags[index] = (flags & ~FLAG_EXACT) | (options.flat === true ? FLAG_FLAT : 0);
    });
  }

  /** One pixel of an exact palette slot (eyes, stitches, sparkles); keeps the shape under it. */
  dot(x: number, y: number, color: number): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const index = py * this.width + px;
    this.exact[index] = color;
    this.flags[index] = (this.flags[index] ?? 0) | FLAG_EXACT;
    if (this.group[index] === EMPTY) this.group[index] = LOOSE;
  }

  /** Every pixel inside a polygon in one exact palette slot (the inside of an open mouth). */
  paint(points: readonly Point[], color: number): void {
    this.scan(boundsOf(points), (x, y) => {
      if (insidePolygon(points, x + 0.5, y + 0.5)) this.dot(x, y, color);
    });
  }

  /**
   * Exact-color pixels of a motion trail or an effect, behind what is drawn next: never
   * outlined, and the shapes drawn over them get no contour against them.
   */
  ghost(inside: (x: number, y: number) => number, bounds: Bounds): void {
    this.scan(bounds, (x, y, index) => {
      const color = inside(x + 0.5, y + 0.5);
      if (color <= 0) return;
      this.exact[index] = color;
      this.flags[index] = FLAG_EXACT | FLAG_GHOST;
      this.material[index] = EMPTY;
      this.host[index] = EMPTY;
      this.group[index] = LOOSE;
    });
  }

  /** Shades, contours, casts shadows, cleans, back-lights and outlines into `pixels`. */
  finish(): void {
    const bands = new Int8Array(this.pixels.length);
    for (let index = 0; index < this.pixels.length; index++) bands[index] = this.band(index);
    this.castShadows(bands);
    this.cleanOrphans(bands);
    for (let index = 0; index < this.pixels.length; index++) {
      this.pixels[index] = this.tone(index, bands[index] ?? -1);
    }
    this.backLight();
    this.outline();
  }

  private draw(shape: Shape, bounds: Bounds, material: Material, options: ShapeOptions): void {
    const materialId = this.materialId(material);
    const groupId = this.groupId(options.group);
    const blended = new Set((options.blend ?? []).map((name) => this.groupId(name)));
    const normal: Normal = { x: 0, y: 0, z: 1 };
    const probe: Normal = { x: 0, y: 0, z: 1 };
    const tilt = options.tilt;
    const written: number[] = [];
    this.scan(bounds, (x, y, index) => {
      if (!shape(x + 0.5, y + 0.5, normal)) return;
      // Contour where this shape covers another group: one of its 4 neighbors is outside the
      // shape but already belongs to a different, solid group. Softer toward the light.
      let contour = 0;
      for (const { x: dx, y: dy } of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
        const other = this.group[ny * this.width + nx] ?? EMPTY;
        if (other < 0 || other === groupId || blended.has(other)) continue;
        if (!shape(nx + 0.5, ny + 0.5, probe)) {
          const lit = dx * LIGHT_2D.x + dy * LIGHT_2D.y > 0.5;
          contour = lit ? FLAG_CONTOUR | FLAG_LIT_CONTOUR : FLAG_CONTOUR;
          if (!lit) break;
        }
      }
      let { x: sx, y: sy, z: sz } = normal;
      if (tilt) {
        sx += tilt.x;
        sy -= tilt.y;
        const length = Math.hypot(sx, sy, sz) || 1;
        sx /= length;
        sy /= length;
        sz /= length;
      }
      written.push(index, contour, sx, sy, sz);
    });
    // Written after the scan, so the shape never counts its own pixels as covered ones.
    for (let i = 0; i < written.length; i += 5) {
      const index = written[i] ?? 0;
      this.material[index] = materialId;
      this.host[index] = materialId;
      this.group[index] = groupId;
      this.flags[index] = (options.flat === true ? FLAG_FLAT : 0) | (written[i + 1] ?? 0);
      this.nx[index] = written[i + 2] ?? 0;
      this.ny[index] = written[i + 3] ?? 0;
      this.nz[index] = written[i + 4] ?? 1;
    }
  }

  private scan(bounds: Bounds, visit: (x: number, y: number, index: number) => void): void {
    const x0 = Math.max(0, Math.floor(bounds.left));
    const y0 = Math.max(0, Math.floor(bounds.top));
    const x1 = Math.min(this.width - 1, Math.ceil(bounds.right));
    const y1 = Math.min(this.height - 1, Math.ceil(bounds.bottom));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) visit(x, y, y * this.width + x);
    }
  }

  /** Lighting band of a shaded pixel (BAND), or -1 for empty, exact and contour pixels. */
  private band(index: number): number {
    const flags = this.flags[index] ?? 0;
    if (flags & (FLAG_EXACT | FLAG_CONTOUR)) return -1;
    const material = this.materials[this.material[index] ?? EMPTY];
    if (!material) return -1;
    if (flags & FLAG_FLAT) return BAND.base;
    const nx = this.nx[index] ?? 0;
    const ny = this.ny[index] ?? 0;
    const nz = this.nz[index] ?? 1;
    const lit = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
    if (material.gloss !== undefined) {
      // Mirror of the light around the normal, compared with the view direction (z).
      const reflected = 2 * lit * nz - LIGHT.z;
      if (reflected > (material.glossCut ?? DEFAULT_GLOSS_CUT)) return BAND.gloss;
    }
    if (lit > BANDS.lit) return BAND.light;
    if (lit > BANDS.base) return BAND.base;
    if (lit > BANDS.shadow) return BAND.shadow;
    return BAND.deep;
  }

  private tone(index: number, band: number): number {
    const flags = this.flags[index] ?? 0;
    if (flags & FLAG_EXACT) return this.exact[index] ?? 0;
    const material = this.materials[this.material[index] ?? EMPTY];
    if (!material) return 0;
    if (flags & FLAG_CONTOUR) {
      const host = this.materials[this.host[index] ?? EMPTY] ?? material;
      return flags & FLAG_LIT_CONTOUR ? host.shadow : host.outline;
    }
    switch (band) {
      case BAND.gloss:
        return material.gloss ?? material.light;
      case BAND.light:
        return material.light;
      case BAND.base:
        return material.base;
      case BAND.shadow:
        return material.shadow;
      default:
        return material.deep;
    }
  }

  /**
   * A part drawn later (in front) darkens what lies just behind it, away from the light, by
   * one band: depth without black lines (the torso under the arm, the neck under the jaw).
   */
  private castShadows(bands: Int8Array): void {
    const next = bands.slice();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        const band = bands[index] ?? -1;
        if (band <= BAND.deep || (this.flags[index] ?? 0) & FLAG_FLAT) continue;
        const own = this.group[index] ?? EMPTY;
        for (let k = 1; k <= CAST_SHADOW; k++) {
          const sx = Math.round(x + LIGHT_2D.x * k);
          const sy = Math.round(y + LIGHT_2D.y * k);
          if (sx < 0 || sy < 0 || sx >= this.width || sy >= this.height) break;
          const other = this.group[sy * this.width + sx] ?? EMPTY;
          if (other > own && !((this.flags[sy * this.width + sx] ?? 0) & FLAG_GHOST)) {
            next[index] = Math.min(band, BAND.light) - 1;
            break;
          }
        }
      }
    }
    bands.set(next);
  }

  /** A pixel whose band differs from 3 of its 4 same-material neighbors, which agree, is noise. */
  private cleanOrphans(bands: Int8Array): void {
    const next = bands.slice();
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const index = y * this.width + x;
        const band = bands[index] ?? -1;
        if (band < 0 || (this.flags[index] ?? 0) & FLAG_FLAT) continue;
        const material = this.material[index];
        const votes = new Map<number, number>();
        for (const { x: dx, y: dy } of NEIGHBORS) {
          const n = (y + dy) * this.width + x + dx;
          const other = bands[n] ?? -1;
          if (other < 0 || this.material[n] !== material) continue;
          votes.set(other, (votes.get(other) ?? 0) + 1);
        }
        for (const [other, count] of votes) {
          if (other !== band && count >= 3) next[index] = other;
        }
      }
    }
    bands.set(next);
  }

  /** 1 px of back light on the silhouette edges turned toward it (the back and the top). */
  private backLight(): void {
    const next = this.pixels.slice();
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const index = y * this.width + x;
        const flags = this.flags[index] ?? 0;
        if (flags & (FLAG_EXACT | FLAG_CONTOUR | FLAG_FLAT)) continue;
        const material = this.materials[this.material[index] ?? EMPTY];
        if (material?.rim === undefined) continue;
        const behind = this.group[index - 1] === EMPTY;
        const above = this.group[index - this.width] === EMPTY && (this.nx[index] ?? 0) <= 0.15;
        if (behind || above) next[index] = material.rim;
      }
    }
    this.pixels.set(next);
  }

  /** Surrounds the silhouette: darkest tone on the shadow side, a softer one on the lit side. */
  private outline(): void {
    const next = this.pixels.slice();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        if (this.group[index] !== EMPTY) continue;
        for (const { x: dx, y: dy } of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
          const neighbor = ny * this.width + nx;
          const material = this.materials[this.host[neighbor] ?? EMPTY];
          if (!material || (this.flags[neighbor] ?? 0) & FLAG_GHOST) continue;
          // This empty pixel lies on the lit side of the shape when it is toward the light.
          const lit = -dx * LIGHT_2D.x - dy * LIGHT_2D.y > 0.5;
          next[index] = lit ? material.deep : material.outline;
          break;
        }
      }
    }
    this.pixels.set(next);
  }

  private materialId(material: Material): number {
    const existing = this.materials.indexOf(material);
    if (existing >= 0) return existing;
    this.materials.push(material);
    return this.materials.length - 1;
  }

  private groupId(name: string | undefined): number {
    const key = name ?? `#${this.anonymous++}`;
    const existing = this.groups.indexOf(key);
    if (existing >= 0) return existing;
    this.groups.push(key);
    return this.groups.length - 1;
  }
}

/** Normal of a sphere (or a cylinder's cross-section) at offset (u, v) of its unit disc. */
function sphereNormal(normal: Normal, u: number, v: number): void {
  const s = Math.min(1, u * u + v * v);
  normal.x = u;
  normal.y = v;
  normal.z = Math.sqrt(1 - s);
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

/**
 * Where a point sits between the two edges a line through it crosses, along `direction`:
 * -1 at the edge behind, 1 at the edge ahead.
 */
function spanPosition(points: readonly Point[], x: number, y: number, direction: Point): number {
  let behind = -Infinity;
  let ahead = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    if (!a || !b) continue;
    // Solve p + s * direction = a + t * (b - a).
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denominator = direction.x * ey - direction.y * ex;
    if (Math.abs(denominator) < 1e-9) continue;
    const t = ((x - a.x) * direction.y - (y - a.y) * direction.x) / denominator;
    if (t < 0 || t > 1) continue;
    const s = ((a.x - x) * ey - (a.y - y) * ex) / denominator;
    if (s < 0) behind = Math.max(behind, s);
    else ahead = Math.min(ahead, s);
  }
  if (!Number.isFinite(behind) || !Number.isFinite(ahead)) return 0;
  return Math.max(-1, Math.min(1, -(behind + ahead) / (ahead - behind)));
}

/** Distance to the closest edge of a polygon and the outward direction toward it. */
function nearestEdge(
  points: readonly Point[],
  x: number,
  y: number,
): { distance: number; outX: number; outY: number } {
  let best = { distance: Infinity, outX: 0, outY: 0 };
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1e-9;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
    const cx = a.x + dx * t - x;
    const cy = a.y + dy * t - y;
    const distance = Math.hypot(cx, cy);
    if (distance < best.distance) {
      best = { distance, outX: cx / (distance || 1), outY: cy / (distance || 1) };
    }
  }
  return best;
}

function boundsOf(points: readonly Point[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function unit3(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}

function unit2(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
