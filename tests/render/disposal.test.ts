import type Phaser from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STAGE_LAYERS, type StageProp } from '../../src/art/stage-layers';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { PauseInput } from '../../src/input/pause-input';
import { PlayerInputs } from '../../src/input/player-inputs';
import { TouchControls } from '../../src/input/touch-controls';
import { DebugOverlay } from '../../src/render/debug-overlay';
import { FinisherProps } from '../../src/render/finisher-props';
import { HoldRing } from '../../src/render/hold-ring';
import { StagePropsView } from '../../src/render/stage-props';
import type { RenderMode } from '../../src/render/render-mode';
import { ControlsStore } from '../../src/input/controls-store';
import { BindingsScreen } from '../../src/ui/bindings-screen';
import { FighterSelect } from '../../src/ui/fighter-select';
import { TouchLayoutEditor } from '../../src/ui/touch-layout-editor';
import { Menu } from '../../src/ui/menu';
import { TitleScreen } from '../../src/ui/title-screen';
import { installFakePage, type FakePage } from './fake-dom';
import { fakeStage } from './finisher-fakes';

/** A fighter of the select screen that stands in guard: its idle plays while it is shown. */
const IDLE_LOOK = {
  strip: 'idle.png',
  image: { width: 160, height: 160 },
  width: 80,
  height: 160,
  cuts: [0, 80].map((left) => ({ x: 0, y: 0, width: 80, height: 160, left, top: 0 })),
  portrait: { x: 20, y: 0, size: 40 },
  idle: [
    { frame: 0, seconds: 0.1 },
    { frame: 1, seconds: 0.1 },
  ],
};

/** Something that listens to the page while it lives, and lets go of it when disposed. */
interface Disposable {
  dispose(): void;
}

/** The fake page stands in for the DOM types the classes expect. */
function asWindow(page: FakePage): Window {
  return page.window as unknown as Window;
}
function asParent(page: FakePage): HTMLElement {
  return page.body as unknown as HTMLElement;
}

const CASES: readonly [string, (page: FakePage) => Disposable][] = [
  ['KeyboardInput', (page) => new KeyboardInput(asWindow(page), [PLAYER1_KEYS, PLAYER2_KEYS])],
  ['TouchControls', (page) => new TouchControls(asParent(page), undefined)],
  [
    'PlayerInputs',
    (page) => new PlayerInputs(asWindow(page), new TouchControls(asParent(page), undefined), []),
  ],
  ['PauseInput', (page) => new PauseInput(asParent(page))],
  ['TitleScreen', (page) => new TitleScreen(asParent(page), () => undefined, false)],
  // Drawn without WebGL, it says so: its notice goes with it.
  ['TitleScreen, simplified', (page) => new TitleScreen(asParent(page), () => undefined, true)],
  [
    'Menu',
    (page) =>
      new Menu(asParent(page), {
        title: 'Menu',
        items: [{ label: 'Jouer', onSelect: () => undefined }],
        onBack: () => undefined,
      }),
  ],
  [
    'FighterSelect',
    (page) =>
      new FighterSelect(asParent(page), {
        title: 'Joueur 1',
        fighters: [{ id: 'nayo', name: 'Nayo', description: 'Vive', look: IDLE_LOOK }],
        slots: 10,
        columns: 5,
        onPick: () => undefined,
        onRandom: () => undefined,
        onBack: () => undefined,
      }),
  ],
  [
    'BindingsScreen',
    (page) =>
      new BindingsScreen(asParent(page), {
        tabs: ['keys1', 'pad1'],
        onBack: () => undefined,
        store: new ControlsStore(),
        pads: () => [],
      }),
  ],
  [
    'BindingsScreen, waiting for a key',
    (page) => {
      const screen = new BindingsScreen(asParent(page), {
        tabs: ['keys1'],
        onBack: () => undefined,
        store: new ControlsStore(),
        pads: () => [],
      });
      // To the first action, then waiting for its key: the countdown runs.
      for (const code of ['Enter', 'Enter']) {
        page.window.dispatchEvent(Object.assign(new Event('keydown'), { code, repeat: false }));
      }
      return screen;
    },
  ],
  [
    'TouchLayoutEditor',
    (page) =>
      new TouchLayoutEditor(asParent(page), {
        onBack: () => undefined,
        store: new ControlsStore(),
      }),
  ],
  [
    'DebugOverlay',
    (page) => {
      const overlay = new DebugOverlay(asParent(page));
      return {
        dispose: () => {
          overlay.destroy();
        },
      };
    },
  ],
];

