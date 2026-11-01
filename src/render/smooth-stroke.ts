import type Phaser from 'phaser';

/**
 * Strokes drawn smooth on the lean context (lean-context.ts, docs/qualite-adaptative.md §2.4).
 * Without multisampling, a shape the engine draws without a texture (an Arc, a Graphics line)
 * has stepped edges. A stroke is drawn instead with a texture of one opaque texel in a frame of
 * clear ones, stretched so that the opaque texel covers the stroke: the shader of
 * `smoothPixelArt` blends a texel into the next over one screen pixel (Phaser 4.2.1,
 * DefineBlockyTexCoord-glsl.js), at any zoom, and so smooths the stroke's edges as multisampling
 * did. WebGL only: Canvas smooths the engine's shapes itself, and has no tint (render-mode.ts).
 */

/** Texels across the texture: the opaque one in the middle, a clear one on each side. */
const FRAME = 3;

/**
 * Paints the texture `key` once: a texel of `color` in a clear frame. Its owner removes it when
 * its scene shuts down.
 */
export function paintStroke(scene: Phaser.Scene, key: string, color: number): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, FRAME, FRAME);
  if (!texture) return;
  const context = texture.getContext();
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.fillRect(1, 1, 1, 1);
  // The edges depend on it: smoothed (and filtered linearly) whatever the game's default.
  texture.setSmoothPixelArt(true);
  texture.refresh();
}

/**
 * Lays `image` (a stroke's texture) as a line `width` thick from (x1, y1) to (x2, y2), with butt
 * ends as the engine's lines: its opaque texel over the line, the clear ones past its edges.
 */
export function layLine(
  image: Phaser.GameObjects.Image,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): void {
  image
    .setPosition((x1 + x2) / 2, (y1 + y2) / 2)
    .setRotation(Math.atan2(y2 - y1, x2 - x1))
    .setScale(Math.hypot(x2 - x1, y2 - y1), width);
}

/** Segments of an arc, as many as the engine's Arc draws (Arc.js: iterations of 0.01). */
const SEGMENTS = 100;
/** Points along an arc's strip: the arc's own, and a cap past each end. */
const POINTS = SEGMENTS + 3;

/**
 * The sweep of an arc from `start` to `end` degrees, as the engine's Arc reads it (Arc.js,
 * updateData): clockwise on the screen up to a whole turn, or anticlockwise (negative).
 */
export function sweepOf(start: number, end: number, anticlockwise: boolean): number {
  const sweep = end - start;
  if (anticlockwise) return sweep < -360 ? -360 : sweep > 0 ? -360 + (sweep % 360) : sweep;
  return sweep > 360 ? 360 : sweep < 0 ? 360 + (sweep % 360) : sweep;
}

/**
 * Writes into `out` the vertices (x, y, u, v) of an arc's stroke `width` thick, centered on the
 * circle of `radius` around (0, 0), from `start` degrees for `sweep` degrees: for each point of
 * the strip, its vertex inside, then its vertex outside. Across, the strip holds the stroke and a
 * clear texel on each side. Along, its first and last points are caps, one texel past the ends
 * along the tangent, which hold the clear texels there: the ends are smoothed too. A whole turn
 * has no ends: its caps fold onto it, and its texture is opaque all along.
 */
export function arcStrip(
  out: number[],
  radius: number,
  width: number,
  start: number,
  sweep: number,
): void {
  const whole = Math.abs(sweep) >= 360;
  const half = (width * FRAME) / 2;
  const point = (index: number, degrees: number, u: number, along: number): void => {
    const angle = (degrees * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const at = index * 8;
    out[at] = cos * (radius - half) - sin * along;
    out[at + 1] = sin * (radius - half) + cos * along;
    out[at + 2] = u;
    out[at + 3] = 0;
    out[at + 4] = cos * (radius + half) - sin * along;
    out[at + 5] = sin * (radius + half) + cos * along;
    out[at + 6] = u;
    out[at + 7] = 1;
  };
  // Along the arc, u crosses the opaque texel, from its first edge to its last.
  for (let i = 0; i <= SEGMENTS; i++) {
    point(i + 1, start + (sweep * i) / SEGMENTS, whole ? 0.5 : (1 + i / SEGMENTS) / FRAME, 0);
  }
  const cap = whole ? 0 : width * Math.sign(sweep);
  point(0, start, whole ? 0.5 : 0, -cap);
  point(POINTS - 1, start + sweep, whole ? 0.5 : 1, cap);
}

/** The strip's triangles (a, b, c, page), two a segment, each pair a quad. */
function stripIndices(): number[] {
  const indices: number[] = [];
  for (let i = 0; i < POINTS - 1; i++) {
    const inside = 2 * i;
    indices.push(inside, inside + 1, inside + 2, 0, inside + 1, inside + 2, inside + 3, 0);
  }
  return indices;
}

/** Phaser 4.2.1's Mesh2D is tinted (Mesh2D.js, `setTint`), but its typings miss the method. */
type TintedMesh = Phaser.GameObjects.Mesh2D & { setTint(color: number): TintedMesh };

/**
 * An arc's stroke drawn smooth: what the engine's Arc does for the hold's ring (hold-ring.ts),
 * with the same calls and the same geometry (the stroke centered on the radius, as many
 * segments, butt ends), on a strip of the stroke's texture (paintStroke), tinted. Its vertices
 * are rewritten in place when the arc changes: nothing is allocated per frame.
 */
export class SmoothArc {
  private readonly mesh: TintedMesh;
  private readonly vertices: number[] = new Array<number>(POINTS * 8).fill(0);
  private lineWidth = 1;
  private anticlockwise = false;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    private readonly radius: number,
    private readonly startAngle: number,
    private endAngle: number,
  ) {
    // Its triangles paired into quads once (strategy 1: each with the next): batched as quads.
    this.mesh = scene.add
      .mesh2d(0, 0, texture, this.vertices, stripIndices())
      .buildOrderedIndices(1, true) as TintedMesh;
    this.shape();
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  setEndAngle(value: number, anticlockwise?: boolean): this {
    this.endAngle = value;
    if (anticlockwise !== undefined) this.anticlockwise = anticlockwise;
    this.shape();
    return this;
  }

  setStrokeStyle(lineWidth: number, color: number, alpha: number): this {
    if (lineWidth !== this.lineWidth) {
      this.lineWidth = lineWidth;
      this.shape();
    }
    this.mesh.setTint(color).setAlpha(alpha);
    return this;
  }

  setDepth(value: number): this {
    this.mesh.setDepth(value);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.mesh.setPosition(x, y);
    return this;
  }

  setScale(value: number): this {
    this.mesh.setScale(value);
    return this;
  }

  setVisible(value: boolean): this {
    this.mesh.setVisible(value);
    return this;
  }

  private shape(): void {
    const sweep = sweepOf(this.startAngle, this.endAngle, this.anticlockwise);
    arcStrip(this.vertices, this.radius, this.lineWidth, this.startAngle, sweep);
  }
}
