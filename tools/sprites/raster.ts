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

/**
 * How a fighter's strips are lit beyond the key light, when it asks for it (`Fighter.lighting`);
 * without it, the default 1 px back light on every back and top edge.
 */
export interface Lighting {
  /** The ground's row in every cell (the feet): the heights below count from it, in pixels. */
  readonly ground: number;
  /**
   * The back light (a sign behind the fighter, up high): the silhouette's edge pixels that face
   * it squarely take their material's rim tone, those that face it a little less its light
   * tone, the others none. Which way an edge faces comes from the shape itself (the empty pixels
   * around it), so it follows every pose. It fades toward the ground: its light tone only under
   * `fade.full`, nothing under `fade.none`.
   */
  readonly rim: {
    /** Where the back light comes from, in image axes (x right, y down), toward the light. */
    readonly direction: Point;
    /** How squarely an edge faces it (cosine) to take the rim tone, and the light tone. */
    readonly facing: { readonly rim: number; readonly light: number };
    readonly fade: { readonly full: number; readonly none: number };
    /** The rim and light tones of exact pixels (a stamped head's hair), by their slot. */
    readonly exact: Readonly<Record<number, RimTones>>;
  };
  /**
   * The lower body darkens toward the floor (ambient occlusion): under `height`, the key light
   * a shape receives falls off, by `depth` (in n·L) at the ground. The tones follow the volume as
   * they darken, never a straight line; no shine there.
   */
  readonly occlusion: { readonly height: number; readonly depth: number };
  /**
   * Exact pixels that glow (neon), by slot: the shaded pixels touching one (4 neighbors) take
   * the halo slot given, a 1 px halo inside the silhouette.
   */
  readonly glow: Readonly<Record<number, number>>;
  /**
   * How the light of the fighter's own effects falls on the body (`PixelCanvas.lightBy`): the
   * surfaces turned to a source take its color, the ones turned away sink a band, and the whole
   * frame loses some key light while a strong source burns (docs/art/nayo-essence.md). Without
   * it, the effects light nothing.
   */
  readonly fx?: EffectLighting;
}

/**
 * The colors a body takes under its effects' light. A pixel's material is known by its outline
 * slot (every variant of a material, far limb or seam, keeps it).
 */
export interface EffectLighting {
  /** By light color, then by a material's outline slot: its tone grazed, and squarely lit. */
  readonly tints: Readonly<Record<string, Readonly<Record<number, Tint>>>>;
  /**
   * Exact pixels that take the light (a stamped head, `PixelCanvas.volume`), by slot: their
   * material's outline slot, and the slot a band darker.
   */
  readonly exact: Readonly<Record<number, { readonly material: number; readonly darker: number }>>;
  /** The intensity (0 to 1) from which a surface is grazed (`kiss`), and squarely lit (`lit`). */
  readonly levels: { readonly kiss: number; readonly lit: number };
  /** Key light (n·L) the rest of the frame loses under a source of power 1: the contrast. */
  readonly drama: number;
  /** Key light (n·L) a surface turned right away from a source of power 1 loses: its shadow. */
  readonly shadow: number;
  /** Rows above the ground (`Lighting.ground`) no effect lights: nothing under the feet. */
  readonly floor: number;
}

/** A material's tones under one light color. */
export interface Tint {
  readonly kiss: number;
  readonly lit: number;
}

/**
 * A light given off by an effect, in canvas pixels, for the cell between `left` and `right` (it
 * never spills into the next frame). It reaches `reach` pixels, fading out; `power` 1 is a
 * charged record or a flash in the hand.
 */
export interface EffectLight {
  readonly x: number;
  readonly y: number;
  readonly reach: number;
  readonly power: number;
  /** Its color: a key of `EffectLighting.tints`. */
  readonly color: string;
  readonly left: number;
  readonly right: number;
}

/** What a pixel turns into under a back light: squarely faced, half faced. */
export interface RimTones {
  readonly rim: number;
  readonly light: number;
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
/** Toward the key light, in the image (x right, y down): the side of a fold that catches it. */
export const KEY_LIGHT_2D: Point = LIGHT_2D;
/** How far (px) a part in front casts its shadow on what is behind it, away from the light. */
const CAST_SHADOW = 2;
/** How far (px) a `Lighting`'s back light looks around an edge pixel to tell which way it faces. */
const RIM_REACH = 2;

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
/** An exact pixel given a volume (`volume`): its normal is real, effects light it. */
const FLAG_VOLUME = 32;
/** How far in front of the body an effect's light sits, per pixel of distance, and at least. */
const LIGHT_DEPTH = { perPixel: 0.25, least: 2 } as const;
/** The key light (n·L) a stamped pixel must lose to take its slot a band darker. */
const EXACT_SHADE = 0.12;

/** What an `EffectLighting` does to a strip's pixels (see PixelCanvas.effectLight). */
interface EffectLit {
  readonly level: Uint8Array;
  readonly color: Int16Array;
  readonly colors: readonly string[];
  readonly shade: Float32Array;
}

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
  private readonly lights: EffectLight[] = [];
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