describe('disposal', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(CASES)('%s lets go of the page once disposed', (_, create) => {
    vi.useFakeTimers();
    const page = installFakePage();
    const disposable = create(page);
    expect(page.listeners() + page.body.children.length).toBeGreaterThan(0);

    disposable.dispose();
    expect(page.listeners()).toBe(0);
    // No timer left either: a countdown would run on, the screen gone.
    expect(vi.getTimerCount()).toBe(0);
    expect(page.pendingFrames()).toBe(0);
    expect(page.runningAnimations()).toBe(0);
    expect(page.body.children).toHaveLength(0);
  });

  it('counts the listeners left behind', () => {
    // The harness itself: a class that forgets to remove a listener is caught.
    const page = installFakePage();
    const leaky = new KeyboardInput(asWindow(page), [PLAYER1_KEYS]);
    page.window.addEventListener('keydown', () => undefined);
    leaky.dispose();
    expect(page.listeners()).toBe(1);
  });

  it('counts the animations left running', () => {
    const page = installFakePage();
    const animation = document.createElement('div').animate([], { duration: 100 });
    expect(page.runningAnimations()).toBe(1);
    animation.cancel();
    expect(page.runningAnimations()).toBe(0);
  });
});

/**
 * What makes its own textures in the game's manager, which outlives a fight: the smooth strokes
 * of the lean context (smooth-stroke.ts), drawn with WebGL only.
 */
const TEXTURE_CASES: readonly [string, (scene: Phaser.Scene, mode: RenderMode) => Disposable][] = [
  ['HoldRing', (scene, mode) => new HoldRing(scene, 400, [0xff0000, 0x0000ff], mode)],
  ['FinisherProps', (scene, mode) => new FinisherProps(scene, 400, 1000, mode)],
];

describe('disposal of textures', () => {
  it.each(TEXTURE_CASES)('%s frees the textures it made once disposed', (_, create) => {
    const { scene, textures } = fakeStage();
    const disposable = create(scene, 'full');
    expect(textures.keys()).toHaveLength(1);

    disposable.dispose();
    expect(textures.keys()).toEqual([]);
  });

  it.each(TEXTURE_CASES)('%s makes none by Canvas', (_, create) => {
    const { scene, textures } = fakeStage();
    create(scene, 'simple');
    expect(textures.keys()).toEqual([]);
  });

  it('frees only its own: the next fight’s, made before, stays', () => {
    const { scene, textures } = fakeStage();
    const ring = new HoldRing(scene, 400, [0xff0000, 0x0000ff], 'full');
    const props = new FinisherProps(scene, 400, 1000, 'full');
    ring.dispose();
    expect(textures.keys()).toHaveLength(1);
    props.dispose();
    expect(textures.keys()).toEqual([]);
  });
});

describe('disposal of the stage props', () => {
  /** A scene that counts the images the props lay and the textures anyone would make. */
  function propScene() {
    const images: { destroyed: boolean }[] = [];
    const made: string[] = [];
    const frames = new Set<string>();
    const scene = {
      add: {
        image: () => {
          const image = { destroyed: false };
          images.push(image);
          const chain = {
            setOrigin: () => chain,
            setScale: () => chain,
            setScrollFactor: () => chain,
            setDepth: () => chain,
            setVisible: () => chain,
            setFrame: () => chain,
            setPosition: () => chain,
            destroy: () => {
              image.destroyed = true;
            },
          };
          return chain;
        },
      },
      textures: {
        get: () => ({
          has: (name: string) => frames.has(name),
          add: (name: string) => frames.add(name),
        }),
        createCanvas: (key: string) => made.push(key),
        addCanvas: (key: string) => made.push(key),
      },
    } as unknown as Phaser.Scene;
    return { scene, images, made, frames };
  }

  it('lets go of every image it laid at the end of the fight, and makes no texture', () => {
    const { scene, images, made, frames } = propScene();
    const props = new StagePropsView();
    const layer = { ...STAGE_LAYERS.mid, name: 'mid' as const, url: 'mid.png' };
    const prop: StageProp = {
      name: 'queue',
      layer: 'mid',
      frames: [null, { x: 2, y: 4, width: 6, height: 8, sheetX: 0, sheetY: 0 }],
      timeline: [
        [0, 15],
        [1, 15],
      ],
    };
    props.add(scene, layer, [prop, { ...prop, name: 'bouncer' }]);
    props.update(20);
    expect(images).toHaveLength(2);
    props.dispose();
    expect(images.every(({ destroyed }) => destroyed)).toBe(true);
    // Its frames are named in the sheet the loader made, for the next fight: no texture of its own.
    expect(made).toEqual([]);
    expect([...frames]).toEqual(['queue/1', 'bouncer/1']);
    // Disposed, it plays nothing more.
    props.update(15);
  });
});
