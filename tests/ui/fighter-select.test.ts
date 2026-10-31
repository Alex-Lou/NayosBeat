import { afterEach, describe, expect, it, vi } from 'vitest';
import { PadButton } from '../../src/input/gamepad';
import {
  FighterSelect,
  type FighterLook,
  type FighterSelectOptions,
  type SelectFighter,
} from '../../src/ui/fighter-select';
import {
  installFakePage,
  type FakeAnimation,
  type FakeElement,
  type FakePage,
} from '../render/fake-dom';

type Id = 'nayo' | 'riff';

/** A look of the fake roster: four frames of 80×160 at an uneven pace, a bust of 40 px. */
function look(strip: string): FighterLook {
  return {
    strip,
    frames: 4,
    width: 80,
    height: 160,
    portrait: { x: 20, y: 0, size: 40 },
    idle: [
      { frame: 0, seconds: 0.25 },
      { frame: 1, seconds: 0.125 },
      { frame: 2, seconds: 0.125 },
      { frame: 3, seconds: 0.5 },
    ],
  };
}

const FIGHTERS: readonly SelectFighter<Id>[] = [
  {
    id: 'nayo',
    name: 'Nayo',
    description: 'Vive',
    look: look('nayo.png'),
    mirrorLook: look('nayo-alt.png'),
  },
  { id: 'riff', name: 'Riff', description: 'Lourde', look: look('riff.png') },
];

/** The elements under `node` that have the class `name`, in page order. */
function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

function only(node: FakeElement, name: string): FakeElement {
  const [found, ...others] = byClass(node, name);
  if (!found || others.length > 0) throw new Error(`Not exactly one .${name}`);
  return found;
}

/** A key pressed on the page, held (`repeat`) or not. */
function press(page: FakePage, code: string, repeat = false): void {
  page.window.dispatchEvent(
    Object.assign(new Event('keydown', { cancelable: true }), { code, repeat }),
  );
}

/** The select screen on a fake page, with ten tiles in rows of five. */
function setup(options: Partial<FighterSelectOptions<Id>> = {}) {
  return open(installFakePage(), options);
}

/** The select screen on `page`, as `setup` opens it. */
function open(page: FakePage, options: Partial<FighterSelectOptions<Id>> = {}) {
  const onPick = vi.fn();
  const feedback = vi.fn();
  new FighterSelect<Id>(page.body as unknown as HTMLElement, {
    title: 'Joueur 1',
    fighters: FIGHTERS,
    slots: 10,
    columns: 5,
    onPick,
    feedback,
    ...options,
  });
  const [root] = page.body.children;
  if (!root) throw new Error('No select screen');
  const tiles = byClass(root, 'select-tile');
  return {
    page,
    onPick,
    feedback,
    tiles,
    tile: (index: number): FakeElement => {
      const found = tiles[index];
      if (!found) throw new Error(`No tile ${index}`);
      return found;
    },
    /** Indices of the tiles framed in yellow. */
    selected: () =>
      tiles.flatMap((tile, index) => (tile.classList.contains('selected') ? [index] : [])),
    figure: only(root, 'select-figure'),
    name: only(root, 'select-name'),
    description: only(root, 'select-description'),
  };
}

/** The animations of `node` still playing. */
function playing(node: FakeElement): FakeAnimation[] {
  return node.animations.filter(({ cancelled }) => !cancelled);
}