  /**
   * Gives the exact pixels around `center` (a stamped head) the normals of a ball of `radius`
   * pixels, so an effect's light (`lightBy`) shades them like the drawn shapes; those past the
   * radius (hair spikes) face outward.
   */
  volume(center: Point, radius: number): void {
    const reach = radius * 1.6;
    const normal: Normal = { x: 0, y: 0, z: 1 };
    this.scan(
      {
        left: center.x - reach,
        right: center.x + reach,
        top: center.y - reach,
        bottom: center.y + reach,
      },
      (x, y, index) => {
        const flags = this.flags[index] ?? 0;
        if (!(flags & FLAG_EXACT) || flags & FLAG_GHOST) return;
        const u = (x + 0.5 - center.x) / radius;
        const v = (y + 0.5 - center.y) / radius;
        if (u * u + v * v > 2.56) return;
        const length = Math.hypot(u, v);
        sphereNormal(normal, length > 1 ? u / length : u, length > 1 ? v / length : v);
        this.nx[index] = normal.x;
        this.ny[index] = normal.y;
        this.nz[index] = normal.z;
        this.flags[index] = flags | FLAG_VOLUME;
      },
    );
  }

  /** A light given off by an effect, shed on the body by `finish` when its lighting asks. */
  lightBy(light: EffectLight): void {
    this.lights.push(light);
  }

  /**
   * Shades, contours, casts shadows, cleans, back-lights and outlines into `pixels`; with a
   * `lighting`, the back light falls on the edges that face it, and the neons glow; with its
   * `fx`, the effects' lights (`lightBy`) color what faces them and darken what turns away.
   */
  finish(lighting?: Lighting): void {
    const lit =
      lighting?.fx && this.lights.length > 0
        ? this.effectLight(lighting.fx, lighting.ground)
        : undefined;
    const bands = new Int8Array(this.pixels.length);
    for (let index = 0; index < this.pixels.length; index++) {
      const occlusion = lighting ? occlusionAt(lighting, Math.floor(index / this.width)) : 0;
      bands[index] = this.band(index, occlusion + (lit?.shade[index] ?? 0));
    }
    this.castShadows(bands);
    this.cleanOrphans(bands);
    for (let index = 0; index < this.pixels.length; index++) {
      this.pixels[index] = this.tone(index, bands[index] ?? -1);
    }
    if (lighting) {
      this.rimLight(lighting);
      this.glow(lighting.glow);
      if (lighting.fx && lit) this.tint(lighting.fx, lit, bands);
    } else {
      this.backLight();
    }
    this.outline();
  }

