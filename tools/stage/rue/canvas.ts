/**
 * The street's drawing surface: one palette slot a pixel (palette.ts), slot 0 transparent. Every
 * shape lands on whole pixels; nothing is blended.
 */

import { CLEAR } from './palette.ts';

/** Bounds of a clip: left and top included, right and bottom excluded. */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
  /**
   * Where drawing lands: the whole canvas, or a rectangle (an animation's, redrawn frame by frame
   * without the cost of the whole layer).
   */
  clip: Bounds;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
    this.clip = { left: 0, top: 0, right: width, bottom: height };
  }

  inside(x: number, y: number): boolean {
    const { left, top, right, bottom } = this.clip;
    return x >= left && y >= top && x < right && y < bottom;
  }

  /** The slot at x, y; transparent outside the canvas. */
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
      ? (this.pixels[y * this.width + x] ?? CLEAR)
      : CLEAR;
  }

  set(x: number, y: number, slot: number): void {
    if (this.inside(x, y)) this.pixels[y * this.width + x] = slot;
  }

  /** `width` × `height` pixels from x, y, clipped to the canvas. */
  fill(x: number, y: number, width: number, height: number, slot: number): void {
    this.paint(x, y, width, height, () => slot);
  }

  /** Each pixel of the rectangle takes what `slotAt` gives; undefined leaves it as it is. */
  paint(
    x: number,
    y: number,
    width: number,
    height: number,
    slotAt: (x: number, y: number) => number | undefined,
  ): void {
    const left = Math.max(this.clip.left, Math.round(x));
    const top = Math.max(this.clip.top, Math.round(y));
    const right = Math.min(this.clip.right, Math.round(x + width));
    const bottom = Math.min(this.clip.bottom, Math.round(y + height));
    for (let py = top; py < bottom; py++) {
      for (let px = left; px < right; px++) {
        const slot = slotAt(px, py);
        if (slot !== undefined) this.pixels[py * this.width + px] = slot;
      }
    }
  }

  hline(x: number, y: number, width: number, slot: number): void {
    this.fill(x, y, width, 1, slot);
  }

  vline(x: number, y: number, height: number, slot: number): void {
    this.fill(x, y, 1, height, slot);
  }

  /** A straight line of whole pixels (Bresenham), `thick` pixels square at each step. */
  line(x0: number, y0: number, x1: number, y1: number, slot: number, thick = 1): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    const dx = Math.abs(tx - x);
    const dy = -Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.fill(x, y, thick, thick, slot);
      if (x === tx && y === ty) return;
      const twice = 2 * error;
      if (twice >= dy) {
        error += dy;
        x += sx;
      }
      if (twice <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  /** A filled ellipse inside the box x, y, width, height. */
  ellipse(x: number, y: number, width: number, height: number, slot: number): void {
    const cx = x + width / 2;
    const cy = y + height / 2;
    this.paint(x, y, width, height, (px, py) => {
      const nx = (px + 0.5 - cx) / (width / 2);
      const ny = (py + 0.5 - cy) / (height / 2);
      return nx * nx + ny * ny <= 1 ? slot : undefined;
    });
  }

  /** Copies the opaque pixels of `other` with its top left corner at x, y. */
  draw(other: Canvas, x: number, y: number): void {
    for (let py = 0; py < other.height; py++) {
      for (let px = 0; px < other.width; px++) {
        const slot = other.get(px, py);
        if (slot !== CLEAR) this.set(x + px, y + py, slot);
      }
    }
  }

  /** A copy of the rectangle x, y, width, height (transparent where it leaves the canvas). */
  crop(x: number, y: number, width: number, height: number): Canvas {
    const out = new Canvas(width, height);
    out.paint(0, 0, width, height, (px, py) => this.get(x + px, y + py));
    return out;
  }
}

/** A shape as the pixels it covers: true inside. */
export class Mask {
  readonly width: number;
  readonly height: number;
  readonly bits: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bits = new Uint8Array(width * height);
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
      ? this.bits[y * this.width + x] === 1
      : false;
  }

  add(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.bits[y * this.width + x] = 1;
  }

  remove(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.bits[y * this.width + x] = 0;
  }

  rect(x: number, y: number, width: number, height: number): void {
    for (let py = Math.round(y); py < Math.round(y + height); py++) {
      for (let px = Math.round(x); px < Math.round(x + width); px++) this.add(px, py);
    }
  }

  ellipse(x: number, y: number, width: number, height: number): void {
    const cx = x + width / 2;
    const cy = y + height / 2;
    for (let py = Math.floor(y); py < Math.ceil(y + height); py++) {
      for (let px = Math.floor(x); px < Math.ceil(x + width); px++) {
        const nx = (px + 0.5 - cx) / (width / 2);
        const ny = (py + 0.5 - cy) / (height / 2);
        if (nx * nx + ny * ny <= 1) this.add(px, py);
      }
    }
  }

  /** A thick segment: discs of `radius` along it. */
  limb(x0: number, y0: number, x1: number, y1: number, radius: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      this.ellipse(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }

  /** A filled polygon (even-odd), its points in order. */
  polygon(points: readonly (readonly [number, number])[]): void {
    const ys = points.map(([, y]) => y);
    for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) {
      const cy = py + 0.5;
      const crossings: number[] = [];
      points.forEach(([ax, ay], index) => {
        const [bx, by] = points[(index + 1) % points.length] ?? [ax, ay];
        if (ay <= cy === by <= cy) return;
        crossings.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      });
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const from = Math.round(crossings[i] ?? 0);
        const to = Math.round(crossings[i + 1] ?? 0);
        for (let px = from; px < to; px++) this.add(px, py);
      }
    }
  }
}

/** 4 × 4 ordered dithering thresholds, 0 to 1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function bayerAt(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)] ?? 0.5;
}

/**
 * How narrow the dithered band between two tones is: only the middle third of each step is
 * dithered, the rest are flat runs (a band of checkers everywhere would read as noise, and
 * shimmer when the screen shakes).
 */
const DITHER_SHARPNESS = 3;

/**
 * The tone of a ramp at a fractional `level` (0: its first, darkest slot), at pixel x, y: a flat
 * step, or near the middle between two steps, an ordered dither of both.
 */
export function tone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const spread = Math.min(Math.max((fraction - 0.5) * DITHER_SHARPNESS + 0.5, 0), 1);
  const step = spread > bayerAt(x, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? CLEAR;
}

/** A ramp's slot at a whole step, clamped to the ramp. */
export function at(ramp: readonly number[], step: number): number {
  return ramp[Math.min(Math.max(Math.round(step), 0), ramp.length - 1)] ?? CLEAR;
}
