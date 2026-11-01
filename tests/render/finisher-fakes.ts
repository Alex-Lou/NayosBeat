import type Phaser from 'phaser';
import { vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import type { FightFeedback } from '../../src/render/fight-feedback';

/**
 * Stand-ins for what the Finisher's director draws with (docs/finisher.md §1.14): engine objects
 * that take every call and keep what can be seen of them (shown, opacity, place, words), the
 * sounds and the fight's bus as asked, the fight's effects as asked.
 */

/** An engine object of the scene: what it shows, kept from the calls it gets. */
export class FakeObject {
  visible = true;
  alpha = 1;
  x = 0;
  y = 0;
  text = '';
  width = 0;
  height = 0;
  readonly style: { resolution: number } = { resolution: 1 };
  readonly children: FakeObject[] = [];
  /** Calls made to draw it (Graphics), counted. */
  draws = 0;
  constructor(private readonly size = 10) {}
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
  setPosition(x: number, y = this.y): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setY(y: number): this {
    this.y = y;
    return this;
  }
  rotation = 0;
  scaleX = 1;
  scaleY = 1;
  setRotation(rotation: number): this {
    this.rotation = rotation;
    return this;
  }
  setScale(x: number, y = x): this {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setText(text: string): this {
    this.text = text;
    this.width = text.length * this.size * 0.55;
    this.height = this.size;
    return this;
  }
  add(children: FakeObject | FakeObject[]): this {
    this.children.push(...(Array.isArray(children) ? children : [children]));
    return this;
  }
  clear(): this {
    this.draws++;
    return this;
  }
}

/** Every chainable call the director makes that changes nothing a test reads. */
const CHAINED = [
  'setDepth',
  'setOrigin',
  'setFillStyle',
  'setTint',
  'clearTint',
  'setColor',
  'setStroke',
  'setResolution',
  'fillStyle',
  'fillRect',
  'fillCircle',
  'fillTriangle',
  'lineStyle',
  'lineBetween',
  'setClosePath',
  'setStrokeStyle',
  'setEndAngle',
  'buildOrderedIndices',
] as const;
for (const name of CHAINED) {
  Object.defineProperty(FakeObject.prototype, name, {
    value(this: FakeObject) {
      return this;
    },
  });
}

/** A canvas texture as made by FakeTextures: whether the shader smooths it. */
interface FakeCanvasTexture {
  smoothPixelArt: boolean | null;
}

/**
 * The game's texture manager as the scene's objects make and free their canvas textures: the
 * keys in it, the textures made, and the texels painted into each (`x,y` to its color).
 */
export class FakeTextures {
  readonly painted = new Map<string, Map<string, string>>();
  readonly made = new Map<string, FakeCanvasTexture>();
  exists(key: string): boolean {
    return this.painted.has(key);
  }
  createCanvas(key: string) {
    const texels = new Map<string, string>();
    this.painted.set(key, texels);
    const context = {
      fillStyle: '',
      fillRect(x: number, y: number, width: number, height: number) {
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) texels.set(`${x + dx},${y + dy}`, context.fillStyle);
        }
      },
    };
    const texture = {
      smoothPixelArt: null as boolean | null,
      getContext: () => context,
      setSmoothPixelArt(value: boolean) {
        texture.smoothPixelArt = value;
      },
      refresh: () => undefined,
    };
    this.made.set(key, texture);
    return texture;
  }
  remove(key: string): void {
    this.painted.delete(key);
  }
  keys(): string[] {
    return [...this.painted.keys()];
  }
}

/** A scene whose `add` makes fakes, kept by kind in the order they were made. */
export function fakeStage(): {
  scene: Phaser.Scene;
  made: {
    rectangles: FakeObject[];
    graphics: FakeObject[];
    containers: FakeObject[];
    texts: FakeObject[];
    images: FakeObject[];
    shapes: FakeObject[];
  };
  textures: FakeTextures;
} {
  const made = {
    rectangles: [] as FakeObject[],
    graphics: [] as FakeObject[],
    containers: [] as FakeObject[],
    texts: [] as FakeObject[],
    images: [] as FakeObject[],
    shapes: [] as FakeObject[],
  };
  const keep = (list: FakeObject[], object: FakeObject) => {
    list.push(object);
    return object;
  };
  const textures = new FakeTextures();
  const scene = {
    scale: { width: 1920 },
    textures,
    add: {
      rectangle: () => keep(made.rectangles, new FakeObject()),
      graphics: () => keep(made.graphics, new FakeObject()),
      container: () => keep(made.containers, new FakeObject()),
      text: (_x: number, _y: number, text: string, style: { fontSize?: number }) =>
        keep(made.texts, new FakeObject(style.fontSize ?? 10).setText(text)),
      image: () => keep(made.images, new FakeObject()),
      // The hold's ring: arcs by Canvas, meshes with WebGL.
      arc: () => keep(made.shapes, new FakeObject()),
      mesh2d: () => keep(made.shapes, new FakeObject()),
    },
  } as unknown as Phaser.Scene;
  return { scene, made, textures };
}

/** The sounds and the fight's bus as the director asks them. */
export function fakeSfx() {
  const sfx = {
    play: vi.fn(),
    setFightBus: vi.fn(),
    resetFightBus: vi.fn(),
  };
  return { sfx, asSfx: sfx as unknown as Sfx };
}

/** The fight's effects as the director asks them (FightFeedback's scene hands). */
export function fakeFeedback() {
  const feedback = {
    finisherStamp: vi.fn(),
    finisherShake: vi.fn(),
    finisherLanding: vi.fn(),
    setCloseUp: vi.fn(),
  };
  return { feedback, asFeedback: feedback as unknown as FightFeedback };
}
