import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { PauseInput } from '../../src/input/pause-input';
import { PlayerInputs } from '../../src/input/player-inputs';
import { TouchControls } from '../../src/input/touch-controls';
import { DebugOverlay } from '../../src/render/debug-overlay';
import { FighterSelect } from '../../src/ui/fighter-select';
import { Menu } from '../../src/ui/menu';
import { TitleScreen } from '../../src/ui/title-screen';
import { installFakePage, type FakePage } from './fake-dom';

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
  ['TitleScreen', (page) => new TitleScreen(asParent(page), () => undefined)],
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
    vi.unstubAllGlobals();
  });

  it.each(CASES)('%s lets go of the page once disposed', (_, create) => {
    const page = installFakePage();
    const disposable = create(page);
    expect(page.listeners() + page.body.children.length).toBeGreaterThan(0);

    disposable.dispose();
    expect(page.listeners()).toBe(0);
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
