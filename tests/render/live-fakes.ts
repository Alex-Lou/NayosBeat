import type Phaser from 'phaser';

/**
 * A scene for the live lights and the bold shapes (light-show.ts, bold-fx.ts): its lights manager,
 * its point lights, its graphics and textures, faked, keeping what was asked of them.
 */

/** Something faked: every call chains and is noted, a few fields kept. */
export interface Fake {
  readonly calls: [string, unknown[]][];
  visible: boolean;
  x: number;
  y: number;
  intensity: number;
  radius: number;
  lighting: boolean;
  depth: number;
  tint: number | null;
  destroyed: boolean;
  [key: string]: unknown;
}

/** A chainable fake: setters it knows set its fields, anything else is only noted. */
export function fake(fields: Partial<Fake> = {}): Fake {
  const state: Fake = {
    calls: [],
    visible: true,
    x: 0,
    y: 0,
    intensity: 0,
    radius: 0,
    lighting: false,
    depth: 0,
    tint: null,
    destroyed: false,
    color: { setTo: () => undefined },
    ...fields,
  };
  const proxy: Fake = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        target.calls.push([key, args]);
        if (key === 'setVisible') target.visible = args[0] as boolean;
        else if (key === 'setPosition') [target.x, target.y] = args as [number, number];
        else if (key === 'setIntensity') target.intensity = args[0] as number;
        else if (key === 'setRadius') target.radius = args[0] as number;
        else if (key === 'setLighting') target.lighting = args[0] as boolean;
        else if (key === 'setDepth') target.depth = args[0] as number;
        else if (key === 'setTint') target.tint = args[0] as number;
        else if (key === 'clearTint') target.tint = null;
        else if (key === 'destroy') target.destroyed = true;
        return proxy;
      };
    },
  });
  return proxy;
}

export interface LiveScene {
  readonly scene: Phaser.Scene;
  readonly lights: Fake[];
  readonly glows: Fake[];
  readonly graphics: Fake[];
  readonly manager: { active: boolean; lights: Fake[]; getLights?: unknown; removed: Fake[] };
  readonly textures: Map<string, boolean>;
}

/** A scene that keeps its lights, point lights, graphics and canvas textures. */
export function recordedLiveScene(): LiveScene {
  const lights: Fake[] = [];
  const glows: Fake[] = [];
  const graphics: Fake[] = [];
  const textures = new Map<string, boolean>();
  const manager = {
    active: false,
    lights,
    removed: [] as Fake[],
    enable() {
      manager.active = true;
      return manager;
    },
    disable() {
      manager.active = false;
      return manager;
    },
    setAmbientColor() {
      return manager;
    },
    addLight() {
      const light = fake({ visible: true });
      lights.push(light);
      return light;
    },
    removeLight(light: Fake) {
      manager.removed.push(light);
      lights.splice(lights.indexOf(light), 1);
      return manager;
    },
  };
  const scene = {
    lights: manager,
    add: {
      pointlight: () => {
        const glow = fake();
        glows.push(glow);
        return glow;
      },
      graphics: () => {
        const g = fake();
        graphics.push(g);
        return g;
      },
      image: () => fake(),
    },
    textures: {
      exists: (key: string) => textures.has(key),
      remove: (key: string) => textures.delete(key),
      createCanvas: (key: string, width: number, height: number) => {
        textures.set(key, true);
        const data = new Uint8ClampedArray(width * height * 4);
        return {
          context: {
            // What it draws: the source's pixels, as `pixelsOf` paints them (a test sets it).
            drawImage: (source: { pixels?: Uint8ClampedArray }) => {
              if (source.pixels) data.set(source.pixels);
            },
            getImageData: () => ({ data, width, height }),
            putImageData: () => undefined,
          },
          refresh: () => undefined,
        };
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, lights, glows, graphics, manager, textures };
}

/** The scene alone. */
export function liveScene(): Phaser.Scene {
  return recordedLiveScene().scene;
}
