import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { PauseInput } from '../../src/input/pause-input';
import { PlayerInputs } from '../../src/input/player-inputs';
import { TouchControls } from '../../src/input/touch-controls';
import { DebugOverlay } from '../../src/render/debug-overlay';
import { Menu } from '../../src/ui/menu';
import { TitleScreen } from '../../src/ui/title-screen';
import { installFakePage, type FakePage } from './fake-dom';

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
});