describe('FighterSelect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lays out ten tiles: the fighters with their busts, then the locked ones', () => {
    const { tiles, tile } = setup();
    expect(tiles).toHaveLength(10);
    expect(only(tile(0), 'select-tile-name').textContent).toBe('Nayo');
    expect(only(tile(1), 'select-tile-name').textContent).toBe('Riff');
    expect(only(tile(0), 'select-portrait').style).toMatchObject({
      backgroundImage: 'url("nayo.png")',
      // The strip is 8 busts wide and 4 high; the bust starts 20 px into the 280 it can slide.
      backgroundSize: '800% 400%',
      backgroundPosition: '7.14% 0%',
    });
    for (const locked of tiles.slice(2)) {
      expect(locked.className).toContain('locked');
      expect(only(locked, 'select-mark').textContent).toBe('?');
    }
    // Nothing takes the focus: the screen moves the frame itself.
    expect(tiles.every(({ type, tabIndex }) => type === 'button' && tabIndex === -1)).toBe(true);
  });

  it('frames the first fighter and shows it standing, its idle at the pace of the game', () => {
    const { selected, figure, name, description } = setup();
    expect(selected()).toEqual([0]);
    expect(name.textContent).toBe('Nayo');
    expect(description.textContent).toBe('Vive');
    expect(figure.style).toMatchObject({
      backgroundImage: 'url("nayo.png")',
      backgroundSize: '400% 100%',
      backgroundPositionX: '0%',
      aspectRatio: '80 / 160',
    });
    const [idle, ...others] = playing(figure);
    expect(others).toHaveLength(0);
    expect(idle?.options).toEqual({ duration: 1000, iterations: Infinity });
    // Each frame holds until the next, for as long as it does in the game.
    expect(idle?.keyframes).toEqual([
      { offset: 0, easing: 'step-end', backgroundPositionX: '0%' },
      { offset: 0.25, easing: 'step-end', backgroundPositionX: '33.33%' },
      { offset: 0.375, easing: 'step-end', backgroundPositionX: '66.67%' },
      { offset: 0.5, easing: 'step-end', backgroundPositionX: '100%' },
      { offset: 1, backgroundPositionX: '100%' },
    ]);
  });

  it('stands still on its first frame when the player keeps the screen still', () => {
    const { figure } = setup({ still: true });
    expect(figure.style.backgroundPositionX).toBe('0%');
    expect(figure.animations).toHaveLength(0);
  });

  it('starts on the last pick', () => {
    const { selected, name } = setup({ initial: 'riff' });
    expect(selected()).toEqual([1]);
    expect(name.textContent).toBe('Riff');
  });

  it('moves the frame with the arrows and picks with Enter', () => {
    const { page, onPick, feedback, selected, name } = setup();
    press(page, 'ArrowRight');
    expect(selected()).toEqual([1]);
    expect(name.textContent).toBe('Riff');
    expect(feedback).toHaveBeenLastCalledWith('move');

    press(page, 'Enter');
    expect(onPick).toHaveBeenCalledExactlyOnceWith('riff');
    expect(feedback).toHaveBeenLastCalledWith('confirm');
  });

  it('moves with W, A, S, D too (Z, Q, S, D on AZERTY)', () => {
    const { page, selected } = setup();
    press(page, 'KeyD');
    press(page, 'KeyS');
    expect(selected()).toEqual([6]);
    press(page, 'KeyA');
    press(page, 'KeyW');
    expect(selected()).toEqual([0]);
  });

  it('shows a locked tile as coming soon, and picks nothing there', () => {
    const { page, onPick, feedback, figure, name, description, selected } = setup();
    press(page, 'ArrowDown');
    expect(selected()).toEqual([5]);
    expect(name.textContent).toBe('Bientôt');
    expect(description.textContent).toBe('Un combattant de plus arrive');
    expect(figure.classList.contains('empty')).toBe(true);
    expect(figure.style.backgroundImage).toBe('none');
    expect(playing(figure)).toHaveLength(0);

    feedback.mockClear();
    press(page, 'Enter');
    expect(onPick).not.toHaveBeenCalled();
    expect(feedback).not.toHaveBeenCalled();

    // Back on a fighter, it stands there again, its idle from the start.
    press(page, 'ArrowUp');
    expect(figure.classList.contains('empty')).toBe(false);
    expect(figure.style.backgroundImage).toBe('url("nayo.png")');
    expect(playing(figure)).toHaveLength(1);
    expect(figure.animations).toHaveLength(2);
  });

  it('plays one idle at a time, from one fighter to the next', () => {
    const { page, figure } = setup();
    press(page, 'ArrowRight');
    press(page, 'ArrowLeft');
    expect(figure.animations).toHaveLength(3);
    expect(playing(figure)).toEqual([figure.animations[2]]);
  });

  it('stays put, silent, where there is nowhere to go', () => {
    const { page, feedback, selected } = setup();
    press(page, 'ArrowUp');
    expect(selected()).toEqual([0]);
    expect(feedback).not.toHaveBeenCalled();
  });

  it('moves on a held key, but never picks on one', () => {
    const { page, onPick, selected } = setup();
    press(page, 'ArrowRight', true);
    expect(selected()).toEqual([1]);
    press(page, 'Enter', true);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('frames the tile under the pointer, and picks it on a click or a tap', () => {
    const { onPick, tile, selected } = setup();
    tile(6).dispatchEvent(new Event('pointerenter'));
    expect(selected()).toEqual([6]);
    expect(onPick).not.toHaveBeenCalled();

    tile(1).dispatchEvent(new Event('click'));
    expect(selected()).toEqual([1]);
    expect(onPick).toHaveBeenCalledExactlyOnceWith('riff');
  });

  it('has no « Aléatoire » unless it is offered', () => {
    const { page, tiles, selected } = setup();
    expect(tiles.some(({ className }) => className.includes('select-random'))).toBe(false);
    press(page, 'ArrowDown');
    press(page, 'ArrowDown');
    expect(selected()).toEqual([5]);
  });

  it('offers « Aléatoire » under the grid', () => {
    const onRandom = vi.fn();
    const { page, onPick, tiles, tile, selected, name, description, figure } = setup({ onRandom });
    expect(tiles).toHaveLength(11);
    expect(tile(10).className).toContain('select-random');
    expect(tile(10).textContent).toBe('Aléatoire');

    press(page, 'ArrowDown');
    press(page, 'ArrowDown');
    expect(selected()).toEqual([10]);
    expect(name.textContent).toBe('Aléatoire');
    expect(description.textContent).toBe('Un combattant au hasard');
    expect(figure.classList.contains('empty')).toBe(true);

    press(page, 'Enter');
    expect(onRandom).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("marks player 1's pick « J1 » and shows that fighter in its other colors", () => {
    const { page, tile, figure } = setup({ taken: 'nayo' });
    expect(only(tile(0), 'select-badge').textContent).toBe('J1');
    expect(byClass(tile(1), 'select-badge')).toHaveLength(0);
    expect(figure.style.backgroundImage).toBe('url("nayo-alt.png")');
    press(page, 'ArrowRight');
    expect(figure.style.backgroundImage).toBe('url("riff.png")');
  });

  it('keeps the only look of a fighter that has no other colors', () => {
    const { figure } = setup({ taken: 'riff', initial: 'riff' });
    expect(figure.style.backgroundImage).toBe('url("riff.png")');
  });

  it('goes back with Escape', () => {
    const onBack = vi.fn();
    const { page, feedback } = setup({ onBack });
    press(page, 'Escape');
    expect(onBack).toHaveBeenCalledOnce();
    expect(feedback).toHaveBeenLastCalledWith('back');
  });

  it('stays on Escape without a way back', () => {
    const { page, feedback } = setup();
    press(page, 'Escape');
    expect(feedback).not.toHaveBeenCalled();
  });

  it('follows the gamepad: the stick or the d-pad moves, A picks', () => {
    const pad = { connected: true, axes: [0, 0], buttons: [] as { pressed: boolean }[] };
    const hold = (button: number, pressed: boolean): void => {
      pad.buttons[button] = { pressed };
    };
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    const page = installFakePage();
    // The polls run by hand, one per frame.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame));
    const poll = (): void => {
      frames.shift()?.(0);
    };
    const { onPick, selected } = open(page);

    pad.axes[0] = 0.9;
    poll();
    expect(selected()).toEqual([1]);
    // Held, the stick moves once: it must come back first.
    poll();
    expect(selected()).toEqual([1]);
    pad.axes[0] = 0;
    poll();
    hold(PadButton.DpadLeft, true);
    poll();
    expect(selected()).toEqual([0]);
    hold(PadButton.DpadLeft, false);
    hold(PadButton.South, true);
    poll();
    expect(onPick).toHaveBeenCalledExactlyOnceWith('nayo');
  });
});