  /**
   * What the effects' lights do to each pixel: how lit it is (0 none, 1 grazed, 2 squarely), by
   * which color, and how much key light it loses (turned away from a source, or left in the dark
   * of a frame a strong source burns in).
   */
  private effectLight(fx: EffectLighting, ground: number): EffectLit {
    const size = this.pixels.length;
    const level = new Uint8Array(size);
    const color = new Int16Array(size).fill(-1);
    const shade = new Float32Array(size);
    const colors = [...new Set(this.lights.map((light) => light.color))];
    const best = new Float32Array(size);
    // The strongest source of each column's frame: the dark it leaves around it.
    const strongest = new Float32Array(this.width);
    for (const light of this.lights) {
      for (let x = Math.max(0, light.left); x < Math.min(this.width, light.right); x++) {
        strongest[x] = Math.max(strongest[x] ?? 0, light.power);
      }
      const colorId = colors.indexOf(light.color);
      this.scan(
        {
          left: Math.max(light.left, light.x - light.reach),
          right: Math.min(light.right - 1, light.x + light.reach),
          top: light.y - light.reach,
          bottom: Math.min(light.y + light.reach, ground - fx.floor),
        },
        (x, y, index) => {
          if (!this.takesLight(index, fx)) return;
          const dx = light.x - (x + 0.5);
          const dy = light.y - (y + 0.5);
          const distance = Math.hypot(dx, dy);
          if (distance >= light.reach) return;
          const t = distance / light.reach;
          const falloff = (1 - t * t) * (1 - t * t) * light.power;
          const dz = distance * LIGHT_DEPTH.perPixel + LIGHT_DEPTH.least;
          const length = Math.hypot(dx, dy, dz);
          const facing =
            ((this.nx[index] ?? 0) * dx + (this.ny[index] ?? 0) * dy + (this.nz[index] ?? 1) * dz) /
            length;
          if (facing < 0) {
            shade[index] = Math.max(shade[index] ?? 0, -facing * falloff * fx.shadow);
            return;
          }
          const strength = facing * falloff;
          if (strength > (best[index] ?? 0)) {
            best[index] = strength;
            color[index] = colorId;
          }
        },
      );
    }
    for (let index = 0; index < size; index++) {
      const strength = best[index] ?? 0;
      level[index] = strength >= fx.levels.lit ? 2 : strength >= fx.levels.kiss ? 1 : 0;
      if (level[index] === 0 && this.takesLight(index, fx)) {
        const power = strongest[index % this.width] ?? 0;
        shade[index] = (shade[index] ?? 0) + power * fx.drama;
      }
    }
    this.cleanLevels(level);
    return { level, color, colors, shade };
  }

  /** Whether a pixel takes an effect's light: a shaded surface, or an exact one with a volume. */
  private takesLight(index: number, fx: EffectLighting): boolean {
    const flags = this.flags[index] ?? 0;
    if (flags & (FLAG_GHOST | FLAG_CONTOUR | FLAG_FLAT)) return false;
    if (flags & FLAG_EXACT) {
      return (flags & FLAG_VOLUME) !== 0 && fx.exact[this.exact[index] ?? 0] !== undefined;
    }
    return this.materials[this.material[index] ?? EMPTY] !== undefined;
  }

