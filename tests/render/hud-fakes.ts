import type Phaser from 'phaser';
import type { Span } from '../../src/render/hud-paint';

/** An engine Graphics standing in for the real one: it keeps what it was last painted. */
export class FakeGraphics {
  x: number;
  y: number;
  spans: Span[] = [];
  clears = 0;
  private color = 0;
  private alpha = 1;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  clear(): this {
    this.clears++;
    this.spans = [];
    return this;
  }
  fillStyle(color: number, alpha = 1): this {
    this.color = color;
    this.alpha = alpha;
    return this;
  }
  fillRect(x: number, y: number, width: number, height: number): this {
    this.spans.push({ x, y, width, height, color: this.color, alpha: this.alpha });
    return this;
  }
}

/** An engine text standing in for the real one. */
export class FakeText {
  text: string;
  readonly style: { color: string };
  alpha = 1;
  renders = 0;
  constructor(text: string, color = '#ffffff') {
    this.text = text;
    this.style = { color };
  }
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setOrigin(): this {
    return this;
  }
  setText(text: string): this {
    this.renders++;
    this.text = text;
    return this;
  }
  setColor(color: string): this {
    this.renders++;
    this.style.color = color;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
}

/** An engine image standing in for the real one (the HUD's painted textures). */
class FakeImage {
  setOrigin(): this {
    return this;
  }
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
}

/** A scene whose `add` makes fakes, kept in the order they were made. */
export function fakeScene(): {
  scene: Phaser.Scene;
  graphics: FakeGraphics[];
  texts: FakeText[];
} {
  const graphics: FakeGraphics[] = [];
  const texts: FakeText[] = [];
  const scene = {
    add: {
      graphics: (options?: { x?: number; y?: number }) => {
        const made = new FakeGraphics(options?.x, options?.y);
        graphics.push(made);
        return made;
      },
      text: (_x: number, _y: number, text: string, style: { color?: string }) => {
        const made = new FakeText(text, style.color);
        texts.push(made);
        return made;
      },
      image: () => new FakeImage(),
    },
    // Painted once by the HUD: already there.
    textures: { exists: () => true },
  } as unknown as Phaser.Scene;
  return { scene, graphics, texts };
}

/** The color of the pixel (`x`, `y`) in `spans`: the last span painted over it wins. */
export function pixelOf(spans: readonly Span[], x: number, y: number): number | undefined {
  let color: number | undefined;
  for (const span of spans) {
    const inside =
      x >= span.x && x < span.x + span.width && y >= span.y && y < span.y + span.height;
    if (inside) color = span.color;
  }
  return color;
}
