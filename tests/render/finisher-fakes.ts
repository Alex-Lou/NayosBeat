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
  'setRotation',
  'setScale',
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
] as const;
for (const name of CHAINED) {
  Object.defineProperty(FakeObject.prototype, name, {
    value(this: FakeObject) {
      return this;
    },
  });
}

/** A scene whose `add` makes fakes, kept by kind in the order they were made. */
export function fakeStage(): {
  scene: Phaser.Scene;
  made: {
    rectangles: FakeObject[];
    graphics: FakeObject[];
    containers: FakeObject[];
    texts: FakeObject[];
  };
} {
  const made = {
    rectangles: [] as FakeObject[],
    graphics: [] as FakeObject[],
    containers: [] as FakeObject[],
    texts: [] as FakeObject[],
  };
  const keep = (list: FakeObject[], object: FakeObject) => {
    list.push(object);
    return object;
  };
  const scene = {
    scale: { width: 1920 },
    add: {
      rectangle: () => keep(made.rectangles, new FakeObject()),
      graphics: () => keep(made.graphics, new FakeObject()),
      container: () => keep(made.containers, new FakeObject()),
      text: (_x: number, _y: number, text: string, style: { fontSize?: number }) =>
        keep(made.texts, new FakeObject(style.fontSize ?? 10).setText(text)),
    },
  } as unknown as Phaser.Scene;
  return { scene, made };
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