  /** A lit pixel whose level differs from 3 of its 4 neighbors, which agree, is noise. */
  private cleanLevels(level: Uint8Array): void {
    const next = level.slice();
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const index = y * this.width + x;
        const own = level[index] ?? 0;
        const votes = [0, 0, 0];
        for (const { x: dx, y: dy } of NEIGHBORS) {
          const other = (y + dy) * this.width + x + dx;
          if (this.group[other] === EMPTY) continue;
          const vote = level[other] ?? 0;
          votes[vote] = (votes[vote] ?? 0) + 1;
        }
        votes.forEach((count, vote) => {
          if (vote !== own && count >= 3) next[index] = vote;
        });
      }
    }
    level.set(next);
  }

  /** The effects' colors on the surfaces that face them (`effectLight`). */
  private tint(
    fx: EffectLighting,
    { level, color, colors, shade }: EffectLit,
    bands: Int8Array,
  ): void {
    for (let index = 0; index < this.pixels.length; index++) {
      const lit = level[index] ?? 0;
      const flags = this.flags[index] ?? 0;
      const volume = flags & FLAG_EXACT ? fx.exact[this.exact[index] ?? 0] : undefined;
      if (volume && flags & FLAG_VOLUME && lit === 0 && (shade[index] ?? 0) >= EXACT_SHADE) {
        // A stamped pixel has no band to lose: it takes the slot a band darker.
        this.pixels[index] = volume.darker;
        continue;
      }
      const name = colors[color[index] ?? -1];
      if (name === undefined) continue;
      let material: number | undefined;
      if (flags & FLAG_EXACT) {
        if (!(flags & FLAG_VOLUME)) continue;
        material = volume?.material;
      } else if (!(flags & (FLAG_CONTOUR | FLAG_FLAT | FLAG_GHOST))) {
        material = this.materials[this.material[index] ?? EMPTY]?.outline;
      }
      const tones = material === undefined ? undefined : fx.tints[name]?.[material];
      if (!tones || lit === 0) continue;
      // Grazed, a surface keeps its shadows: only its lit tones take the color, so the form
      // still reads under it.
      const shadowed = volume
        ? (this.exact[index] ?? 0) <= volume.material + 2
        : (bands[index] ?? -1) < BAND.base;
      if (lit === 1 && shadowed) continue;
      this.pixels[index] = lit === 2 ? tones.lit : tones.kiss;
    }
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
  private band(index: number, shade: number): number {
    const flags = this.flags[index] ?? 0;
    if (flags & (FLAG_EXACT | FLAG_CONTOUR)) return -1;
    const material = this.materials[this.material[index] ?? EMPTY];
    if (!material) return -1;
    if (flags & FLAG_FLAT) return BAND.base;
    const nx = this.nx[index] ?? 0;
    const ny = this.ny[index] ?? 0;
    const nz = this.nz[index] ?? 1;
    const lit = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z - shade;
    if (material.gloss !== undefined && shade === 0) {
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

  /**
   * The back light of a `Lighting`: 1 px on the silhouette's edges that face it. A shape's edge
   * is its last pixel (the outline goes around it); a stamped grid draws its own outline, so its
   * rim goes on the pixel just inside it. Which way an edge faces is read from the empty pixels
   * around it (RIM_REACH), so the light follows the pose, never a fixed side of a part.
   */
  private rimLight({ rim, ground }: Lighting): void {
    const toward = unit2(rim.direction.x, rim.direction.y);
    const empty = (index: number): boolean => this.group[index] === EMPTY;
    const edge = (index: number): boolean =>
      NEIGHBORS.some(({ x, y }) => empty(index + y * this.width + x));
    const next = this.pixels.slice();
    for (let y = RIM_REACH; y < this.height - RIM_REACH; y++) {
      for (let x = RIM_REACH; x < this.width - RIM_REACH; x++) {
        const index = y * this.width + x;
        const height = ground - y;
        if (empty(index) || height < rim.fade.none) continue;
        const tone = this.rimToneAt(index, rim.exact);
        if (tone === undefined) continue;
        const exact = (i: number): boolean => ((this.flags[i] ?? 0) & FLAG_EXACT) !== 0;
        const onEdge = exact(index)
          ? !edge(index) &&
            NEIGHBORS.some(({ x: dx, y: dy }) => {
              const other = index + dy * this.width + dx;
              return exact(other) && edge(other);
            })
          : edge(index);
        if (!onEdge) continue;
        // Away from the shape: the sum of the directions to the empty pixels nearby.
        let ox = 0;
        let oy = 0;
        for (let dy = -RIM_REACH; dy <= RIM_REACH; dy++) {
          for (let dx = -RIM_REACH; dx <= RIM_REACH; dx++) {
            if ((dx === 0 && dy === 0) || !empty(index + dy * this.width + dx)) continue;
            const distance = Math.hypot(dx, dy);
            ox += dx / (distance * distance);
            oy += dy / (distance * distance);
          }
        }
        const length = Math.hypot(ox, oy);
        if (length === 0) continue;
        const facing = (ox * toward.x + oy * toward.y) / length;
        const full = height >= rim.fade.full;
        if (facing >= rim.facing.rim) next[index] = full ? tone.rim : tone.light;
        else if (full && facing >= rim.facing.light) next[index] = tone.light;
      }
    }
    this.pixels.set(next);
  }

  /** The tones a pixel takes under a `Lighting`'s back light, if any. */
  private rimToneAt(index: number, exact: Lighting['rim']['exact']): RimTones | undefined {
    const flags = this.flags[index] ?? 0;
    if (flags & FLAG_EXACT) return flags & FLAG_GHOST ? undefined : exact[this.exact[index] ?? 0];
    if (flags & (FLAG_CONTOUR | FLAG_FLAT)) return undefined;
    const material = this.materials[this.material[index] ?? EMPTY];
    return material?.rim === undefined ? undefined : { rim: material.rim, light: material.light };
  }

  /** A `Lighting`'s neons: their shaded neighbors take the halo slot, inside the silhouette. */
  private glow(halo: Readonly<Record<number, number>>): void {
    const next = this.pixels.slice();
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const index = y * this.width + x;
        if (!((this.flags[index] ?? 0) & FLAG_EXACT)) continue;
        const tone = halo[this.exact[index] ?? 0];
        if (tone === undefined) continue;
        for (const { x: dx, y: dy } of NEIGHBORS) {
          const other = index + dy * this.width + dx;
          const group = this.group[other] ?? EMPTY;
          if (group === EMPTY || group === LOOSE) continue;
          if ((this.flags[other] ?? 0) & FLAG_EXACT) continue;
          next[other] = tone;
        }
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

/** How much key light a `Lighting`'s ambient occlusion takes from the pixels of row `y`. */
function occlusionAt({ ground, occlusion }: Lighting, y: number): number {
  const height = ground - y;
  return height >= occlusion.height
    ? 0
    : (occlusion.depth * (occlusion.height - height)) / occlusion.height;
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
